/**
 * Firestore 컬렉션 타입 정의
 *
 * Supabase PostgreSQL에서 마이그레이션된 NoSQL 구조
 * 쿼리 최적화를 위한 데이터 비정규화 적용
 *
 * @module lib/firestore-types
 */

import type { Timestamp, FieldValue } from 'firebase/firestore'

// ==================== Enums & Constants ====================

/**
 * 토너먼트 카테고리
 */
export type TournamentCategory =
  | 'WSOP'
  | 'Triton'
  | 'EPT'
  | 'Hustler Casino Live'
  | 'APT'
  | 'APL'
  | 'WSOP Classic'
  | 'GGPOKER'

/**
 * 영상 소스 타입
 */
export type VideoSource = 'youtube' | 'upload' | 'nas'

/**
 * 컨텐츠 상태
 */
export type ContentStatus = 'draft' | 'published' | 'archived' | 'analyzing' | 'completed'

/**
 * 업로드 상태
 */
export type UploadStatus = 'none' | 'uploading' | 'uploaded' | 'analyzing' | 'completed' | 'failed'

/**
 * 사용자 역할
 */
export type UserRole = 'admin' | 'high_templar' | 'arbiter' | 'user'

/**
 * 포커 포지션
 */
export type PokerPosition = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'MP' | 'MP+1' | 'HJ' | 'CO'

/**
 * 포커 스트리트
 */
export type PokerStreet = 'preflop' | 'flop' | 'turn' | 'river'

/**
 * 포커 액션 타입
 */
export type PokerActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'

// ==================== Firestore Document Types ====================

/**
 * 카테고리 정보 (임베딩용)
 *
 * Tournament 문서에 중복 저장되어 JOIN 없이 빠른 조회 가능
 */
export interface CategoryInfo {
  /** 카테고리 ID */
  id: string
  /** 카테고리 이름 */
  name: TournamentCategory
  /** 카테고리 로고 URL */
  logo?: string
}

/**
 * 통계 정보 (공통)
 */
export interface Stats {
  /** 이벤트 수 */
  eventsCount?: number
  /** 스트림 수 */
  streamsCount?: number
  /** 핸드 수 */
  handsCount?: number
  /** 플레이어 수 */
  playersCount?: number
}

// ==================== Tournament Collection ====================

/**
 * Tournament 문서
 *
 * Collection: /tournaments/{tournamentId}
 */
export interface FirestoreTournament {
  /** 토너먼트 이름 */
  name: string
  /** 카테고리 */
  category: TournamentCategory
  /** 카테고리 정보 (임베딩) */
  categoryInfo?: CategoryInfo
  /** 개최 장소 */
  location: string
  /** 도시 */
  city?: string
  /** 국가 */
  country?: string
  /** 게임 타입 */
  gameType?: 'tournament' | 'cash-game'
  /** 시작일 */
  startDate: Timestamp
  /** 종료일 */
  endDate: Timestamp
  /** 총 상금 */
  totalPrize?: string
  /** 컨텐츠 상태 */
  status?: ContentStatus
  /** 통계 */
  stats: Stats
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * Event 문서
 *
 * Collection: /tournaments/{tournamentId}/events/{eventId}
 */
export interface FirestoreEvent {
  /** 이벤트 이름 */
  name: string
  /** 이벤트 번호 */
  eventNumber?: string
  /** 이벤트 날짜 */
  date: Timestamp
  /** 바이인 금액 */
  buyIn?: string
  /** 총 상금 */
  totalPrize?: string
  /** 우승자 */
  winner?: string
  /** 참가자 수 */
  entryCount?: number
  /** 블라인드 구조 */
  blindStructure?: string
  /** 레벨 시간 (분) */
  levelDuration?: number
  /** 시작 스택 */
  startingStack?: number
  /** 메모 */
  notes?: string
  /** 컨텐츠 상태 */
  status?: ContentStatus
  /** 통계 */
  stats: Stats
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * Stream 문서
 *
 * Collection: /tournaments/{tournamentId}/events/{eventId}/streams/{streamId}
 */
export interface FirestoreStream {
  /** 스트림 이름 */
  name: string
  /** 설명 */
  description?: string
  /** 영상 URL (YouTube) */
  videoUrl?: string
  /** 영상 파일명 (업로드) */
  videoFile?: string
  /** 영상 소스 */
  videoSource?: VideoSource
  /** 발행일 */
  publishedAt?: Timestamp
  /** GCS 경로 */
  gcsPath?: string
  /** GCS URI (gs://bucket/path) */
  gcsUri?: string
  /** 파일 크기 (bytes) */
  gcsFileSize?: number
  /** GCS 업로드 완료 시각 */
  gcsUploadedAt?: Timestamp
  /** 업로드 상태 */
  uploadStatus?: UploadStatus
  /** 영상 길이 (초) */
  videoDuration?: number
  /** 컨텐츠 상태 */
  status?: ContentStatus
  /** 통계 */
  stats: Stats
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

// ==================== Hands Collection (Flat) ====================

/**
 * 핸드에 참여한 플레이어 정보 (임베딩)
 *
 * Hand 문서의 players 배열에 저장
 * 최대 9명 (9-max 테이블)
 */
export interface HandPlayerEmbedded {
  /** 플레이어 ID (players 컬렉션 참조) */
  playerId: string
  /** 플레이어 이름 (중복 - 빠른 조회) */
  name: string
  /** 포지션 */
  position?: PokerPosition
  /** 좌석 번호 (1-9) */
  seat?: number
  /** 홀 카드 (예: ["As", "Kd"]) */
  cards?: string[]
  /** 시작 스택 */
  startStack?: number
  /** 종료 스택 */
  endStack?: number
  /** 승자 여부 */
  isWinner?: boolean
  /** 핸드 설명 (예: "Full House, Aces over Kings") */
  handDescription?: string
}

/**
 * 핸드 액션 정보 (임베딩)
 *
 * Hand 문서의 actions 배열에 저장
 * 일반적으로 20-50개의 액션
 */
export interface HandActionEmbedded {
  /** 플레이어 ID */
  playerId: string
  /** 플레이어 이름 (중복 - 빠른 조회) */
  playerName: string
  /** 스트리트 */
  street: PokerStreet
  /** 액션 순서 */
  sequence: number
  /** 액션 타입 */
  actionType: PokerActionType
  /** 액션 금액 */
  amount?: number
}

/**
 * 핸드 참여 정보 (Engagement)
 */
export interface HandEngagement {
  /** 좋아요 수 */
  likesCount: number
  /** 북마크 수 */
  bookmarksCount: number
}

/**
 * Hand 문서
 *
 * Collection: /hands/{handId}
 * 플랫 컬렉션으로 쿼리 유연성 확보
 */
export interface FirestoreHand {
  /** 스트림 ID (참조) */
  streamId: string
  /** 이벤트 ID (참조) */
  eventId: string
  /** 토너먼트 ID (참조) */
  tournamentId: string

  /** 핸드 번호 */
  number: string
  /** 핸드 설명 */
  description: string
  /** AI 생성 요약 */
  aiSummary?: string
  /** 타임스탬프 (영상 내) */
  timestamp: string

  /** 보드 카드 - 플랍 (3장) */
  boardFlop?: string[]
  /** 보드 카드 - 턴 (1장) */
  boardTurn?: string
  /** 보드 카드 - 리버 (1장) */
  boardRiver?: string

  /** 팟 크기 */
  potSize?: number
  /** 스몰 블라인드 */
  smallBlind?: number
  /** 빅 블라인드 */
  bigBlind?: number
  /** 앤티 */
  ante?: number

  /** 스트리트별 팟 */
  potPreflop?: number
  potFlop?: number
  potTurn?: number
  potRiver?: number

  /** 영상 시작 타임스탬프 (초) */
  videoTimestampStart?: number
  /** 영상 종료 타임스탬프 (초) */
  videoTimestampEnd?: number
  /** 분석 작업 ID */
  jobId?: string

  /** 참여 플레이어 (임베딩) */
  players: HandPlayerEmbedded[]
  /** 액션 (임베딩) */
  actions: HandActionEmbedded[]

  /** 참여 정보 */
  engagement: HandEngagement

  /** 썸네일 URL */
  thumbnailUrl?: string
  /** 즐겨찾기 */
  favorite?: boolean

  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

// ==================== Players Collection ====================

/**
 * 플레이어 통계
 */
export interface PlayerStats {
  /** VPIP (Voluntarily Put In Pot) */
  vpip?: number
  /** PFR (Pre-Flop Raise) */
  pfr?: number
  /** 총 핸드 수 */
  totalHands?: number
  /** 승률 */
  winRate?: number
}

/**
 * Player 문서
 *
 * Collection: /players/{playerId}
 */
export interface FirestorePlayer {
  /** 플레이어 이름 */
  name: string
  /** 정규화된 이름 (검색용, lowercase alphanumeric) */
  normalizedName: string
  /** 별명 목록 */
  aliases?: string[]
  /** 프로필 사진 URL */
  photoUrl?: string
  /** 국가 */
  country?: string
  /** 프로 여부 */
  isPro?: boolean
  /** 자기소개 */
  bio?: string
  /** 총 상금 */
  totalWinnings?: number
  /** 통계 */
  stats?: PlayerStats
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * 플레이어별 핸드 인덱스
 *
 * Collection: /players/{playerId}/hands/{handId}
 */
export interface PlayerHandIndex {
  /** 토너먼트 참조 정보 */
  tournamentRef: {
    id: string
    name: string
    category: TournamentCategory
  }
  /** 포지션 */
  position?: PokerPosition
  /** 카드 */
  cards?: string[]
  /** 결과 */
  result: {
    isWinner: boolean
    finalAmount?: number
  }
  /** 핸드 날짜 */
  handDate: Timestamp
}

// ==================== Users Collection ====================

/**
 * User 문서
 *
 * Collection: /users/{userId}
 */
export interface FirestoreUser {
  /** 이메일 */
  email: string
  /** 닉네임 */
  nickname?: string
  /** 아바타 URL */
  avatarUrl?: string
  /** 역할 */
  role: UserRole
  /** 이메일 인증 여부 */
  emailVerified?: boolean
  /** 통계 */
  stats: {
    postsCount: number
    commentsCount: number
  }
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
  /** 마지막 로그인 */
  lastLoginAt?: Timestamp
}

/**
 * 사용자 알림
 *
 * Collection: /users/{userId}/notifications/{notificationId}
 */
export interface FirestoreNotification {
  /** 알림 타입 */
  type: 'comment' | 'like' | 'mention' | 'system'
  /** 알림 제목 */
  title: string
  /** 알림 내용 */
  message: string
  /** 링크 */
  link?: string
  /** 읽음 여부 */
  isRead: boolean
  /** 생성일 */
  createdAt: Timestamp
}

/**
 * 사용자 북마크
 *
 * Collection: /users/{userId}/bookmarks/{bookmarkId}
 */
export interface FirestoreBookmark {
  /** 북마크 타입 */
  type: 'hand' | 'post'
  /** 참조 ID */
  refId: string
  /** 참조 정보 (중복) */
  refData: {
    title: string
    description?: string
  }
  /** 생성일 */
  createdAt: Timestamp
}

// ==================== Community Collections ====================

/**
 * 작성자 정보 (임베딩)
 */
export interface AuthorInfo {
  /** 사용자 ID */
  id: string
  /** 닉네임 */
  name: string
  /** 아바타 URL */
  avatarUrl?: string
}

/**
 * Post 문서
 *
 * Collection: /posts/{postId}
 */
export interface FirestorePost {
  /** 게시글 제목 */
  title: string
  /** 게시글 내용 */
  content: string
  /** 작성자 (임베딩) */
  author: AuthorInfo
  /** 통계 */
  stats: {
    likesCount: number
    commentsCount: number
  }
  /** 태그 */
  tags?: string[]
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * Comment 문서
 *
 * Collection: /posts/{postId}/comments/{commentId}
 */
export interface FirestoreComment {
  /** 댓글 내용 */
  content: string
  /** 작성자 (임베딩) */
  author: AuthorInfo
  /** 부모 댓글 ID (대댓글인 경우) */
  parentId?: string
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

// ==================== Analysis Jobs Collection ====================

/**
 * 분석 작업 상태
 */
export type AnalysisJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * 세그먼트 분석 결과
 */
export interface SegmentResult {
  /** 세그먼트 ID */
  segmentId: string
  /** 분석 상태 */
  status: 'pending' | 'completed' | 'failed'
  /** 발견된 핸드 수 */
  handsFound: number
  /** 시작 시간 (초) */
  startTime: number
  /** 종료 시간 (초) */
  endTime: number
}

/**
 * AnalysisJob 문서
 *
 * Collection: /analysisJobs/{jobId}
 * 기존 Firestore 컬렉션 유지
 */
export interface FirestoreAnalysisJob {
  /** 스트림 ID */
  streamId: string
  /** 사용자 ID */
  userId: string
  /** 작업 상태 */
  status: AnalysisJobStatus
  /** 진행률 (0-100) */
  progress: number
  /** 에러 메시지 */
  errorMessage?: string
  /** 분석 결과 */
  result?: {
    success: boolean
    segmentsProcessed: number
    totalHands: number
    segmentResults: SegmentResult[]
  }
  /** 생성일 */
  createdAt: Timestamp
  /** 시작일 */
  startedAt?: Timestamp
  /** 완료일 */
  completedAt?: Timestamp
}

// ==================== System Collections ====================

/**
 * Category 문서
 *
 * Collection: /categories/{categoryId}
 */
export interface FirestoreCategory {
  /** 카테고리 이름 */
  name: TournamentCategory
  /** 카테고리 로고 URL */
  logo?: string
  /** 표시 순서 */
  order: number
  /** 활성화 여부 */
  isActive: boolean
  /** 생성일 */
  createdAt: Timestamp
}

/**
 * SystemConfig 문서
 *
 * Collection: /systemConfigs/{configId}
 */
export interface FirestoreSystemConfig {
  /** 설정 키 */
  key: string
  /** 설정 값 */
  value: unknown
  /** 설명 */
  description?: string
  /** 수정일 */
  updatedAt: Timestamp
  /** 수정자 */
  updatedBy?: string
}

// ==================== Helper Types ====================

/**
 * Firestore Timestamp 또는 서버 타임스탬프
 */
export type TimestampField = Timestamp | FieldValue

/**
 * 문서 생성 시 사용할 기본 필드
 */
export interface DocumentBaseFields {
  createdAt: TimestampField
  updatedAt: TimestampField
}

/**
 * 컬렉션 경로 상수
 */
export const COLLECTION_PATHS = {
  TOURNAMENTS: 'tournaments',
  EVENTS: (tournamentId: string) => `tournaments/${tournamentId}/events`,
  STREAMS: (tournamentId: string, eventId: string) =>
    `tournaments/${tournamentId}/events/${eventId}/streams`,
  HANDS: 'hands',
  PLAYERS: 'players',
  PLAYER_HANDS: (playerId: string) => `players/${playerId}/hands`,
  USERS: 'users',
  USER_NOTIFICATIONS: (userId: string) => `users/${userId}/notifications`,
  USER_BOOKMARKS: (userId: string) => `users/${userId}/bookmarks`,
  POSTS: 'posts',
  POST_COMMENTS: (postId: string) => `posts/${postId}/comments`,
  POST_LIKES: (postId: string) => `posts/${postId}/likes`,
  ANALYSIS_JOBS: 'analysisJobs',
  CATEGORIES: 'categories',
  SYSTEM_CONFIGS: 'systemConfigs',
} as const
