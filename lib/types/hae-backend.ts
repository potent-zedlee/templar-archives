/**
 * HAE Backend Type Definitions
 * Python 백엔드와의 통신을 위한 타입 정의
 */

// Python 백엔드 응답 타입
export interface HaeAnalysisResult {
  hands: HaeHand[]
}

export interface HaeHand {
  handNumber: number
  description: string
  stakes: string
  players: HaePlayer[]
  board: {
    flop: string[]
    turn: string | null
    river: string | null
  }
  pot: number
  winners: HaeWinner[]
  actions: HaeAction[]
}

export interface HaePlayer {
  name: string
  position: string
  stackSize: number
  holeCards?: string[] | string
}

export interface HaeWinner {
  name: string
  amount: number
  hand?: string
}

export interface HaeAction {
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
  hands?: HaeHand[]
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
