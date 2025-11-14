/**
 * KAN Backend Type Definitions
 * Python 백엔드와의 통신을 위한 타입 정의
 */

// Python 백엔드 응답 타입
export interface KanAnalysisResult {
  hands: KanHand[]
}

export interface KanHand {
  handNumber: number
  description: string
  stakes: string
  // Blind information
  small_blind?: number
  big_blind?: number
  ante?: number
  // Pot sizes
  pot: number
  pot_preflop?: number
  pot_flop?: number
  pot_turn?: number
  pot_river?: number
  // Hand data
  players: KanPlayer[]
  board: {
    flop: string[]
    turn: string | null
    river: string | null
  }
  winners: KanWinner[]
  actions: KanAction[]
}

export interface KanPlayer {
  name: string
  position: string
  stackSize: number
  holeCards?: string[] | string
}

export interface KanWinner {
  name: string
  amount: number
  hand?: string
}

export interface KanAction {
  player: string
  action: string
  amount?: number
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
}

// SSE 이벤트 타입
export type SSEEventType = 'progress' | 'complete' | 'error'

export interface SSEProgressEvent {
  percent: number
  message?: string
}

export interface SSECompleteEvent {
  hands?: KanHand[]
}

export interface SSEErrorEvent {
  error: string
}

export type SSEEventData = SSEProgressEvent | SSECompleteEvent | SSEErrorEvent

// Python 백엔드 요청 타입
export interface AnalyzeVideoRequest {
  youtubeUrl: string
  startTime: number
  endTime: number
  platform: 'ept' | 'triton'
}
