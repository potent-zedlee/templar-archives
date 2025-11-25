/**
 * GCS Segment Extractor
 *
 * GCS에 저장된 영상에서 특정 구간을 FFmpeg로 추출하여
 * 임시 세그먼트로 GCS에 업로드하는 모듈
 *
 * 주요 기능:
 * - GCS 원본 영상 → Signed URL 생성
 * - FFmpeg로 구간 추출 (30분 단위)
 * - 추출된 세그먼트를 GCS 임시 폴더에 업로드
 * - 분석 완료 후 임시 파일 정리
 *
 * 사용 시나리오:
 * 1. Trigger.dev Task에서 30분 단위 세그먼트 추출
 * 2. 각 세그먼트를 Vertex AI에 전달
 * 3. 분석 완료 후 임시 세그먼트 삭제
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { gcsClient } from '../gcs/client';
import { ffmpegProcessor } from './ffmpeg-processor';

export interface SegmentInfo {
  /** 세그먼트 시작 시간 (초) */
  start: number;
  /** 세그먼트 종료 시간 (초) */
  end: number;
}

export interface ExtractedSegment {
  /** GCS URI (gs://bucket/path) */
  gcsUri: string;
  /** GCS 파일 경로 */
  gcsPath: string;
  /** 세그먼트 시작 시간 (초) */
  start: number;
  /** 세그먼트 종료 시간 (초) */
  end: number;
  /** 파일 크기 (bytes) */
  size: number;
}

export interface ExtractSegmentsOptions {
  /** 원본 GCS URI (gs://bucket/path) */
  sourceGcsUri: string;
  /** 추출할 세그먼트 목록 */
  segments: SegmentInfo[];
  /** 스트림 ID (임시 폴더 경로용) */
  streamId: string;
  /** 최대 세그먼트 길이 (초, 기본 1800 = 30분) */
  maxSegmentDuration?: number;
}

export interface ExtractSegmentsResult {
  /** 추출된 세그먼트 목록 */
  extractedSegments: ExtractedSegment[];
  /** 총 추출 시간 (ms) */
  totalDuration: number;
}

/**
 * GCS 세그먼트 추출기 클래스
 */
export class GCSSegmentExtractor {
  private maxSegmentDuration: number;

  constructor(maxSegmentDuration: number = 1800) {
    this.maxSegmentDuration = maxSegmentDuration;
  }

  /**
   * GCS URI에서 버킷 이름과 경로 추출
   */
  private parseGcsUri(gcsUri: string): { bucket: string; path: string } {
    if (!gcsUri.startsWith('gs://')) {
      throw new Error(`Invalid GCS URI: ${gcsUri}`);
    }

    const withoutPrefix = gcsUri.slice(5); // "gs://" 제거
    const firstSlash = withoutPrefix.indexOf('/');

    if (firstSlash === -1) {
      throw new Error(`Invalid GCS URI (no path): ${gcsUri}`);
    }

    return {
      bucket: withoutPrefix.slice(0, firstSlash),
      path: withoutPrefix.slice(firstSlash + 1),
    };
  }

  /**
   * 세그먼트를 30분 단위로 분할
   */
  private splitSegment(segment: SegmentInfo): SegmentInfo[] {
    const duration = segment.end - segment.start;

    if (duration <= this.maxSegmentDuration) {
      return [segment];
    }

    const subSegments: SegmentInfo[] = [];
    let currentStart = segment.start;

    while (currentStart < segment.end) {
      const currentEnd = Math.min(
        currentStart + this.maxSegmentDuration,
        segment.end
      );
      subSegments.push({ start: currentStart, end: currentEnd });
      currentStart = currentEnd;
    }

    console.log(
      `[GCSSegmentExtractor] Split segment ${segment.start}s-${segment.end}s into ${subSegments.length} sub-segments`
    );

    return subSegments;
  }

  /**
   * GCS 영상에서 세그먼트 추출 및 업로드
   *
   * @param options 추출 옵션
   * @returns 추출된 세그먼트 정보
   *
   * @example
   * ```ts
   * const result = await extractor.extractSegments({
   *   sourceGcsUri: 'gs://bucket/videos/original.mp4',
   *   segments: [{ start: 0, end: 3600 }], // 1시간 → 30분 x 2 자동 분할
   *   streamId: 'stream-123',
   * });
   *
   * // 각 세그먼트를 Vertex AI로 분석
   * for (const seg of result.extractedSegments) {
   *   await vertexAnalyzer.analyzeVideoFromGCS(seg.gcsUri, 'ept');
   * }
   *
   * // 분석 완료 후 정리
   * await extractor.cleanupSegments(result.extractedSegments);
   * ```
   */
  async extractSegments(
    options: ExtractSegmentsOptions
  ): Promise<ExtractSegmentsResult> {
    const startTime = Date.now();
    const { sourceGcsUri, segments, streamId, maxSegmentDuration } = options;

    if (maxSegmentDuration) {
      this.maxSegmentDuration = maxSegmentDuration;
    }

    console.log(`[GCSSegmentExtractor] Starting extraction from ${sourceGcsUri}`);
    console.log(`[GCSSegmentExtractor] Segments: ${segments.length}`);

    // 1. 원본 파일 경로 파싱
    const { path: sourcePath } = this.parseGcsUri(sourceGcsUri);

    // 2. Signed URL 생성 (FFmpeg 입력용, 4시간 유효)
    const signedUrl = await gcsClient.getSignedUrl(sourcePath, {
      expiresInMinutes: 240,
      action: 'read',
    });

    console.log(`[GCSSegmentExtractor] Signed URL generated (4h valid)`);

    // 원본 해상도 확인 (다운스케일 필요 여부 판단)
    let targetResolution: { width: number; height: number } | undefined;
    try {
      const videoInfo = await ffmpegProcessor.getVideoInfo(signedUrl);
      console.log(`[GCSSegmentExtractor] Source resolution: ${videoInfo.width}x${videoInfo.height}`);

      // 720p 초과면 720p로 다운스케일 (토큰 절감)
      if (videoInfo.height > 720) {
        targetResolution = { width: 1280, height: 720 };
        console.log(`[GCSSegmentExtractor] Will downscale to 1280x720 for token optimization`);
      } else {
        console.log(`[GCSSegmentExtractor] Resolution <= 720p, keeping original`);
      }
    } catch (probeError) {
      // ffprobe 실패 시 원본 유지 (안전한 폴백)
      console.warn(`[GCSSegmentExtractor] Failed to get video info, keeping original resolution:`, probeError);
    }

    // 3. 모든 세그먼트를 30분 단위로 분할
    const allSubSegments: SegmentInfo[] = [];
    for (const segment of segments) {
      const subSegs = this.splitSegment(segment);
      allSubSegments.push(...subSegs);
    }

    console.log(
      `[GCSSegmentExtractor] Total sub-segments to extract: ${allSubSegments.length}`
    );

    // 4. 각 세그먼트 추출 및 업로드 (파일 기반 - 메모리 효율적)
    const extractedSegments: ExtractedSegment[] = [];

    // 임시 디렉토리 생성
    const tempDir = path.join(os.tmpdir(), `gcs-segments-${streamId}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log(`[GCSSegmentExtractor] Using temp directory: ${tempDir}`);

    for (let i = 0; i < allSubSegments.length; i++) {
      const subSeg = allSubSegments[i];
      const duration = subSeg.end - subSeg.start;

      console.log(
        `[GCSSegmentExtractor] Extracting segment ${i + 1}/${allSubSegments.length}: ${subSeg.start}s-${subSeg.end}s (${duration}s)`
      );

      // 로컬 임시 파일 경로
      const tempFilePath = path.join(tempDir, `segment_${i}_${subSeg.start}s-${subSeg.end}s.mp4`);

      try {
        // FFmpeg로 구간 추출 → 파일로 직접 저장 (메모리 버퍼링 없음)
        // targetResolution이 있으면 다운스케일, 없으면 원본 유지
        const { filePath, size } = await ffmpegProcessor.extractSegmentToFile(signedUrl, {
          startTime: subSeg.start,
          duration: duration,
          videoCodec: 'copy',  // targetResolution이 있으면 extractSegmentToFile에서 재정의됨
          audioCodec: 'copy',
          format: 'mp4',
          targetResolution,    // 1080p+ → 720p 다운스케일
          outputPath: tempFilePath,
        });

        console.log(
          `[GCSSegmentExtractor] Extracted ${(size / 1024 / 1024).toFixed(2)}MB to ${filePath}`
        );

        // GCS 임시 경로에 업로드 (스트림 기반)
        const segmentPath = `temp-segments/${streamId}/segment_${i}_${subSeg.start}s-${subSeg.end}s.mp4`;

        const gcsUri = await gcsClient.uploadFile(
          segmentPath,
          filePath,
          'video/mp4'
        );

        console.log(`[GCSSegmentExtractor] Uploaded to ${gcsUri}`);

        extractedSegments.push({
          gcsUri,
          gcsPath: segmentPath,
          start: subSeg.start,
          end: subSeg.end,
          size,
        });
      } finally {
        // 로컬 임시 파일 삭제 (업로드 성공/실패 관계없이)
        if (fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
            console.log(`[GCSSegmentExtractor] Deleted temp file: ${tempFilePath}`);
          } catch (err) {
            console.warn(`[GCSSegmentExtractor] Failed to delete temp file: ${tempFilePath}`, err);
          }
        }
      }
    }

    // 임시 디렉토리 정리
    try {
      fs.rmdirSync(tempDir);
      console.log(`[GCSSegmentExtractor] Removed temp directory: ${tempDir}`);
    } catch {
      // 디렉토리 삭제 실패는 무시 (OS가 나중에 정리)
    }

    const totalDuration = Date.now() - startTime;

    console.log(
      `[GCSSegmentExtractor] Extraction complete: ${extractedSegments.length} segments in ${(totalDuration / 1000).toFixed(1)}s`
    );

    return {
      extractedSegments,
      totalDuration,
    };
  }

  /**
   * 임시 세그먼트 파일 정리
   *
   * @param segments 삭제할 세그먼트 목록
   */
  async cleanupSegments(segments: ExtractedSegment[]): Promise<void> {
    console.log(
      `[GCSSegmentExtractor] Cleaning up ${segments.length} temporary segments`
    );

    for (const segment of segments) {
      try {
        await gcsClient.deleteFile(segment.gcsPath);
        console.log(`[GCSSegmentExtractor] Deleted ${segment.gcsPath}`);
      } catch (error) {
        console.warn(
          `[GCSSegmentExtractor] Failed to delete ${segment.gcsPath}:`,
          error
        );
        // 삭제 실패는 무시 (후속 정리 작업에서 처리)
      }
    }

    console.log(`[GCSSegmentExtractor] Cleanup complete`);
  }

  /**
   * 스트림 ID로 모든 임시 세그먼트 정리
   *
   * @param streamId 스트림 ID
   */
  async cleanupByStreamId(streamId: string): Promise<void> {
    console.log(
      `[GCSSegmentExtractor] Cleaning up all segments for stream ${streamId}`
    );

    // TODO: GCS 폴더 삭제 구현 (prefix 기반 삭제)
    // 현재는 개별 파일 삭제로 처리
    console.warn(
      `[GCSSegmentExtractor] cleanupByStreamId not fully implemented - use cleanupSegments instead`
    );
  }
}

// 싱글톤 인스턴스
let _gcsSegmentExtractor: GCSSegmentExtractor | null = null;

export const gcsSegmentExtractor = {
  get instance(): GCSSegmentExtractor {
    if (!_gcsSegmentExtractor) {
      _gcsSegmentExtractor = new GCSSegmentExtractor();
    }
    return _gcsSegmentExtractor;
  },

  extractSegments: (
    ...args: Parameters<GCSSegmentExtractor['extractSegments']>
  ) => {
    return gcsSegmentExtractor.instance.extractSegments(...args);
  },

  cleanupSegments: (
    ...args: Parameters<GCSSegmentExtractor['cleanupSegments']>
  ) => {
    return gcsSegmentExtractor.instance.cleanupSegments(...args);
  },

  cleanupByStreamId: (
    ...args: Parameters<GCSSegmentExtractor['cleanupByStreamId']>
  ) => {
    return gcsSegmentExtractor.instance.cleanupByStreamId(...args);
  },
};
