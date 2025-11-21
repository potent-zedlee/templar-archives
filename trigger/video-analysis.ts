import { task } from "@trigger.dev/sdk/v3";
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

export const videoAnalysisTask = task({
  id: "kan-video-analysis",
  run: async (payload: z.infer<typeof VideoAnalysisInput>, { ctx }) => {
    const { youtubeUrl, segments, platform, streamId } = payload;

    console.log(`[KAN] 🎬 Starting analysis for ${youtubeUrl}`);
    console.log(`[KAN] 📍 Platform: ${platform}, Segments: ${segments.length}`);

    // YouTube URL 검증
    const isValid = await youtubeDownloader.validateUrl(youtubeUrl);
    if (!isValid) {
      throw new Error(`Invalid YouTube URL: ${youtubeUrl}`);
    }

    // 영상 정보 가져오기
    const videoInfo = await youtubeDownloader.getVideoInfo(youtubeUrl);
    console.log(`[KAN] 📹 Video: "${videoInfo.title}" (${videoInfo.duration}s)`);

    const allHands: ExtractedHand[] = [];

    // 세그먼트별 처리
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentDuration = segment.end - segment.start;

      console.log(`[KAN] 🎯 Processing segment ${i + 1}/${segments.length}`);
      console.log(`[KAN] ⏱️  Time range: ${segment.start}s - ${segment.end}s (${segmentDuration}s)`);

      // 30분 초과 세그먼트 자동 분할
      const MAX_SEGMENT_DURATION = 1800; // 30 minutes
      const subSegments = [];

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

      // 각 서브 세그먼트 처리
      for (const subSeg of subSegments) {
        try {
          console.log(`[KAN] 📥 Downloading segment ${subSeg.start}s-${subSeg.end}s...`);

          // 1. YouTube에서 스트림 URL 가져오기
          const streamUrl = await youtubeDownloader.getStreamUrl(youtubeUrl, '720p');

          // 2. FFmpeg로 특정 구간 추출
          console.log(`[KAN] ✂️  Extracting with FFmpeg...`);
          const videoBuffer = await ffmpegProcessor.extractSegment(streamUrl, {
            startTime: subSeg.start,
            duration: subSeg.end - subSeg.start
          });

          // 3. Gemini로 분석
          console.log(`[KAN] 🤖 Analyzing with Gemini 2.5 Flash...`);
          const hands = await geminiAnalyzer.analyzeVideo(videoBuffer, platform);

          console.log(`[KAN] ✅ Extracted ${hands.length} hands from sub-segment`);
          allHands.push(...hands);

        } catch (error) {
          console.error(`[KAN] ❌ Error processing sub-segment:`, error);

          // 에러 로그 상세화
          if (error instanceof Error) {
            console.error(`[KAN] Error message: ${error.message}`);
            console.error(`[KAN] Error stack:`, error.stack);
          }

          // 중요한 에러는 전체 작업 실패
          throw error;
        }
      }

      // 진행률 업데이트
      const progress = ((i + 1) / segments.length) * 100;
      console.log(`[KAN] 📊 Progress: ${progress.toFixed(1)}%`);
    }

    console.log(`[KAN] 🎉 Analysis complete! Total hands extracted: ${allHands.length}`);

    // TODO: Supabase에 결과 저장 (Step 7에서 Server Action을 통해 처리)
    return {
      success: true,
      streamId,
      handCount: allHands.length,
      hands: allHands,
      platform,
      videoTitle: videoInfo.title
    };
  },
});
