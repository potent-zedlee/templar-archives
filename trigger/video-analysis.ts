import { task, retry, metadata, AbortTaskRunError } from "@trigger.dev/sdk";
import { z } from "zod";
import { youtubeDownloader } from "../lib/video/youtube-downloader";
import { ffmpegProcessor } from "../lib/video/ffmpeg-processor";
import { geminiAnalyzer } from "../lib/video/gemini-analyzer";
import type { ExtractedHand } from "../lib/video/gemini-analyzer";

// 입력 스키마 정의
const VideoAnalysisInput = z.object({
  youtubeUrl: z.string().url(),
  segments: z.array(z.object({
    start: z.number(),
    end: z.number()
  })),
  platform: z.enum(['ept', 'triton', 'wsop']),
  streamId: z.string().uuid()
});

// 에러 타입 분류
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;

  const message = error.message.toLowerCase();

  // 재시도 불가능한 에러들
  const nonRetryablePatterns = [
    'invalid youtube url',
    'video not found',
    'private video',
    'video unavailable',
    'age restricted',
    'invalid_argument',  // Gemini 잘못된 입력
  ];

  return !nonRetryablePatterns.some(pattern => message.includes(pattern));
}

export const videoAnalysisTask = task({
  id: "kan-video-analysis",
  // 강화된 재시도 설정
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60000,
    randomize: true,
  },
  // 최대 실행 시간 1시간
  maxDuration: 3600,
  // 에러 핸들링
  catchError: async ({ error, ctx }) => {
    // 재시도 불가능한 에러면 즉시 중단
    if (!isRetryableError(error)) {
      console.error(`[KAN] ❌ Non-retryable error, aborting:`, error);
      throw new AbortTaskRunError(`분석 불가: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 재시도 가능한 에러는 기본 동작 (자동 재시도)
    console.warn(`[KAN] ⚠️ Retryable error, will retry:`, error);
    return undefined;
  },
  run: async (payload: z.infer<typeof VideoAnalysisInput>, { ctx }) => {
    const { youtubeUrl, segments, platform, streamId } = payload;

    console.log(`[KAN] 🎬 Starting analysis for ${youtubeUrl}`);
    console.log(`[KAN] 📍 Platform: ${platform}, Segments: ${segments.length}`);

    // 메타데이터 초기화 (실시간 진행률 추적)
    metadata
      .set("status", "initializing")
      .set("progress", 0)
      .set("totalSegments", segments.length)
      .set("processedSegments", 0)
      .set("handsFound", 0)
      .set("streamId", streamId);

    // YouTube URL 검증 (재시도 포함)
    const isValid = await retry.onThrow(
      async () => youtubeDownloader.validateUrl(youtubeUrl),
      { maxAttempts: 3, minTimeoutInMs: 1000, factor: 2 }
    );
    if (!isValid) {
      throw new AbortTaskRunError(`Invalid YouTube URL: ${youtubeUrl}`);
    }

    // 영상 정보 가져오기 (재시도 포함)
    metadata.set("status", "fetching_video_info");
    const videoInfo = await retry.onThrow(
      async () => youtubeDownloader.getVideoInfo(youtubeUrl),
      { maxAttempts: 3, minTimeoutInMs: 2000, factor: 2 }
    );
    console.log(`[KAN] 📹 Video: "${videoInfo.title}" (${videoInfo.duration}s)`);
    metadata.set("videoTitle", videoInfo.title);

    const allHands: ExtractedHand[] = [];

    // 세그먼트별 처리
    metadata.set("status", "processing");

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentDuration = segment.end - segment.start;

      console.log(`[KAN] 🎯 Processing segment ${i + 1}/${segments.length}`);
      console.log(`[KAN] ⏱️  Time range: ${segment.start}s - ${segment.end}s (${segmentDuration}s)`);
      metadata.set("currentSegment", i + 1);

      // 30분 초과 세그먼트 자동 분할
      const MAX_SEGMENT_DURATION = 1800; // 30 minutes
      const subSegments: Array<{ start: number; end: number }> = [];

      if (segmentDuration > MAX_SEGMENT_DURATION) {
        let currentStart = segment.start;
        while (currentStart < segment.end) {
          const currentEnd = Math.min(currentStart + MAX_SEGMENT_DURATION, segment.end);
          subSegments.push({ start: currentStart, end: currentEnd });
          currentStart = currentEnd;
        }
        console.log(`[KAN] ✂️  Split into ${subSegments.length} sub-segments (30min each)`);
      } else {
        subSegments.push(segment);
      }

      // 각 서브 세그먼트 처리 (개별 재시도)
      for (let j = 0; j < subSegments.length; j++) {
        const subSeg = subSegments[j];

        console.log(`[KAN] 📥 Processing sub-segment ${j + 1}/${subSegments.length}: ${subSeg.start}s-${subSeg.end}s`);
        metadata.set("currentSubSegment", `${subSeg.start}s-${subSeg.end}s`);

        // 1. YouTube에서 스트림 URL 가져오기 (재시도)
        const streamUrl = await retry.onThrow(
          async () => youtubeDownloader.getStreamUrl(youtubeUrl, '720p'),
          { maxAttempts: 5, minTimeoutInMs: 2000, factor: 2, maxTimeoutInMs: 30000 }
        );

        // 2. FFmpeg로 특정 구간 추출 (재시도)
        console.log(`[KAN] ✂️  Extracting with FFmpeg...`);
        const videoBuffer = await retry.onThrow(
          async () => ffmpegProcessor.extractSegment(streamUrl, {
            startTime: subSeg.start,
            duration: subSeg.end - subSeg.start
          }),
          { maxAttempts: 3, minTimeoutInMs: 3000, factor: 2 }
        );

        // 3. Gemini로 분석 (재시도 + Self-Healing)
        console.log(`[KAN] 🤖 Analyzing with Gemini 2.5 Flash...`);
        const hands = await retry.onThrow(
          async () => {
            const result = await geminiAnalyzer.analyzeVideo(videoBuffer, platform);

            // Self-Healing: 빈 결과일 경우 재시도 유도
            if (!result || result.length === 0) {
              console.warn(`[KAN] ⚠️ Empty result, retrying...`);
              throw new Error('Empty analysis result, retrying with different approach');
            }

            return result;
          },
          { maxAttempts: 3, minTimeoutInMs: 5000, factor: 2 }
        );

        console.log(`[KAN] ✅ Extracted ${hands.length} hands from sub-segment`);
        allHands.push(...hands);

        // 핸드 수 메타데이터 업데이트
        metadata.set("handsFound", allHands.length);
      }

      // 진행률 업데이트
      const progress = ((i + 1) / segments.length) * 100;
      console.log(`[KAN] 📊 Progress: ${progress.toFixed(1)}%`);
      metadata
        .set("progress", Math.round(progress))
        .set("processedSegments", i + 1);
    }

    console.log(`[KAN] 🎉 Analysis complete! Total hands extracted: ${allHands.length}`);

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
      handCount: allHands.length,
      hands: allHands,
      platform,
      videoTitle: videoInfo.title,
      processedSegments: segments.length,
    };
  },
});
