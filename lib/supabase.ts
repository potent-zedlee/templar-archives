import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Helper function for creating a new Supabase client instance
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Type definitions for our database tables
export type Tournament = {
  id: string
  name: string
  category: 'WSOP' | 'Triton' | 'EPT' | 'APT' | 'APL' | 'Hustler Casino Live' | 'WSOP Classic' | 'GGPOKER'
  category_logo?: string
  location: string
  city?: string
  country?: string
  start_date: string
  end_date: string
  game_type?: 'tournament' | 'cash-game'
  created_at?: string
  events?: Event[] // 변경: sub_events → events
}

export type Event = {
  id: string
  tournament_id: string
  name: string
  event_number?: string
  date: string
  total_prize?: string
  winner?: string
  buy_in?: string
  entry_count?: number
  blind_structure?: string
  level_duration?: number
  starting_stack?: number
  notes?: string
  created_at?: string
  streams?: Stream[]
  days?: Stream[] // UI alias for streams (mapped in archive-helpers.ts)
}

// Legacy type alias for backward compatibility (deprecated)
export type SubEvent = Event

export type Stream = {
  id: string
  event_id: string // DB 테이블명은 sub_event_id 유지
  name: string
  description?: string
  video_url?: string
  video_file?: string
  video_source?: 'youtube' | 'upload' | 'nas'
  video_nas_path?: string
  published_at?: string
  created_at?: string
  is_organized?: boolean
  organized_at?: string
  player_count?: number
  status?: 'draft' | 'published' | 'archived' | 'analyzing' | 'completed'
  upload_status?: 'none' | 'uploading' | 'uploaded' | 'error'
  gcs_uri?: string
  gcs_bucket?: string
  gcs_object_name?: string
}


export type Hand = {
  id: string
  day_id: string
  number: string
  description: string
  timestamp: string
  favorite: boolean
  created_at?: string
}

export type Player = {
  id: string
  name: string
  photo_url?: string
  country?: string
  gender?: 'male' | 'female' | 'other'
  total_winnings?: number
  created_at?: string
}

export type HandPlayer = {
  id: string
  hand_id: string
  player_id: string
  position?: string
  cards?: string
  created_at?: string
}
