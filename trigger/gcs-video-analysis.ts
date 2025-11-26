/**
 * GCS 기반 Vertex AI 영상 분석 Task
 *
 * GCS에 저장된 영상을 Vertex AI Gemini로 직접 분석하는 Task입니다.
 *
 * 특징:
 * - FFmpeg로 30분 단위 세그먼트 실제 추출
 * - 세그먼트별 GCS 업로드 후 Vertex AI 분석
 * - 재시도 및 메타데이터 실시간 업데이트
 * - 분석 완료 후 임시 세그먼트 자동 정리
 *
 * @see lib/video/gcs-segment-extractor.ts
 * @see lib/video/vertex-analyzer.ts
 */

import { task, retry, metadata, AbortTaskRunError } from "@trigger.dev/sdk";
import { z } from "zod";
import { vertexAnalyzer } from "../lib/video/vertex-analyzer";
import { gcsSegmentExtractor } from "../lib/video/gcs-segment-extractor";
import type { ExtractedHand } from "../lib/video/vertex-analyzer";
import type { ExtractedSegment } from "../lib/video/gcs-segment-extractor";

// 입력 스키마 정의
const GCSVideoAnalysisInput = z.object({
  streamId: z.string().uuid(),
  gcsUri: z.string().startsWith("gs://"),
  segments: z.array(
    z.object({
      start: z.number().min(0),
      end: z.number().min(0),
    })
  ),
  platform: z.enum(["ept", "triton", "wsop"]),
  players: z.array(z.string()).optional(),
});

export type GCSVideoAnalysisPayload = z.infer<typeof GCSVideoAnalysisInput>;

// 에러 타입 분류
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;

  const message = error.message.toLowerCase();

  // 재시도 불가능한 에러들
  const nonRetryablePatterns = [
    "invalid gcs uri",
    "잘못된 gcs uri",
    "not found",
    "permission denied",
    "access denied",
    "invalid_argument",
    "bucket not found",
    "object not found",
  ];

  return !nonRetryablePatterns.some((pattern) => message.includes(pattern));
}

export const gcsVideoAnalysisTask = task({
  id: "gcs-video-analysis",
  // 머신 프리셋: 4 vCPU, 8GB RAM (Vertex AI 응답 대기 + 병렬 처리)
  machine: { preset: "large-1x" },
  // 최대 실행 시간 4시간 (6시간+ 영상 분석 대응)
  maxDuration: 14400,
  // 재시도 설정
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 60000,
    randomize: true,
  },
  // 에러 핸들링
  catchError: async ({ error }) => {
    // 재시도 불가능한 에러면 즉시 중단
    if (!isRetryableError(error)) {
      console.error(`[GCS-KAN] Non-retryable error, aborting:`, error);
      throw new AbortTaskRunError(
        `분석 불가: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // 재시도 가능한 에러는 기본 동작 (자동 재시도)
    console.warn(`[GCS-KAN] Retryable error, will retry:`, error);
    return undefined;
  },
  run: async (payload: GCSVideoAnalysisPayload) => {
    // Zod 검증
    const validatedPayload = GCSVideoAnalysisInput.parse(payload);
    const { streamId, gcsUri, segments, platform, players } = validatedPayload;

    console.log(`[GCS-KAN] Starting analysis for ${gcsUri}`);
    console.log(`[GCS-KAN] Platform: ${platform}, Segments: ${segments.length}`);
    if (players && players.length > 0) {
      console.log(`[GCS-KAN] Players hint: ${players.join(", ")}`);
    }

    // 메타데이터 초기화 (실시간 진행률 추적)
    metadata
      .set("status", "initializing")
      .set("progress", 0)
      .set("streamId", streamId)
      .set("totalSegments", segments.length)
      .set("processedSegments", 0)
      .set("handsFound", 0)
      .set("gcsUri", gcsUri);

    // GCS URI 검증
    if (!gcsUri.startsWith("gs://")) {
      throw new AbortTaskRunError(`Invalid GCS URI: ${gcsUri}`);
    }

    const allHands: ExtractedHand[] = [];
    let extractedSegments: ExtractedSegment[] = [];

    try {
      // ============================================
      // Phase 1: FFmpeg로 세그먼트 실제 추출
      // ============================================
      metadata.set("status", "extracting");
      console.log(`[GCS-KAN] Phase 1: Extracting segments with FFmpeg...`);

      const extractionResult = await gcsSegmentExtractor.extractSegments({
        sourceGcsUri: gcsUri,
        segments: segments,
        streamId: streamId,
        maxSegmentDuration: 1800, // 30분 (global 리전: 1M 토큰)
      });

      extractedSegments = extractionResult.extractedSegments;

      console.log(
        `[GCS-KAN] Extraction complete: ${extractedSegments.length} segments extracted in ${(extractionResult.totalDuration / 1000).toFixed(1)}s`
      );

      metadata
        .set("extractedSegments", extractedSegments.length)
        .set("extractionTime", extractionResult.totalDuration);

      // ============================================
      // Phase 2: 각 세그먼트를 Vertex AI로 분석
      // ============================================
      metadata.set("status", "analyzing");
      console.log(`[GCS-KAN] Phase 2: Analyzing ${extractedSegments.length} segments with Vertex AI...`);

      for (let i = 0; i < extractedSegments.length; i++) {
        const segment = extractedSegments[i];

        console.log(
          `[GCS-KAN] Analyzing segment ${i + 1}/${extractedSegments.length}: ${segment.start}s-${segment.end}s`
        );
        metadata
          .set("currentSegment", i + 1)
          .set("currentSegmentRange", `${segment.start}s-${segment.end}s`);

        // Vertex AI Gemini로 분석 (세그먼트 URI 사용, 전체 영상 분석)
        const hands = await retry.onThrow(
          async () => {
            // 분할된 세그먼트 URI를 전달 (startTime/endTime 불필요)
            const result = await vertexAnalyzer.analyzeVideoFromGCS(
              segment.gcsUri,
              platform
            );

            // Self-Healing: 빈 결과일 경우 재시도 유도
            if (!result || result.length === 0) {
              console.warn(`[GCS-KAN] Empty result for segment ${i + 1}, retrying...`);
              throw new Error(
                "Empty analysis result, retrying with different approach"
              );
            }

            return result;
          },
          { maxAttempts: 3, minTimeoutInMs: 5000, factor: 2 }
        );

        console.log(
          `[GCS-KAN] Extracted ${hands.length} hands from segment ${i + 1}`
        );
        allHands.push(...hands);

        // 진행률 업데이트
        const progress = ((i + 1) / extractedSegments.length) * 100;
        console.log(`[GCS-KAN] Analysis progress: ${progress.toFixed(1)}%`);
        metadata
          .set("progress", Math.round(progress))
          .set("processedSegments", i + 1)
          .set("handsFound", allHands.length);
      }

      console.log(
        `[GCS-KAN] Analysis complete! Total hands extracted: ${allHands.length}`
      );

    } finally {
      // ============================================
      // Phase 3: 임시 세그먼트 파일 정리
      // ============================================
      if (extractedSegments.length > 0) {
        metadata.set("status", "cleaning");
        console.log(`[GCS-KAN] Phase 3: Cleaning up ${extractedSegments.length} temporary segments...`);

        try {
          await gcsSegmentExtractor.cleanupSegments(extractedSegments);
          console.log(`[GCS-KAN] Cleanup complete`);
        } catch (cleanupError) {
          console.warn(`[GCS-KAN] Cleanup warning:`, cleanupError);
          // 정리 실패는 무시 (분석 결과에 영향 없음)
        }
      }
    }

    // 완료 메타데이터 설정
    metadata
      .set("status", "completed")
      .set("progress", 100)
      .set("handsFound", allHands.length)
      .set("completedAt", new Date().toISOString());

    // 결과 반환 (Server Action에서 DB 저장 처리)
    return {
      success: true,
      streamId,
      hands: allHands,
      handCount: allHands.length,
    };
  },
});
