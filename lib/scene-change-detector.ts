/**
 * Scene Change Detection for Hand Boundary Detection
 *
 * Real Implementation: FFmpeg + Claude Vision API
 */

import { extractFrames, type ExtractedFrame } from './video-frame-extractor'
import {
  analyzeFrameForHandBoundary,
  filterHandBoundaries,
  extractHandNumber,
  type HandBoundaryAnalysis,
} from './claude-vision-analyzer'

export interface SceneChange {
  timestamp: number // seconds
  confidence: number // 0-1
  frameIndex: number
  handNumber?: string
}

export interface DetectionConfig {
  /** 프레임 추출 간격 (초) */
  sampleInterval: number
  /** Claude Vision 신뢰도 임계값 (0-1) */
  threshold: number
  /** 최소 핸드 길이 (초) */
  minHandDuration: number
  /** 최대 핸드 길이 (초) */
  maxHandDuration: number
  /** 최대 프레임 수 (비용 제한) */
  maxFrames?: number
  /** Claude Vision 병렬 처리 수 */
  concurrency?: number
}

const DEFAULT_CONFIG: DetectionConfig = {
  sampleInterval: 10, // 10초마다 프레임 추출
  threshold: 0.7, // 70% 이상 신뢰도
  minHandDuration: 30, // 최소 30초
  maxHandDuration: 600, // 최대 10분
  maxFrames: 50, // 최대 50개 프레임 (비용 제한)
  concurrency: 3, // 3개씩 병렬 처리
}

/**
 * 자동 핸드 경계 감지 (메인 함수)
 *
 * Real Implementation: FFmpeg + Claude Vision API
 */
export async function detectHandBoundaries(
  videoUrl: string,
  duration: number,
  config: Partial<DetectionConfig> = {}
): Promise<SceneChange[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  console.log('[Scene Detector] Starting real video analysis...', {
    videoUrl: videoUrl.substring(0, 50),
    duration,
    config: finalConfig,
  })

  try {
    // 1. FFmpeg로 프레임 추출
    console.log('[Scene Detector] Step 1: Extracting frames...')
    const frames = await extractFrames(videoUrl, duration, {
      interval: finalConfig.sampleInterval,
      quality: 2,
      scale: '640:360',
      maxFrames: finalConfig.maxFrames,
    })

    console.log(`[Scene Detector] Extracted ${frames.length} frames`)

    if (frames.length === 0) {
      console.warn('[Scene Detector] No frames extracted')
      return []
    }

    // 2. Claude Vision으로 프레임 분석
    console.log('[Scene Detector] Step 2: Analyzing frames with Claude Vision...')
    const analyses: HandBoundaryAnalysis[] = []

    // Concurrency 제한으로 순차 배치 처리
    const { concurrency = 3 } = finalConfig
    for (let i = 0; i < frames.length; i += concurrency) {
      const batch = frames.slice(i, Math.min(i + concurrency, frames.length))
      console.log(
        `[Scene Detector] Analyzing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(frames.length / concurrency)}`
      )

      const batchResults = await Promise.all(
        batch.map((frame, idx) =>
          analyzeFrameForHandBoundary(
            frame.base64,
            analyses.length > 0 ? analyses[analyses.length - 1] : undefined
          )
        )
      )

      analyses.push(...batchResults)
    }

    console.log(`[Scene Detector] Completed analysis of ${analyses.length} frames`)

    // 3. 핸드 경계 필터링
    console.log('[Scene Detector] Step 3: Filtering hand boundaries...')
    const timestamps = frames.map((f) => f.timestamp)
    const rawBoundaries = filterHandBoundaries(
      analyses,
      timestamps,
      finalConfig.threshold
    )

    console.log(`[Scene Detector] Found ${rawBoundaries.length} potential boundaries`)

    // 4. 핸드 번호 추출 (선택적)
    console.log('[Scene Detector] Step 4: Extracting hand numbers...')
    const boundariesWithNumbers = await Promise.all(
      rawBoundaries.map(async (boundary, idx) => {
        const frameIndex = timestamps.indexOf(boundary.timestamp)
        if (frameIndex === -1) return boundary

        // 핸드 번호가 이미 감지된 경우 스킵
        if (boundary.handNumber) return boundary

        // Claude Vision으로 핸드 번호 추출 시도
        try {
          const frame = frames[frameIndex]
          const handNumber = await extractHandNumber(frame.base64)
          return {
            ...boundary,
            handNumber: handNumber || undefined,
          }
        } catch (error) {
          console.error(`[Scene Detector] Hand number extraction failed for boundary ${idx}:`, error)
          return boundary
        }
      })
    )

    // 5. 최소/최대 핸드 길이 필터링
    console.log('[Scene Detector] Step 5: Applying duration filters...')
    const filteredBoundaries: SceneChange[] = []

    for (let i = 0; i < boundariesWithNumbers.length - 1; i++) {
      const current = boundariesWithNumbers[i]
      const next = boundariesWithNumbers[i + 1]
      const duration = next.timestamp - current.timestamp

      if (
        duration >= finalConfig.minHandDuration &&
        duration <= finalConfig.maxHandDuration
      ) {
        const frameIndex = timestamps.indexOf(current.timestamp)
        filteredBoundaries.push({
          timestamp: current.timestamp,
          confidence: current.confidence,
          frameIndex,
          handNumber: current.handNumber,
        })
      }
    }

    // 마지막 경계도 추가 (종료 타임스탬프 생성용)
    if (boundariesWithNumbers.length > 0) {
      const last = boundariesWithNumbers[boundariesWithNumbers.length - 1]
      const frameIndex = timestamps.indexOf(last.timestamp)
      filteredBoundaries.push({
        timestamp: last.timestamp,
        confidence: last.confidence,
        frameIndex,
        handNumber: last.handNumber,
      })
    }

    console.log(`[Scene Detector] Final result: ${filteredBoundaries.length} hand boundaries`)

    return filteredBoundaries
  } catch (error) {
    console.error('[Scene Detector] Detection failed:', error)
    throw error
  }
}

/**
 * 타임코드 포맷으로 변환 (HH:MM:SS)
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 감지된 경계를 타임코드 제출 형식으로 변환
 */
export interface HandTimecode {
  handNumber: number
  startTime: string
  endTime: string
  confidence: number
}

export function boundariesToTimecodes(
  boundaries: SceneChange[]
): HandTimecode[] {
  const timecodes: HandTimecode[] = []

  for (let i = 0; i < boundaries.length - 1; i++) {
    const current = boundaries[i]
    const next = boundaries[i + 1]

    // 핸드 번호 결정 (감지된 것 우선, 없으면 순차 번호)
    let handNumber = i + 1
    if (current.handNumber) {
      const parsed = parseInt(current.handNumber, 10)
      if (!isNaN(parsed)) {
        handNumber = parsed
      }
    }

    timecodes.push({
      handNumber,
      startTime: formatTimestamp(current.timestamp),
      endTime: formatTimestamp(next.timestamp),
      confidence: current.confidence,
    })
  }

  return timecodes
}
