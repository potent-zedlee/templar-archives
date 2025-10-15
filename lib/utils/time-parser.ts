/**
 * 타임코드 파싱 유틸리티
 * "00:26:37" 또는 "26:37" 형식을 초(seconds)로 변환
 */

export function parseTimeToSeconds(timeString: string): number {
  if (!timeString) return 0

  const parts = timeString.split(':').map(Number)

  if (parts.length === 3) {
    // HH:MM:SS 형식
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  } else if (parts.length === 2) {
    // MM:SS 형식
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  } else if (parts.length === 1) {
    // SS 형식
    return parts[0]
  }

  return 0
}

/**
 * 초(seconds)를 타임코드 형식으로 변환
 * 3661 → "01:01:01"
 */
export function formatSecondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
}
