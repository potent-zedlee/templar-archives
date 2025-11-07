export type SegmentType = 'countdown' | 'opening' | 'gameplay' | 'break' | 'ending'

export interface TimeSegment {
  id: string
  type: SegmentType
  start: number  // 초 단위
  end: number
  label?: string
}

export interface TimeStamp {
  hours: number
  minutes: number
  seconds: number
}

// 초를 HH:MM:SS로 변환
export function secondsToTimestamp(totalSeconds: number): TimeStamp {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return { hours, minutes, seconds }
}

// HH:MM:SS를 초로 변환
export function timestampToSeconds(timestamp: TimeStamp): number {
  return timestamp.hours * 3600 + timestamp.minutes * 60 + timestamp.seconds
}

// HH:MM:SS 문자열을 초로 변환
export function parseTimestamp(str: string): number {
  const parts = str.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0] || 0
}

// 초를 HH:MM:SS 문자열로 변환
export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  const pad = (num: number) => num.toString().padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

// 구간 유효성 검사
export function validateSegment(segment: TimeSegment, videoDuration?: number): string | null {
  if (segment.start < 0) {
    return '시작 시간은 0보다 커야 합니다'
  }
  if (segment.end <= segment.start) {
    return '종료 시간은 시작 시간보다 커야 합니다'
  }
  if (videoDuration && segment.end > videoDuration) {
    return '종료 시간이 영상 길이를 초과합니다'
  }
  return null
}

// 구간 겹침 검사
export function checkOverlap(segments: TimeSegment[]): boolean {
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i]
      const b = segments[j]
      if (a.start < b.end && b.start < a.end) {
        return true
      }
    }
  }
  return false
}

// 총 분석 시간 계산 (gameplay 구간만)
export function calculateTotalAnalysisTime(segments: TimeSegment[]): number {
  return segments
    .filter(s => s.type === 'gameplay')
    .reduce((total, segment) => total + (segment.end - segment.start), 0)
}
