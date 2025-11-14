/**
 * Archive 페이지 관련 타입 정의
 * 모든 any 타입을 제거하고 명확한 타입 시스템 구축
 */

// ==================== Enums & Constants ====================

export type TournamentCategory =
  | "WSOP"
  | "Triton"
  | "EPT"
  | "Hustler Casino Live"
  | "APT"
  | "APL"
  | "WSOP Classic"
  | "GGPOKER"

export type VideoSource = "youtube" | "upload" | "nas"

export type ContentStatus = "draft" | "published" | "archived"

export type ViewMode = "list" | "grid" | "timeline"

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "date-asc"
  | "date-desc"
  | "count-asc"
  | "count-desc"

// ==================== Card Types ====================

export type CardSuit = '♠' | '♥' | '♦' | '♣'
export type CardRank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'

export interface Card {
  rank: CardRank
  suit: CardSuit
}

// CardString: 예) 'A♠', 'K♥', '10♦'
export type CardString = string

// ==================== Database Types ====================

export interface Tournament {
  id: string
  name: string
  category: TournamentCategory
  category_id?: string // New category system (FK to tournament_categories.id)
  category_logo?: string
  category_logo_url?: string // Joined from tournament_categories table
  location: string
  city?: string
  country?: string
  game_type?: 'tournament' | 'cash-game'
  start_date: string
  end_date: string
  total_prize?: string
  created_at?: string
  // Publication status
  status?: ContentStatus
  published_by?: string
  published_at?: string
  // UI state (클라이언트 전용)
  sub_events?: SubEvent[]
  expanded?: boolean
}

export interface SubEvent {
  id: string
  tournament_id: string
  name: string
  date: string
  event_number?: string
  total_prize?: string
  winner?: string
  buy_in?: string
  entry_count?: number
  blind_structure?: string
  level_duration?: number
  starting_stack?: number
  notes?: string
  created_at?: string
  // Publication status
  status?: ContentStatus
  published_by?: string
  published_at?: string
  // UI state (클라이언트 전용)
  streams?: Stream[]
  days?: Stream[]
  expanded?: boolean
}

export interface Stream {
  id: string
  sub_event_id: string
  name: string
  description?: string
  video_url?: string
  video_file?: string
  video_nas_path?: string
  video_source?: VideoSource
  created_at?: string
  is_organized?: boolean // DEPRECATED: use status instead
  organized_at?: string
  player_count?: number
  // Publication status
  status?: ContentStatus
  published_by?: string
  published_at?: string
  // UI state (클라이언트 전용)
  selected?: boolean
}

export interface Hand {
  id: string
  day_id: string
  number: string
  description: string

  // AI-generated summary (DB: ai_summary)
  ai_summary?: string

  timestamp: string

  // Structured board cards (KAN integration)
  board_flop?: string[]      // 3 cards: ["As", "Kh", "Qd"]
  board_turn?: string         // 1 card: "7c"
  board_river?: string        // 1 card: "3s"

  // DEPRECATED: use board_flop/turn/river instead
  board_cards?: string[]

  pot_size?: number
  stakes?: string             // e.g., "50k/100k/100k" - DEPRECATED: use small_blind/big_blind/ante

  // NEW: Blind information (Phase 1)
  small_blind?: number        // Small blind amount (in chips)
  big_blind?: number          // Big blind amount (in chips)
  ante?: number               // Ante amount (in chips, default 0)

  // NEW: Street-specific pot sizes (Phase 1)
  pot_preflop?: number        // Pot size after preflop action
  pot_flop?: number           // Pot size after flop action
  pot_turn?: number           // Pot size after turn action
  pot_river?: number          // Pot size after river action (final pot)

  // Video timestamps (KAN integration)
  video_timestamp_start?: number  // seconds
  video_timestamp_end?: number    // seconds
  job_id?: string                 // FK to analysis_jobs

  // Raw AI extraction data
  raw_data?: Record<string, unknown>

  favorite?: boolean
  thumbnail_url?: string
  likes_count?: number
  dislikes_count?: number
  bookmarks_count?: number
  created_at?: string

  // Relations
  hand_players?: HandPlayer[]

  // UI state (클라이언트 전용)
  checked?: boolean
}

export interface Player {
  id: string
  name: string

  // KAN integration: normalized name for AI matching (DB: normalized_name)
  // Auto-generated from name (lowercase, alphanumeric only)
  normalized_name: string

  // Alternative names/spellings for player matching
  aliases?: string[]

  // Profile information
  bio?: string
  is_pro?: boolean
  photo_url?: string
  country?: string
  total_winnings?: number

  created_at?: string
}

export interface HandPlayer {
  id: string
  hand_id: string
  player_id: string

  // Position information (KAN integration)
  poker_position?: string     // DB: poker_position (BTN, SB, BB, UTG, MP, CO, HJ)
  seat?: number               // Seat number (1-9 for 9-max tables)

  // Hole cards
  hole_cards?: string[]       // Structured format: ["As", "Kd"] (권장)
  cards?: string[] | string | null  // DEPRECATED: legacy format (use hole_cards instead)

  // Stack information (KAN integration)
  starting_stack?: number     // DB: starting_stack
  ending_stack?: number       // DB: ending_stack
  final_amount?: number       // Amount won/lost in this hand

  // Hand result
  hand_description?: string   // e.g., "Full House, Aces over Kings"
  is_winner?: boolean

  created_at?: string

  // Relations
  player?: Player
}

export interface UnsortedVideo {
  id: string
  name: string
  video_url?: string
  video_file?: string
  nas_path?: string
  video_source: VideoSource
  published_at?: string
  created_at: string
}

export interface Payout {
  rank: number
  playerName: string
  prizeAmount: string
}

// ==================== Form Data Types ====================

export interface TournamentFormData {
  name: string
  category: TournamentCategory
  category_logo?: string
  game_type: 'tournament' | 'cash-game'
  location: string
  city: string
  country: string
  start_date: string
  end_date: string
}

export interface SubEventFormData {
  name: string
  date: string
  event_number: string
  total_prize: string
  winner: string
  buy_in: string
  entry_count: string
  blind_structure: string
  level_duration: string
  starting_stack: string
  notes: string
}

export interface StreamFormData {
  name: string
  video_source: VideoSource
  video_url: string
  upload_file: File | null
  published_at: string
}

// ==================== UI State Types ====================

export type NavigationLevel = 'root' | 'tournament' | 'subevent'

export interface DialogState {
  isOpen: boolean
  editingId: string | null
}

export interface NavigationState {
  level: NavigationLevel
  tournamentId: string
  subEventId: string
}

export interface SelectionState {
  selectedVideoIds: Set<string>
  selectedHandIds: Set<string>
}

export interface FilterState {
  searchQuery: string
  sortBy: SortOption
  selectedCategory: string
  dateRange: {
    start?: Date
    end?: Date
  }
  handCountRange: [number, number]
  videoSources: {
    youtube: boolean
    upload: boolean
  }
  hasHandsOnly: boolean
}

export interface AdvancedFilters {
  dateRange: {
    start: Date | undefined
    end: Date | undefined
  }
  handCountRange: [number, number]
  videoSources: {
    youtube: boolean
    upload: boolean
  }
  hasHandsOnly: boolean
  // 새로운 필터
  tournamentName?: string
  playerName?: string
  holeCards?: CardString[]  // 홀 카드 (최대 2장)
  handValue?: CardString[]  // 핸드 밸류 (최대 5장)
}

// ==================== Folder Navigation Types ====================

export type FolderItemType = "tournament" | "subevent" | "day" | "unorganized"

export interface FolderItem {
  id: string
  name: string
  type: FolderItemType
  itemCount?: number
  date?: string
  data?: Tournament | SubEvent | Stream | UnsortedVideo
  level?: number  // Tree level: 0=tournament, 1=subevent, 2=stream
  isExpanded?: boolean  // Expansion state
  parentId?: string  // Parent folder ID
}

export interface BreadcrumbItem {
  id: string
  name: string
  type: "home" | "tournament" | "subevent"
}

// ==================== Video Player Types ====================

export interface VideoPlayerState {
  isOpen: boolean
  startTime: string
  stream: Stream | null
}

// ==================== Upload State Types ====================

export interface UploadState {
  uploading: boolean
  progress: number
  file: File | null
}

// ==================== Helper Types ====================

export interface LoadingState {
  tournaments: boolean
  hands: boolean
  unsortedVideos: boolean
  payouts: boolean
}

export interface ErrorState {
  tournaments: string | null
  hands: string | null
  unsortedVideos: string | null
}

// ==================== Action Types ====================

export interface TournamentActions {
  create: (data: TournamentFormData) => Promise<void>
  update: (id: string, data: TournamentFormData) => Promise<void>
  delete: (id: string) => Promise<void>
  toggle: (id: string) => void
}

export interface SubEventActions {
  create: (tournamentId: string, data: SubEventFormData) => Promise<void>
  update: (id: string, data: SubEventFormData) => Promise<void>
  delete: (id: string) => Promise<void>
  toggle: (tournamentId: string, subEventId: string) => void
}

export interface StreamActions {
  create: (subEventId: string, data: StreamFormData) => Promise<void>
  update: (id: string, data: StreamFormData) => Promise<void>
  delete: (id: string) => Promise<void>
  select: (id: string | null) => void
}

export interface HandActions {
  toggleFavorite: (handId: string) => Promise<void>
  toggleChecked: (handId: string) => void
}

export interface VideoActions {
  organize: (videoId: string, targetId: string) => Promise<void>
  organizeMultiple: (videoIds: string[], targetId: string) => Promise<void>
  delete: (videoId: string) => Promise<void>
}

// ==================== Utility Types ====================

export type AsyncStatus = "idle" | "loading" | "success" | "error"

export interface AsyncState<T> {
  data: T | null
  status: AsyncStatus
  error: string | null
}

// ==================== Export Helpers ====================

/**
 * 타입 가드: Tournament 확인
 */
export function isTournament(item: unknown): item is Tournament {
  return typeof item === "object" && item !== null && "category" in item
}

/**
 * 타입 가드: SubEvent 확인
 */
export function isSubEvent(item: unknown): item is SubEvent {
  return typeof item === "object" && item !== null && "tournament_id" in item
}

/**
 * 타입 가드: Stream 확인
 */
export function isStream(item: unknown): item is Stream {
  return typeof item === "object" && item !== null && "sub_event_id" in item && "video_source" in item
}

/**
 * 초기 Tournament Form 데이터
 */
export const INITIAL_TOURNAMENT_FORM: TournamentFormData = {
  name: "",
  category: "WSOP",
  category_logo: "",
  game_type: "tournament",
  location: "",
  city: "",
  country: "",
  start_date: "",
  end_date: "",
}

/**
 * 초기 SubEvent Form 데이터
 */
export const INITIAL_SUBEVENT_FORM: SubEventFormData = {
  name: "",
  date: "",
  event_number: "",
  total_prize: "",
  winner: "",
  buy_in: "",
  entry_count: "",
  blind_structure: "",
  level_duration: "",
  starting_stack: "",
  notes: "",
}

/**
 * 초기 Stream Form 데이터
 */
export const INITIAL_STREAM_FORM: StreamFormData = {
  name: "",
  video_source: "youtube",
  video_url: "",
  upload_file: null,
  published_at: "",
}
