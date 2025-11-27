/**
 * Supabase Stub Types and Functions
 *
 * 이 파일은 Firestore 마이그레이션 중 레거시 호환성을 위한 스텁입니다.
 * 실제 Supabase 타입과 함수는 사용되지 않습니다.
 *
 * TODO: 전체 Firestore 마이그레이션 완료 후 이 파일과 관련 의존성 제거
 *
 * @deprecated Firestore로 마이그레이션됨. firestore-types.ts를 대신 사용하세요.
 */

import { createClientSupabaseClient, createBrowserSupabaseClient } from './supabase-client'

// Re-export deprecated functions
export { createClientSupabaseClient, createBrowserSupabaseClient }

// Legacy type aliases - 이제 firestore-types.ts를 사용하세요
export type Tournament = {
  id: string
  name: string
  category: string
  location: string
  city?: string
  country?: string
  start_date: string
  end_date: string
  total_prize?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export type SubEvent = {
  id: string
  tournament_id: string
  name: string
  event_number?: string
  date: string
  buy_in?: string
  total_prize?: string
  winner?: string
  entry_count?: number
  status?: string
  created_at?: string
  updated_at?: string
}

export type Stream = {
  id: string
  sub_event_id: string
  name: string
  description?: string
  video_url?: string
  video_file?: string
  video_source?: 'youtube' | 'upload' | 'nas'
  video_nas_path?: string
  published_at?: string
  gcs_path?: string
  gcs_uri?: string
  gcs_file_size?: number
  gcs_uploaded_at?: string
  upload_status?: string
  video_duration?: number
  status?: string
  created_at?: string
  updated_at?: string
}

export type Hand = {
  id: string
  day_id: string
  number: string
  description: string
  ai_summary?: string
  timestamp: string
  board_flop?: string[]
  board_turn?: string
  board_river?: string
  pot_size?: number
  small_blind?: number
  big_blind?: number
  ante?: number
  video_timestamp_start?: number
  video_timestamp_end?: number
  favorite?: boolean
  created_at?: string
  updated_at?: string
}

export type Player = {
  id: string
  name: string
  normalized_name: string
  aliases?: string[]
  photo_url?: string
  country?: string
  is_pro?: boolean
  bio?: string
  total_winnings?: number
  created_at?: string
  updated_at?: string
}

export type HandPlayer = {
  id: string
  hand_id: string
  player_id: string
  position?: string
  seat?: number
  cards?: string[]
  start_stack?: number
  end_stack?: number
  is_winner?: boolean
  hand_description?: string
}

export type HandAction = {
  id: string
  hand_id: string
  player_id: string
  street: string
  sequence: number
  action_type: string
  amount?: number
}

export type User = {
  id: string
  email: string
  nickname?: string
  avatar_url?: string
  role: string
  created_at?: string
  updated_at?: string
}

// Database type stub for compatibility
export type Database = {
  public: {
    Tables: Record<string, unknown>
  }
}
