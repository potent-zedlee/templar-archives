/**
 * Video Frame Extraction using FFmpeg
 *
 * Server-side 비디오 프레임 추출 유틸리티
 */

import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { promises as fs } from 'fs'
import path from 'path'
import { tmpdir } from 'os'

// FFmpeg 바이너리 경로 설정
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export interface FrameExtractionOptions {
  /** 프레임 추출 간격 (초) */
  interval: number
  /** 이미지 품질 (1-31, 낮을수록 고품질) */
  quality?: number
  /** 출력 해상도 (예: '640x360') */
  scale?: string
  /** 최대 프레임 수 (선택사항) */
  maxFrames?: number
}

export interface ExtractedFrame {
  /** 프레임 인덱스 (0부터 시작) */
  index: number
  /** 타임스탬프 (초) */
  timestamp: number
  /** Base64 인코딩된 이미지 */
  base64: string
  /** 파일 크기 (bytes) */
  size: number
}

/**
 * 비디오 URL 또는 파일 경로에서 프레임 추출
 */
export async function extractFrames(
  videoSource: string,
  duration: number,
  options: FrameExtractionOptions
): Promise<ExtractedFrame[]> {
  const {
    interval,
    quality = 2,
    scale = '640:360',
    maxFrames,
  } = options

  // 임시 디렉토리 생성
  const tempDir = path.join(tmpdir(), `frames-${Date.now()}`)
  await fs.mkdir(tempDir, { recursive: true })

  console.log('[Frame Extractor] Starting extraction...', {
    videoSource: videoSource.substring(0, 50),
    duration,
    interval,
    tempDir,
  })

  try {
    // 추출할 프레임 수 계산
    const frameCount = maxFrames
      ? Math.min(maxFrames, Math.floor(duration / interval))
      : Math.floor(duration / interval)

    console.log(`[Frame Extractor] Will extract ${frameCount} frames`)

    const frames: ExtractedFrame[] = []

    // FFmpeg로 프레임 추출 (하나씩 순차 처리)
    for (let i = 0; i < frameCount; i++) {
      const timestamp = i * interval
      const outputFile = path.join(tempDir, `frame_${i}.jpg`)

      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoSource)
          .seekInput(timestamp)
          .outputOptions([
            '-vframes 1', // 1개 프레임만
            `-vf scale=${scale}`, // 해상도 조정
            `-q:v ${quality}`, // 품질 설정
          ])
          .output(outputFile)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run()
      })

      // 이미지를 Base64로 인코딩
      const imageBuffer = await fs.readFile(outputFile)
      const base64 = imageBuffer.toString('base64')

      frames.push({
        index: i,
        timestamp,
        base64,
        size: imageBuffer.length,
      })

      // 파일 삭제 (메모리 절약)
      await fs.unlink(outputFile)

      console.log(`[Frame Extractor] Extracted frame ${i + 1}/${frameCount} at ${timestamp}s`)
    }

    // 임시 디렉토리 삭제
    await fs.rmdir(tempDir)

    console.log(`[Frame Extractor] Successfully extracted ${frames.length} frames`)

    return frames
  } catch (error) {
    // 에러 발생 시 임시 디렉토리 정리
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (cleanupError) {
      console.error('[Frame Extractor] Failed to cleanup temp dir:', cleanupError)
    }

    throw error
  }
}

/**
 * 두 프레임 간의 시각적 차이를 간단히 계산
 * (실제 픽셀 비교는 복잡하므로, 파일 크기 차이로 대략 추정)
 */
export function estimateFrameDifference(
  frame1Size: number,
  frame2Size: number
): number {
  const diff = Math.abs(frame1Size - frame2Size)
  const avgSize = (frame1Size + frame2Size) / 2
  return diff / avgSize
}

/**
 * 프레임 배치를 작은 청크로 분할 (메모리 효율성)
 */
export function chunkFrames<T>(frames: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < frames.length; i += chunkSize) {
    chunks.push(frames.slice(i, i + chunkSize))
  }
  return chunks
}
