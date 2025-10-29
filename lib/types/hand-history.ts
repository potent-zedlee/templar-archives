/**
 * Hand History 타입 정의
 * 외부 시스템에서 핸드 히스토리를 import할 때 사용하는 표준 포맷
 */

export type HandHistory = {
  handNumber: string
  startTime: string // "HH:MM:SS" 또는 "MM:SS"
  endTime: string // "HH:MM:SS" 또는 "MM:SS"
  duration: number // 초 단위
  confidence?: number // 0-100 (신뢰도 점수)
  summary?: string // 한 줄 요약 (예: "타카자와 오픈레이즈, 모두 폴드")
  analyzed_by?: 'manual' | 'auto' // 분석 방법

  // 플레이어 정보
  players: {
    name: string
    position?: string
    cards?: string // 예: "AhKh" (에이스 하트, 킹 하트)
    stack?: number // 칩 스택
  }[]

  // 게임 정보
  potSize?: number
  boardCards?: string // 예: "As Kh Qd 7c 3s"
  winner?: string
  winAmount?: number

  // 스트릿별 액션
  preflop?: string[]
  flop?: string[]
  turn?: string[]
  river?: string[]

  // 스트릿별 상세 정보 (확장된 포맷)
  streets?: {
    preflop?: { actions?: any[]; pot?: number }
    flop?: { actions?: any[]; pot?: number }
    turn?: { actions?: any[]; pot?: number }
    river?: { actions?: any[]; pot?: number }
  }

  // 메타데이터
  rawData?: any // 원본 데이터 (디버깅용)
}

/**
 * 핸드 히스토리 import 요청 포맷
 */
export type ImportHandsRequest = {
  dayId: string // 어느 Day에 추가할지
  hands: HandHistory[]
  source?: string // 데이터 출처 (예: "external-analyzer-v1")
}

/**
 * 핸드 히스토리 import 응답 포맷
 */
export type ImportHandsResponse = {
  success: boolean
  imported: number // 성공적으로 import된 핸드 수
  failed: number // 실패한 핸드 수
  errors?: string[]
}
