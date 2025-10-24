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

export type VideoSource = "youtube" | "upload"

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
  category_logo?: string
  location: string
  city?: string
  country?: string
  start_date: string
  end_date: string
  total_prize?: string
  created_at?: string
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
  // UI state (클라이언트 전용)
  days?: Day[]
  expanded?: boolean
}

export interface Day {
  id: string
  sub_event_id: string
  name: string
  video_url?: string
  video_file?: string
  video_nas_path?: string
  video_source?: VideoSource
  published_at?: string
  created_at?: string
  player_count?: number
  // UI state (클라이언트 전용)
  selected?: boolean
}

export interface Hand {
  id: string
  day_id: string
  number: string
  description: string
  summary?: string
  timestamp: string
  board_cards?: string[]
  pot_size?: number
  confidence?: number
  favorite?: boolean
  created_at?: string
  // Relations
  hand_players?: HandPlayer[]
  // UI state (클라이언트 전용)
  checked?: boolean
}

export interface Player {
  id: string
  name: string
  name_lower?: string
  photo_url?: string
  country?: string
  total_winnings?: number
  created_at?: string
}

export interface HandPlayer {
  id: string
  hand_id: string
  player_id: string
  position?: string
  cards?: string[]
  stack_before?: number
  stack_after?: number
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

export interface DayFormData {
  name: string
  video_source: VideoSource
  video_url: string
  upload_file: File | null
  published_at: string
}

// ==================== UI State Types ====================

export type NavigationLevel = 'root' | 'tournament' | 'subevent' | 'unorganized'

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
  data?: Tournament | SubEvent | Day | UnsortedVideo
  level?: number  // Tree level: 0=tournament, 1=subevent, 2=day
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
  day: Day | null
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

export interface DayActions {
  create: (subEventId: string, data: DayFormData) => Promise<void>
  update: (id: string, data: DayFormData) => Promise<void>
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
 * 타입 가드: Day 확인
 */
export function isDay(item: unknown): item is Day {
  return typeof item === "object" && item !== null && "sub_event_id" in item && "video_source" in item
}

/**
 * 초기 Tournament Form 데이터
 */
export const INITIAL_TOURNAMENT_FORM: TournamentFormData = {
  name: "",
  category: "WSOP",
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
 * 초기 Day Form 데이터
 */
export const INITIAL_DAY_FORM: DayFormData = {
  name: "",
  video_source: "youtube",
  video_url: "",
  upload_file: null,
  published_at: "",
}
