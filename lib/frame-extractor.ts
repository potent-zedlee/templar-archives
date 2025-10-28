/**
 * Frame Extraction Utility
 *
 * FFmpeg를 사용하여 비디오에서 프레임을 추출
 */

import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import path from 'path'
import fs from 'fs/promises'
import type { Frame } from '@/lib/types/ocr'

// FFmpeg 경로 설정
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export interface FrameExtractionOptions {
  /** 시작 시간 (초) */
  startTime: number
  /** 종료 시간 (초, optional) */
  endTime?: number
  /** 프레임 추출 간격 (초, 기본값: 2) */
  interval?: number
  /** 출력 해상도 너비 (기본값: 1280) */
  width?: number
  /** 출력 해상도 높이 (기본값: 720) */
  height?: number
}

/**
 * 시간 문자열 (HH:MM:SS)을 초로 변환
 */
export function timeStringToSeconds(timeString: string): number {
  const parts = timeString.split(':').map((p) => parseInt(p))

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  } else if (parts.length === 1) {
    return parts[0]
  }

  throw new Error(`Invalid time string: ${timeString}`)
}

/**
 * 초를 시간 문자열 (HH:MM:SS)로 변환
 */
export function secondsToTimeString(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * 비디오에서 프레임 추출
 */
export async function extractFrames(
  videoUrl: string,
  options: FrameExtractionOptions
): Promise<Frame[]> {
  const {
    startTime,
    endTime,
    interval = 2,
    width = 1280,
    height = 720,
  } = options

  // 임시 디렉토리 생성
  const tempDir = path.join('/tmp', `frames_${Date.now()}`)
  await fs.mkdir(tempDir, { recursive: true })

  try {
    // FFmpeg 명령어 구성
    const duration = endTime ? endTime - startTime : undefined
    const fps = 1 / interval // 2초 간격 = 0.5 fps

    await new Promise<void>((resolve, reject) => {
      let command = ffmpeg(videoUrl)
        .seekInput(startTime) // 시작 시간
        .outputOptions([
          `-vf`, `fps=${fps}`, // FPS 설정
          `-s`, `${width}x${height}`, // 해상도
          `-q:v`, `2`, // 품질 (1-31, 낮을수록 좋음)
        ])
        .format('image2') // 이미지 시퀀스 포맷
        .output(path.join(tempDir, 'frame_%04d.jpg'))

      // 종료 시간이 있으면 duration 설정
      if (duration) {
        command = command.duration(duration)
      }

      command
        .on('end', () => {
          resolve()
        })
        .on('error', (err) => {
          reject(new Error(`FFmpeg error: ${err.message}`))
        })
        .run()
    })

    // 추출된 프레임 파일 읽기
    const files = await fs.readdir(tempDir)
    const frameFiles = files
      .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
      .sort()

    // Frame 객체 생성
    const frames: Frame[] = await Promise.all(
      frameFiles.map(async (file, index) => {
        const filePath = path.join(tempDir, file)
        const buffer = await fs.readFile(filePath)

        const frameNumber = index + 1
        const timestampSeconds = startTime + index * interval
        const timestamp = secondsToTimeString(timestampSeconds)

        return {
          number: frameNumber,
          timestamp,
          timestampSeconds,
          buffer,
          width,
          height,
        }
      })
    )

    return frames
  } finally {
    // 임시 파일 정리
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      console.error('Failed to clean up temp directory:', error)
    }
  }
}

/**
 * 단일 프레임 추출 (특정 타임스탬프)
 */
export async function extractSingleFrame(
  videoUrl: string,
  timestampSeconds: number,
  width: number = 1280,
  height: number = 720
): Promise<Frame> {
  const frames = await extractFrames(videoUrl, {
    startTime: timestampSeconds,
    endTime: timestampSeconds + 1, // 1초만
    interval: 1,
    width,
    height,
  })

  if (frames.length === 0) {
    throw new Error('No frame extracted')
  }

  return frames[0]
}

/**
 * 비디오 메타데이터 가져오기
 */
export async function getVideoMetadata(
  videoUrl: string
): Promise<{
  duration: number
  width: number
  height: number
  fps: number
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoUrl, (err, metadata) => {
      if (err) {
        return reject(new Error(`FFprobe error: ${err.message}`))
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
      if (!videoStream) {
        return reject(new Error('No video stream found'))
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: eval(videoStream.r_frame_rate || '0'), // "30/1" 형식을 숫자로 변환
      })
    })
  })
}
