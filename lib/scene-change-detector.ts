/**
 * Scene Change Detection for Hand Boundary Detection
 *
 * MVP: 균일한 간격으로 핸드 경계를 생성하는 플레이스홀더 구현
 * TODO: 실제 영상 분석 (FFmpeg, Claude Vision, OCR) 구현 필요
 *
 * 실제 구현 시 고려사항:
 * 1. Server-side FFmpeg (fluent-ffmpeg) 사용
 * 2. Claude Vision API로 프레임 분석
 * 3. Tesseract.js로 핸드 번호 OCR
 * 4. Supabase Edge Functions 또는 별도 워커 서비스
 */

export interface SceneChange {
  timestamp: number // seconds
  confidence: number // 0-1
  frameIndex: number
}

export interface DetectionConfig {
  /** 프레임 추출 간격 (초) */
  sampleInterval: number
  /** 장면 전환 감지 임계값 (0-1, 높을수록 큰 변화만 감지) */
  threshold: number
  /** 최소 핸드 길이 (초) */
  minHandDuration: number
  /** 최대 핸드 길이 (초) */
  maxHandDuration: number
}

const DEFAULT_CONFIG: DetectionConfig = {
  sampleInterval: 120, // 2분마다 핸드 생성 (MVP 플레이스홀더)
  threshold: 0.35, // 사용하지 않음 (MVP)
  minHandDuration: 90, // 최소 1.5분
  maxHandDuration: 180, // 최대 3분
}

/**
 * MVP: 균일한 간격으로 핸드 경계 생성 (플레이스홀더)
 *
 * 실제 구현 시 다음 방식 사용:
 * 1. FFmpeg로 프레임 추출 (fluent-ffmpeg)
 * 2. 프레임 간 픽셀 차이 계산
 * 3. Claude Vision API로 핸드 경계 검증
 * 4. OCR로 핸드 번호 확인
 */
function generatePlaceholderBoundaries(
  duration: number,
  config: DetectionConfig
): SceneChange[] {
  const boundaries: SceneChange[] = []
  const avgHandDuration = (config.minHandDuration + config.maxHandDuration) / 2

  // 시작 시간 (30초부터)
  let currentTime = 30

  let handIndex = 0
  while (currentTime < duration - avgHandDuration) {
    // 약간의 랜덤성 추가 (±20초)
    const randomOffset = Math.floor(Math.random() * 40) - 20
    const nextDuration = avgHandDuration + randomOffset

    boundaries.push({
      timestamp: currentTime,
      confidence: 0.75 + Math.random() * 0.2, // 0.75-0.95 신뢰도
      frameIndex: handIndex,
    })

    currentTime += nextDuration
    handIndex++
  }

  return boundaries
}

/**
 * 자동 핸드 경계 감지 (메인 함수)
 *
 * MVP: 플레이스홀더 구현 (균일한 간격으로 핸드 생성)
 * 실제 영상 분석은 Phase 1.5에서 구현 예정
 */
export async function detectHandBoundaries(
  videoUrl: string,
  duration: number,
  config: Partial<DetectionConfig> = {}
): Promise<SceneChange[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  console.log('[Scene Detector] Starting detection (MVP placeholder)...', {
    videoUrl,
    duration,
    config: finalConfig,
  })

  // Simulate processing delay (1-2 seconds)
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000))

  // Generate placeholder boundaries
  const boundaries = generatePlaceholderBoundaries(duration, finalConfig)

  console.log(`[Scene Detector] Generated ${boundaries.length} placeholder boundaries`)

  return boundaries
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

    timecodes.push({
      handNumber: i + 1,
      startTime: formatTimestamp(current.timestamp),
      endTime: formatTimestamp(next.timestamp),
      confidence: current.confidence,
    })
  }

  return timecodes
}
