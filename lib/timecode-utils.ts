/**
 * Timecode Utilities
 *
 * 타임코드 파싱, 포맷팅, 검증 유틸리티 함수
 */

/**
 * 타임코드 문자열을 초 단위로 변환
 * @param timecode - "MM:SS" or "H:MM:SS" or "HH:MM:SS"
 * @returns 초 단위 숫자
 * @example
 * parseTimecode("05:11") // 311
 * parseTimecode("1:05:11") // 3911
 * parseTimecode("10:05:11") // 36311
 */
export function parseTimecode(timecode: string): number {
  if (!timecode || typeof timecode !== 'string') {
    throw new Error('Invalid timecode: must be a non-empty string')
  }

  const parts = timecode.trim().split(':')

  if (parts.length < 2 || parts.length > 3) {
    throw new Error('Invalid timecode format: must be MM:SS or H:MM:SS or HH:MM:SS')
  }

  const numbers = parts.map((part) => {
    const num = parseInt(part, 10)
    if (isNaN(num) || num < 0) {
      throw new Error(`Invalid timecode part: ${part}`)
    }
    return num
  })

  if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = numbers
    if (seconds >= 60) {
      throw new Error('Invalid seconds: must be less than 60')
    }
    return minutes * 60 + seconds
  } else {
    // H:MM:SS or HH:MM:SS
    const [hours, minutes, seconds] = numbers
    if (minutes >= 60) {
      throw new Error('Invalid minutes: must be less than 60')
    }
    if (seconds >= 60) {
      throw new Error('Invalid seconds: must be less than 60')
    }
    return hours * 3600 + minutes * 60 + seconds
  }
}

/**
 * 초 단위 숫자를 타임코드 문자열로 변환
 * @param seconds - 초 단위 숫자
 * @returns "MM:SS" or "H:MM:SS" format
 * @example
 * formatTimecode(311) // "05:11"
 * formatTimecode(3911) // "1:05:11"
 * formatTimecode(36311) // "10:05:11"
 */
export function formatTimecode(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    throw new Error('Invalid seconds: must be a non-negative number')
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    // H:MM:SS or HH:MM:SS
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  } else {
    // MM:SS
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
}

/**
 * 타임코드 문자열이 유효한지 검증
 * @param timecode - "MM:SS" or "H:MM:SS" or "HH:MM:SS"
 * @returns 유효 여부
 */
export function validateTimecode(timecode: string): boolean {
  try {
    parseTimecode(timecode)
    return true
  } catch {
    return false
  }
}

/**
 * 시작/종료 타임코드 사이의 길이 계산 (초 단위)
 * @param startTimecode - 시작 타임코드
 * @param endTimecode - 종료 타임코드
 * @returns 길이 (초 단위)
 * @example
 * calculateDuration("05:11", "08:23") // 192
 */
export function calculateDuration(startTimecode: string, endTimecode: string): number {
  const startSeconds = parseTimecode(startTimecode)
  const endSeconds = parseTimecode(endTimecode)

  if (endSeconds <= startSeconds) {
    throw new Error('End timecode must be after start timecode')
  }

  return endSeconds - startSeconds
}

/**
 * 타임코드가 영상 길이 범위 내에 있는지 검증
 * @param timecode - 타임코드
 * @param videoDurationSeconds - 영상 길이 (초 단위)
 * @returns 유효 여부
 */
export function validateTimecodeRange(timecode: string, videoDurationSeconds: number): boolean {
  try {
    const seconds = parseTimecode(timecode)
    return seconds >= 0 && seconds <= videoDurationSeconds
  } catch {
    return false
  }
}

/**
 * 두 타임코드 범위가 겹치는지 확인
 * @param range1 - [start, end]
 * @param range2 - [start, end]
 * @returns 겹침 여부
 */
export function doTimecodeRangesOverlap(
  range1: [string, string],
  range2: [string, string]
): boolean {
  const [start1, end1] = range1.map(parseTimecode)
  const [start2, end2] = range2.map(parseTimecode)

  return start1 < end2 && start2 < end1
}

/**
 * 타임코드 문자열 정규화 (공백 제거, 0 패딩 추가)
 * @param timecode - 정규화할 타임코드
 * @returns 정규화된 타임코드
 * @example
 * normalizeTimecode("5:11") // "05:11"
 * normalizeTimecode("1:5:11") // "1:05:11"
 */
export function normalizeTimecode(timecode: string): string {
  const seconds = parseTimecode(timecode)
  return formatTimecode(seconds)
}

/**
 * 타임코드 정보를 포함한 객체 검증
 * @param data - 검증할 데이터
 * @returns 검증 결과 및 에러 메시지
 */
export function validateTimecodeSubmission(data: {
  startTime: string
  endTime?: string
  videoDurationSeconds?: number
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 시작 타임코드 검증
  if (!data.startTime || !validateTimecode(data.startTime)) {
    errors.push('유효하지 않은 시작 타임코드입니다')
  }

  // 종료 타임코드 검증 (있는 경우)
  if (data.endTime) {
    if (!validateTimecode(data.endTime)) {
      errors.push('유효하지 않은 종료 타임코드입니다')
    } else if (data.startTime && validateTimecode(data.startTime)) {
      try {
        calculateDuration(data.startTime, data.endTime)
      } catch (error) {
        errors.push('종료 타임코드는 시작 타임코드보다 이후여야 합니다')
      }
    }
  }

  // 영상 길이 범위 검증 (있는 경우)
  if (data.videoDurationSeconds !== undefined) {
    if (data.startTime && validateTimecode(data.startTime)) {
      if (!validateTimecodeRange(data.startTime, data.videoDurationSeconds)) {
        errors.push('시작 타임코드가 영상 길이를 초과합니다')
      }
    }
    if (data.endTime && validateTimecode(data.endTime)) {
      if (!validateTimecodeRange(data.endTime, data.videoDurationSeconds)) {
        errors.push('종료 타임코드가 영상 길이를 초과합니다')
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 타임코드 배열을 시간순으로 정렬
 * @param timecodes - 정렬할 타임코드 배열
 * @returns 정렬된 타임코드 배열
 */
export function sortTimecodes(timecodes: string[]): string[] {
  return [...timecodes].sort((a, b) => {
    const secondsA = parseTimecode(a)
    const secondsB = parseTimecode(b)
    return secondsA - secondsB
  })
}

/**
 * 사람이 읽기 쉬운 길이 형식으로 변환
 * @param seconds - 초 단위 길이
 * @returns "5분 11초" or "1시간 5분 11초"
 */
export function formatDurationHumanReadable(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours}시간`)
  }
  if (minutes > 0) {
    parts.push(`${minutes}분`)
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}초`)
  }

  return parts.join(' ')
}
