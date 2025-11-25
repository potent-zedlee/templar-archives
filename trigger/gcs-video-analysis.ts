/**
 * GCS 기반 Vertex AI 영상 분석 Task
 *
 * GCS에 저장된 영상을 Vertex AI Gemini로 직접 분석하는 Task입니다.
 * YouTube 다운로드 → FFmpeg 추출 과정 없이 GCS gs:// URI를 직접 사용합니다.
 *
 * 특징:
 * - GCS gs:// URI 직접 전달 (더 빠름, 대용량 최적화)
 * - 30분 초과 세그먼트 자동 분할
 * - 재시도 및 메타데이터 실시간 업데이트
 *
 * @see lib/video/vertex-analyzer.ts
 */

import { task, retry, metadata, AbortTaskRunError } from "@trigger.dev/sdk";
import { z } from "zod";
import { vertexAnalyzer } from "../lib/video/vertex-analyzer";
import type { ExtractedHand } from "../lib/video/vertex-analyzer";

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
  // 최대 실행 시간 2시간
  maxDuration: 7200,
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

    // 세그먼트별 처리
    metadata.set("status", "processing");

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentDuration = segment.end - segment.start;

      console.log(`[GCS-KAN] Processing segment ${i + 1}/${segments.length}`);
      console.log(
        `[GCS-KAN] Time range: ${segment.start}s - ${segment.end}s (${segmentDuration}s)`
      );
      metadata.set("currentSegment", i + 1);

      // 30분 초과 세그먼트 자동 분할
      const MAX_SEGMENT_DURATION = 1800; // 30 minutes
      const subSegments: Array<{ start: number; end: number }> = [];

      if (segmentDuration > MAX_SEGMENT_DURATION) {
        let currentStart = segment.start;
        while (currentStart < segment.end) {
          const currentEnd = Math.min(
            currentStart + MAX_SEGMENT_DURATION,
            segment.end
          );
          subSegments.push({ start: currentStart, end: currentEnd });
          currentStart = currentEnd;
        }
        console.log(
          `[GCS-KAN] Split into ${subSegments.length} sub-segments (30min each)`
        );
      } else {
        subSegments.push(segment);
      }

      // 각 서브 세그먼트 처리 (개별 재시도)
      for (let j = 0; j < subSegments.length; j++) {
        const subSeg = subSegments[j];

        console.log(
          `[GCS-KAN] Processing sub-segment ${j + 1}/${subSegments.length}: ${subSeg.start}s-${subSeg.end}s`
        );
        metadata.set("currentSubSegment", `${subSeg.start}s-${subSeg.end}s`);

        // Vertex AI Gemini로 분석 (재시도 + Self-Healing)
        console.log(`[GCS-KAN] Analyzing with Vertex AI Gemini...`);

        const hands = await retry.onThrow(
          async () => {
            const result = await vertexAnalyzer.analyzeVideoFromGCS(
              gcsUri,
              platform,
              subSeg.start,
              subSeg.end
            );

            // Self-Healing: 빈 결과일 경우 재시도 유도
            if (!result || result.length === 0) {
              console.warn(`[GCS-KAN] Empty result, retrying...`);
              throw new Error(
                "Empty analysis result, retrying with different approach"
              );
            }

            return result;
          },
          { maxAttempts: 3, minTimeoutInMs: 5000, factor: 2 }
        );

        console.log(
          `[GCS-KAN] Extracted ${hands.length} hands from sub-segment`
        );
        allHands.push(...hands);

        // 핸드 수 메타데이터 업데이트
        metadata.set("handsFound", allHands.length);
      }

      // 진행률 업데이트
      const progress = ((i + 1) / segments.length) * 100;
      console.log(`[GCS-KAN] Progress: ${progress.toFixed(1)}%`);
      metadata.set("progress", Math.round(progress)).set("processedSegments", i + 1);
    }

    console.log(
      `[GCS-KAN] Analysis complete! Total hands extracted: ${allHands.length}`
    );

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
