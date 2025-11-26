/**
 * FFmpeg Processor
 *
 * 기존 lib/video/ffmpeg-processor.ts 포팅
 * Cloud Run 환경에 최적화
 */

import ffmpeg from 'fluent-ffmpeg'
import * as fs from 'fs'
import * as path from 'path'

export interface ExtractSegmentOptions {
  startTime: number
  duration: number
  videoCodec?: string
  audioCodec?: string
  format?: string
  targetResolution?: { width: number; height: number }
  outputPath: string
}

export interface ExtractResult {
  filePath: string
  size: number
}

export class FFmpegProcessor {
  constructor() {
    // FFmpeg 경로 설정 (Cloud Run에서는 apt-get으로 설치됨)
    const ffmpegPath = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg'
    const ffprobePath = process.env.FFPROBE_PATH || '/usr/bin/ffprobe'

    if (fs.existsSync(ffmpegPath)) {
      ffmpeg.setFfmpegPath(ffmpegPath)
    }
    if (fs.existsSync(ffprobePath)) {
      ffmpeg.setFfprobePath(ffprobePath)
    }

    console.log('[FFmpegProcessor] 초기화 완료')
  }

  /**
   * 영상에서 특정 구간을 추출하여 파일로 저장
   */
  async extractSegmentToFile(
    inputUrl: string,
    options: ExtractSegmentOptions
  ): Promise<ExtractResult> {
    const {
      startTime,
      duration,
      videoCodec = 'copy',
      audioCodec = 'copy',
      format = 'mp4',
      targetResolution,
      outputPath,
    } = options

    console.log(
      `[FFmpegProcessor] Extracting ${duration}s from ${startTime}s to ${outputPath}`
    )

    // 출력 디렉토리 생성
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputUrl)
        .setStartTime(startTime)
        .setDuration(duration)

      // 다운스케일이 필요하면 재인코딩
      if (targetResolution) {
        command = command
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(`${targetResolution.width}x${targetResolution.height}`)
          .videoBitrate('2000k')
          .audioBitrate('128k')
      } else {
        command = command.videoCodec(videoCodec).audioCodec(audioCodec)
      }

      command
        .format(format)
        .outputOptions(['-movflags', '+faststart'])
        .on('start', (cmd: string) => {
          console.log(`[FFmpegProcessor] Command: ${cmd.slice(0, 200)}...`)
        })
        .on('progress', (progress: { percent?: number }) => {
          if (progress.percent) {
            console.log(`[FFmpegProcessor] Progress: ${progress.percent.toFixed(1)}%`)
          }
        })
        .on('error', (err: Error) => {
          console.error('[FFmpegProcessor] Error:', err.message)
          reject(err)
        })
        .on('end', () => {
          const stats = fs.statSync(outputPath)
          console.log(
            `[FFmpegProcessor] Complete: ${(stats.size / 1024 / 1024).toFixed(2)}MB`
          )
          resolve({
            filePath: outputPath,
            size: stats.size,
          })
        })
        .save(outputPath)
    })
  }
}

// 싱글톤
let _ffmpegProcessor: FFmpegProcessor | null = null

export const ffmpegProcessor = {
  get instance(): FFmpegProcessor {
    if (!_ffmpegProcessor) {
      _ffmpegProcessor = new FFmpegProcessor()
    }
    return _ffmpegProcessor
  },

  extractSegmentToFile: (
    ...args: Parameters<FFmpegProcessor['extractSegmentToFile']>
  ) => {
    return ffmpegProcessor.instance.extractSegmentToFile(...args)
  },
}
