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
  events?: Event[]
  expanded?: boolean
}

export interface Event {
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
  expanded?: boolean
}

export interface Stream {
  id: string
  event_id: string // DB: sub_event_id (테이블명 유지)
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

  // PokerKit integration (Phase 44)
  pokerkit_format?: string                     // PokerKit-compatible text format
  hand_history_format?: HandHistoryPokerKitFormat  // Structured hand history data

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

export interface EventFormData {
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

export type NavigationLevel = 'root' | 'tournament' | 'event'

export interface DialogState {
  isOpen: boolean
  editingId: string | null
}

export interface NavigationState {
  level: NavigationLevel
  tournamentId: string
  eventId: string
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

export type FolderItemType = "tournament" | "event" | "stream" | "unorganized"

export interface FolderItem {
  id: string
  name: string
  type: FolderItemType
  itemCount?: number
  date?: string
  data?: Tournament | Event | Stream | UnsortedVideo
  level?: number  // Tree level: 0=tournament, 1=event, 2=stream
  isExpanded?: boolean  // Expansion state
  parentId?: string  // Parent folder ID
}

export interface BreadcrumbItem {
  id: string
  name: string
  type: "home" | "tournament" | "event"
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

export interface EventActions {
  create: (tournamentId: string, data: EventFormData) => Promise<void>
  update: (id: string, data: EventFormData) => Promise<void>
  delete: (id: string) => Promise<void>
  toggle: (tournamentId: string, eventId: string) => void
}

export interface StreamActions {
  create: (eventId: string, data: StreamFormData) => Promise<void>
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
 * 타입 가드: Event 확인
 */
export function isEvent(item: unknown): item is Event {
  return typeof item === "object" && item !== null && "tournament_id" in item
}

/**
 * 타입 가드: Stream 확인
 */
export function isStream(item: unknown): item is Stream {
  return typeof item === "object" && item !== null && "event_id" in item && "video_source" in item
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
 * 초기 Event Form 데이터
 */
export const INITIAL_EVENT_FORM: EventFormData = {
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

// ==================== PokerKit Integration (Phase 44) ====================

/**
 * PokerKit-compatible hand history format
 *
 * PokerKit은 Python 기반 포커 시뮬레이션 라이브러리로,
 * 표준화된 핸드 히스토리 형식을 사용합니다.
 *
 * @example
 * {
 *   gameNumber: 1,
 *   stakes: "$50K/$100K",
 *   gameType: "No Limit Hold'em",
 *   seats: [
 *     { number: 1, playerName: "BRZEZINSKI", stackSize: 9600000 },
 *     { number: 2, playerName: "OSTASH", stackSize: 13580000 }
 *   ],
 *   buttonSeat: 1,
 *   sections: {
 *     holeCards: ["BRZEZINSKI: [Jh 9h]", "OSTASH: [9c 5c]"],
 *     preflop: ["OSTASH: posts small blind $50,000", "BRZEZINSKI: raises to $300,000"],
 *     flop: ["[9d 6s 3c]", "OSTASH: checks", "BRZEZINSKI: bets $125,000"],
 *     turn: ["[9d 6s 3c] [As]", "OSTASH: checks"],
 *     river: ["[9d 6s 3c As] [2h]", "OSTASH: bets $275,000"],
 *     showdown: ["OSTASH wins $950,000"]
 *   },
 *   rawText: "***** Hand #1 *****\n..."
 * }
 */
export interface HandHistoryPokerKitFormat {
  /** 핸드 번호 (게임 번호) */
  gameNumber: number

  /** 스테이크 표기 (예: "$50K/$100K", "50K/100K/100K ante") */
  stakes: string

  /** 게임 종류 */
  gameType: 'No Limit Hold\'em' | 'Pot Limit Omaha' | 'Limit Hold\'em'

  /** 플레이어 좌석 정보 */
  seats: Array<{
    /** 좌석 번호 (1-9) */
    number: number
    /** 플레이어 이름 */
    playerName: string
    /** 시작 스택 (cents) */
    stackSize: number
  }>

  /** 버튼 위치 (좌석 번호) */
  buttonSeat: number

  /** 스트리트별 섹션 */
  sections: {
    /** 홀 카드 (예: "BRZEZINSKI: [Jh 9h]") */
    holeCards: string[]
    /** 프리플랍 액션 */
    preflop: string[]
    /** 플랍 액션 (보드 카드 포함) */
    flop?: string[]
    /** 턴 액션 (보드 카드 포함) */
    turn?: string[]
    /** 리버 액션 (보드 카드 포함) */
    river?: string[]
    /** 쇼다운 (승자 및 팟) */
    showdown?: string[]
  }

  /** PokerKit 텍스트 형식 원본 */
  rawText?: string

  /** 영상 타임스탬프 정보 */
  videoTimestamp?: {
    /** 시작 타임스탬프 (초) */
    start: number
    /** 종료 타임스탬프 (초) */
    end: number
    /** 시작 타임스탬프 포맷 (HH:MM:SS) */
    startFormatted: string
    /** 종료 타임스탬프 포맷 (HH:MM:SS) */
    endFormatted: string
  }
}

/**
 * PokerKit 카드 표기법
 *
 * Rank: A, K, Q, J, T (10), 9-2
 * Suit: s (♠), h (♥), d (♦), c (♣)
 *
 * @example
 * "Ah" = Ace of hearts
 * "Ks" = King of spades
 * "Td" = Ten of diamonds
 *
 * PokerKit 형식: [Ah Kd]
 * JSON 배열: ["Ah", "Kd"]
 */
export type PokerKitCard = string

/**
 * PokerKit 액션 타입
 *
 * PokerKit 표준 액션 형식:
 * - "posts small blind $50,000"
 * - "raises to $300,000"
 * - "calls $250,000"
 * - "checks"
 * - "folds"
 * - "bets $125,000"
 * - "all-in $9,600,000"
 */
export type PokerKitAction = string

/**
 * PokerKit 보드 카드 표기
 *
 * @example
 * Flop: "[9d 6s 3c]"
 * Turn: "[9d 6s 3c] [As]"
 * River: "[9d 6s 3c As] [2h]"
 */
export type PokerKitBoard = string
