/**
 * HAE (Hand Analysis Engine) API Type Definitions
 */

// Platform types
export type HaePlatform = 'ept' | 'triton' | 'pokerstars' | 'wsop' | 'hustler'

// API Request
export interface AnalyzeVideoRequest {
  youtubeUrl: string
  startTime: number // seconds
  endTime: number // seconds
  platform: 'ept' | 'triton'
  apiKey?: string
}

// SSE Event Types
export type SseEventType = 'progress' | 'log' | 'complete' | 'error'

export interface BaseEvent {
  event: SseEventType
  data: unknown
}

export interface ProgressEvent extends BaseEvent {
  event: 'progress'
  data: {
    step: 'download' | 'upload' | 'processing' | 'analyzing'
    message: string
    percent: number
  }
}

export interface LogEvent extends BaseEvent {
  event: 'log'
  data: {
    timestamp: string
    level: 'info' | 'warning' | 'error' | 'debug'
    message: string
  }
}

export interface CompleteEvent extends BaseEvent {
  event: 'complete'
  data: AnalyzeResult
}

export interface ErrorEvent extends BaseEvent {
  event: 'error'
  data: {
    success: false
    error: string
  }
}

export type SseEvent = ProgressEvent | LogEvent | CompleteEvent | ErrorEvent

// Analysis Result
export interface AnalyzeResult {
  success: true
  hands: Hand[]
  rawResponse: string
  fileUri: string
  videoInfo: {
    startTime: number
    endTime: number
    duration: number
  }
  parseError?: string
}

// Hand Data Structures
export interface Hand {
  handNumber: number
  stakes: string
  pot: number
  board: Board
  players: Player[]
  actions: Action[]
  winners?: Winner[]
  description?: string
}

export interface Board {
  flop: string[] | null
  turn: string | null
  river: string | null
}

export interface Player {
  name: string
  seat: number
  position: string
  stackSize: number
  holeCards?: string | string[]
}

export interface Action {
  player: string
  street: 'preflop' | 'flop' | 'turn' | 'river'
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
  amount?: number
}

export interface Winner {
  name: string
  amount: number
  hand?: string
}

// Database Types (for Supabase integration)
export interface AnalysisJob {
  id: string
  video_id: string
  stream_id?: string
  platform: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  segments: TimeSegment[]
  ai_provider: string
  submitted_players?: string[]
  started_at?: string
  completed_at?: string
  error_message?: string
  created_at: string
}

export interface TimeSegment {
  start: number
  end: number
  type: 'gameplay' | 'break' | 'interview'
}

// HAE Client Configuration
export interface HaeClientConfig {
  baseUrl: string
  apiKey?: string
  timeout?: number
}
