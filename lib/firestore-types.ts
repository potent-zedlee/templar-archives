/**
 * Firestore 컬렉션 타입 정의
 *
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
 * Firestore에 snake_case로 저장됨
 */
export interface Stats {
  /** 이벤트 수 */
  events_count?: number
  /** 스트림 수 */
  streams_count?: number
  /** 핸드 수 */
  hands_count?: number
  /** 플레이어 수 */
  players_count?: number
}

// ==================== Tournament Collection ====================

/**
 * Tournament 문서
 *
 * Collection: /tournaments/{tournamentId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreTournament {
  /** 토너먼트 이름 */
  name: string
  /** 카테고리 */
  category: TournamentCategory
  /** 카테고리 정보 (임베딩) */
  category_info?: CategoryInfo
  /** 개최 장소 */
  location: string
  /** 도시 */
  city?: string
  /** 국가 */
  country?: string
  /** 게임 타입 */
  game_type?: 'tournament' | 'cash-game'
  /** 시작일 */
  start_date: Timestamp
  /** 종료일 */
  end_date: Timestamp
  /** 총 상금 */
  total_prize?: string
  /** 컨텐츠 상태 */
  status?: ContentStatus
  /** 통계 */
  stats: Stats
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
}

/**
 * Event 문서
 *
 * Collection: /tournaments/{tournamentId}/events/{eventId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreEvent {
  /** 이벤트 이름 */
  name: string
  /** 이벤트 번호 */
  event_number?: string
  /** 이벤트 날짜 */
  date: Timestamp
  /** 바이인 금액 */
  buy_in?: string
  /** 총 상금 */
  total_prize?: string
  /** 우승자 */
  winner?: string
  /** 참가자 수 */
  entry_count?: number
  /** 블라인드 구조 */
  blind_structure?: string
  /** 레벨 시간 (분) */
  level_duration?: number
  /** 시작 스택 */
  starting_stack?: number
  /** 메모 */
  notes?: string
  /** 컨텐츠 상태 */
  status?: ContentStatus
  /** 통계 */
  stats: Stats
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
}

/**
 * Stream 문서
 *
 * Collection: /tournaments/{tournamentId}/events/{eventId}/streams/{streamId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreStream {
  /** 스트림 이름 */
  name: string
  /** 설명 */
  description?: string
  /** 영상 URL (YouTube) */
  video_url?: string
  /** 영상 파일명 (업로드) */
  video_file?: string
  /** 영상 소스 */
  video_source?: VideoSource
  /** 발행일 */
  published_at?: Timestamp
  /** GCS 경로 */
  gcs_path?: string
  /** GCS URI (gs://bucket/path) */
  gcs_uri?: string
  /** 파일 크기 (bytes) */
  gcs_file_size?: number
  /** GCS 업로드 완료 시각 */
  gcs_uploaded_at?: Timestamp
  /** 업로드 상태 */
  upload_status?: UploadStatus
  /** 영상 길이 (초) */
  video_duration?: number
  /** 컨텐츠 상태 */
  status?: ContentStatus
  /** 통계 */
  stats: Stats
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp

  // ==================== 파이프라인 필드 (Admin Archive 워크플로우) ====================
  // Firestore에 snake_case로 저장됨

  /** 파이프라인 상태 */
  pipeline_status?: 'pending' | 'needs_classify' | 'analyzing' | 'completed' | 'needs_review' | 'published' | 'failed'
  /** 파이프라인 진행률 (0-100) */
  pipeline_progress?: number
  /** 파이프라인 에러 메시지 */
  pipeline_error?: string
  /** 파이프라인 상태 업데이트 시각 */
  pipeline_updated_at?: Timestamp
  /** 현재 분석 작업 ID (analysisJobs 참조) */
  current_job_id?: string
  /** 마지막 분석 완료 시각 */
  last_analysis_at?: Timestamp
  /** 분석 시도 횟수 */
  analysis_attempts?: number
}

// ==================== Hands Collection (Flat) ====================

/**
 * 핸드에 참여한 플레이어 정보 (임베딩)
 *
 * Hand 문서의 players 배열에 저장
 * 최대 9명 (9-max 테이블)
 * Firestore에 snake_case로 저장됨
 */
export interface HandPlayerEmbedded {
  /** 플레이어 ID (players 컬렉션 참조) */
  player_id: string
  /** 플레이어 이름 (중복 - 빠른 조회) */
  name: string
  /** 포지션 */
  position?: PokerPosition
  /** 좌석 번호 (1-9) */
  seat?: number
  /** 홀 카드 (예: ["As", "Kd"]) */
  cards?: string[]
  /** 시작 스택 */
  start_stack?: number
  /** 종료 스택 */
  end_stack?: number
  /** 승자 여부 */
  is_winner?: boolean
  /** 핸드 설명 (예: "Full House, Aces over Kings") */
  hand_description?: string
}

/**
 * 핸드 액션 정보 (임베딩)
 *
 * Hand 문서의 actions 배열에 저장
 * 일반적으로 20-50개의 액션
 * Firestore에 snake_case로 저장됨
 */
export interface HandActionEmbedded {
  /** 플레이어 ID */
  player_id: string
  /** 플레이어 이름 (중복 - 빠른 조회) */
  player_name: string
  /** 스트리트 */
  street: PokerStreet
  /** 액션 순서 */
  sequence: number
  /** 액션 타입 */
  action_type: PokerActionType
  /** 액션 금액 */
  amount?: number
}

/**
 * 핸드 참여 정보 (Engagement)
 * Firestore에 snake_case로 저장됨
 */
export interface HandEngagement {
  /** 좋아요 수 */
  likes_count: number
  /** 싫어요 수 */
  dislikes_count: number
  /** 북마크 수 */
  bookmarks_count: number
}

/**
 * 핸드 좋아요/싫어요 투표 타입
 */
export type VoteType = 'like' | 'dislike'

/**
 * HandLike 문서
 *
 * Collection: /hands/{handId}/likes/{likeId}
 * likeId = odba (for 빠른 조회)
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreHandLike {
  /** 사용자 ID */
  user_id: string
  /** 투표 타입 */
  vote_type: VoteType
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
}

/**
 * Hand 문서
 *
 * Collection: /hands/{handId}
 * 플랫 컬렉션으로 쿼리 유연성 확보
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreHand {
  /** 스트림 ID (참조) */
  stream_id: string
  /** 이벤트 ID (참조) */
  event_id: string
  /** 토너먼트 ID (참조) */
  tournament_id: string

  /** 플레이어 ID 목록 (array-contains 쿼리용) */
  player_ids: string[]

  /** 핸드 번호 */
  number: string
  /** 핸드 설명 */
  description: string
  /** AI 생성 요약 */
  ai_summary?: string
  /** 타임스탬프 (영상 내) */
  timestamp: string

  /** 보드 카드 - 플랍 (3장) */
  board_flop?: string[]
  /** 보드 카드 - 턴 (1장) */
  board_turn?: string
  /** 보드 카드 - 리버 (1장) */
  board_river?: string

  /** 팟 크기 */
  pot_size?: number
  /** 스몰 블라인드 */
  small_blind?: number
  /** 빅 블라인드 */
  big_blind?: number
  /** 앤티 */
  ante?: number

  /** 스트리트별 팟 */
  pot_preflop?: number
  pot_flop?: number
  pot_turn?: number
  pot_river?: number

  /** 영상 시작 타임스탬프 (초) */
  video_timestamp_start?: number
  /** 영상 종료 타임스탬프 (초) */
  video_timestamp_end?: number
  /** 분석 작업 ID */
  job_id?: string

  /** 참여 플레이어 (임베딩) */
  players: HandPlayerEmbedded[]
  /** 액션 (임베딩) */
  actions: HandActionEmbedded[]

  /** 참여 정보 */
  engagement: HandEngagement

  /** 썸네일 URL */
  thumbnail_url?: string
  /** 즐겨찾기 */
  favorite?: boolean

  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
}

// ==================== Players Collection ====================

/**
 * 플레이어 통계
 * Firestore에 snake_case로 저장됨
 */
export interface PlayerStats {
  /** VPIP (Voluntarily Put In Pot) */
  vpip?: number
  /** PFR (Pre-Flop Raise) */
  pfr?: number
  /** 총 핸드 수 */
  total_hands?: number
  /** 승률 */
  win_rate?: number
}

/**
 * Player 문서
 *
 * Collection: /players/{playerId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestorePlayer {
  /** 플레이어 이름 */
  name: string
  /** 정규화된 이름 (검색용, lowercase alphanumeric) */
  normalized_name: string
  /** 별명 목록 */
  aliases?: string[]
  /** 프로필 사진 URL */
  photo_url?: string
  /** 국가 */
  country?: string
  /** 프로 여부 */
  is_pro?: boolean
  /** 자기소개 */
  bio?: string
  /** 총 상금 */
  total_winnings?: number
  /** 통계 */
  stats?: PlayerStats
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
}

/**
 * 플레이어별 핸드 인덱스
 *
 * Collection: /players/{playerId}/hands/{handId}
 * Firestore에 snake_case로 저장됨
 */
export interface PlayerHandIndex {
  /** 토너먼트 참조 정보 */
  tournament_ref: {
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
    is_winner: boolean
    final_amount?: number
  }
  /** 핸드 날짜 */
  hand_date: Timestamp
}

// ==================== Users Collection ====================

/**
 * User 문서
 *
 * Collection: /users/{userId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreUser {
  /** 이메일 */
  email: string
  /** 닉네임 */
  nickname?: string
  /** 아바타 URL */
  avatar_url?: string
  /** 역할 */
  role: UserRole
  /** 이메일 인증 여부 */
  email_verified?: boolean

  // 프로필 필드
  /** 자기소개 */
  bio?: string
  /** 포커 경력 */
  poker_experience?: string
  /** 위치 */
  location?: string
  /** 웹사이트 */
  website?: string
  /** Twitter 핸들 */
  twitter_handle?: string
  /** Instagram 핸들 */
  instagram_handle?: string
  /** 프로필 공개 설정 */
  profile_visibility?: 'public' | 'private' | 'friends'
  /** 받은 좋아요 수 */
  likes_received?: number

  /** 통계 */
  stats: {
    posts_count: number
    comments_count: number
  }
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
  /** 마지막 로그인 */
  last_login_at?: Timestamp
}

/**
 * 사용자 알림
 *
 * Collection: /users/{userId}/notifications/{notificationId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreNotification {
  /** 수신자 ID (Security Rules에서 사용) */
  recipient_id: string
  /** 알림 타입 */
  type: 'comment' | 'like' | 'mention' | 'system'
  /** 알림 제목 */
  title: string
  /** 알림 내용 */
  message: string
  /** 링크 */
  link?: string
  /** 읽음 여부 */
  is_read: boolean
  /** 생성일 */
  created_at: Timestamp
}

/**
 * 사용자 북마크
 *
 * Collection: /users/{userId}/bookmarks/{bookmarkId}
 * bookmarkId = handId (for 빠른 조회)
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreBookmark {
  /** 북마크 타입 */
  type: 'hand' | 'post'
  /** 참조 ID (핸드 ID 또는 포스트 ID) */
  ref_id: string
  /** 폴더 이름 */
  folder_name?: string
  /** 메모 */
  notes?: string
  /** 참조 정보 (중복 - 빠른 조회) */
  ref_data: {
    title: string
    description?: string
    /** 핸드 번호 */
    number?: string
    /** 타임스탬프 */
    timestamp?: string
    /** 스트림 이름 */
    stream_name?: string
    /** 이벤트 이름 */
    event_name?: string
    /** 토너먼트 이름 */
    tournament_name?: string
    /** 토너먼트 카테고리 */
    tournament_category?: string
  }
  /** 생성일 */
  created_at: Timestamp
}

// ==================== Community Collections ====================

/**
 * 작성자 정보 (임베딩)
 * Firestore에 snake_case로 저장됨
 */
export interface AuthorInfo {
  /** 사용자 ID */
  id: string
  /** 닉네임 */
  name: string
  /** 아바타 URL */
  avatar_url?: string
}

/**
 * 라이브 리포트 카테고리
 */
export type LiveReportCategory =
  | 'Tournament Update'
  | 'Chip Counts'
  | 'Breaking News'
  | 'Results'
  | 'Other'

/**
 * 라이브 리포트 상태
 */
export type LiveReportStatus = 'draft' | 'pending' | 'published'

/**
 * LiveReport 문서
 *
 * Collection: /liveReports/{reportId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreLiveReport {
  /** 제목 */
  title: string
  /** 내용 */
  content: string
  /** 썸네일 URL */
  thumbnail_url?: string
  /** 카테고리 */
  category: LiveReportCategory
  /** 태그 */
  tags: string[]
  /** 외부 링크 */
  external_link?: string
  /** 상태 */
  status: LiveReportStatus
  /** 작성자 (임베딩) */
  author: AuthorInfo
  /** 승인자 (임베딩) */
  approver?: AuthorInfo
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
  /** 발행일 */
  published_at?: Timestamp
}

/**
 * Comment 문서 (Hand 댓글)
 *
 * Collection: /hands/{handId}/comments/{commentId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreComment {
  /** 댓글 내용 */
  content: string
  /** 작성자 (임베딩) */
  author: AuthorInfo
  /** 부모 댓글 ID (대댓글인 경우) */
  parent_id?: string
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
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
 * Firestore에 snake_case로 저장됨
 */
export interface SegmentResult {
  /** 세그먼트 ID */
  segment_id: string
  /** 분석 상태 */
  status: 'pending' | 'completed' | 'failed'
  /** 발견된 핸드 수 */
  hands_found: number
  /** 시작 시간 (초) */
  start_time: number
  /** 종료 시간 (초) */
  end_time: number
}

/**
 * AnalysisJob 문서
 *
 * Collection: /analysisJobs/{jobId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreAnalysisJob {
  /** 스트림 ID */
  stream_id: string
  /** 사용자 ID */
  user_id: string
  /** 작업 상태 */
  status: AnalysisJobStatus
  /** 진행률 (0-100) */
  progress: number
  /** 에러 메시지 */
  error_message?: string
  /** 분석 결과 */
  result?: {
    success: boolean
    segments_processed: number
    total_hands: number
    segment_results: SegmentResult[]
  }
  /** 생성일 */
  created_at: Timestamp
  /** 시작일 */
  started_at?: Timestamp
  /** 완료일 */
  completed_at?: Timestamp
}

// ==================== Hand Tags Collection ====================

/**
 * 허용된 핸드 태그 이름
 *
 * 카테고리:
 * - 플레이 유형: Bluff, Value Bet, Slow Play, Check Raise
 * - 결과: Bad Beat, Cooler, Suck Out
 * - 액션: Hero Call, Hero Fold, Big Pot
 */
export type HandTagName =
  // Play Types
  | 'Bluff'
  | 'Value Bet'
  | 'Slow Play'
  | 'Check Raise'
  // Results
  | 'Bad Beat'
  | 'Cooler'
  | 'Suck Out'
  // Actions
  | 'Hero Call'
  | 'Hero Fold'
  | 'Big Pot'

/**
 * HandTag 문서
 *
 * Collection: /hands/{handId}/tags/{tagId}
 * 각 핸드의 서브컬렉션으로 태그 관리
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreHandTag {
  /** 태그 이름 */
  tag_name: HandTagName
  /** 생성자 사용자 ID */
  created_by: string
  /** 생성자 정보 (임베딩) */
  created_by_info?: AuthorInfo
  /** 생성일 */
  created_at: Timestamp
}

/**
 * 태그별 통계
 * Firestore에 snake_case로 저장됨
 */
export interface HandTagStats {
  tag_name: HandTagName
  count: number
  percentage: number
}

/**
 * 유저 태그 히스토리 (materialized view)
 *
 * Collection: /users/{userId}/tagHistory/{historyId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreUserTagHistory {
  /** 핸드 ID */
  hand_id: string
  /** 태그 이름 */
  tag_name: HandTagName
  /** 핸드 번호 */
  hand_number?: string
  /** 토너먼트 이름 */
  tournament_name?: string
  /** 생성일 */
  created_at: Timestamp
}

// ==================== Data Deletion Requests Collection ====================

/**
 * 데이터 삭제 요청 상태 (GDPR/CCPA)
 */
export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed'

/**
 * DataDeletionRequest 문서
 *
 * Collection: /dataDeletionRequests/{requestId}
 * GDPR/CCPA/PIPL 데이터 삭제 요청 관리
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreDataDeletionRequest {
  /** 사용자 ID */
  user_id: string
  /** 사용자 정보 (임베딩) */
  user?: {
    id: string
    email: string
    nickname: string
    avatar_url?: string
  }
  /** 삭제 사유 */
  reason: string
  /** 요청 상태 */
  status: DeletionRequestStatus
  /** 요청일 */
  requested_at: Timestamp
  /** 검토일 */
  reviewed_at?: Timestamp
  /** 검토자 ID */
  reviewed_by?: string
  /** 검토자 정보 (임베딩) */
  reviewed_by_user?: {
    id: string
    email: string
    nickname: string
  }
  /** 완료일 */
  completed_at?: Timestamp
  /** 관리자 메모 */
  admin_notes?: string
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
}

// ==================== System Collections ====================

/**
 * Category 문서
 *
 * Collection: /categories/{categoryId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreCategory {
  /** 카테고리 이름 */
  name: TournamentCategory
  /** 카테고리 로고 URL */
  logo?: string
  /** 표시 순서 */
  order: number
  /** 활성화 여부 */
  is_active: boolean
  /** 생성일 */
  created_at: Timestamp
}

/**
 * SystemConfig 문서
 *
 * Collection: /systemConfigs/{configId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreSystemConfig {
  /** 설정 키 */
  key: string
  /** 설정 값 */
  value: unknown
  /** 설명 */
  description?: string
  /** 수정일 */
  updated_at: Timestamp
  /** 수정자 */
  updated_by?: string
}

// ==================== Admin Collections ====================

/**
 * 플레이어 클레임 상태
 */
export type ClaimStatus = 'pending' | 'approved' | 'rejected'

/**
 * 인증 방법
 */
export type VerificationMethod = 'social_media' | 'email' | 'admin' | 'other'

/**
 * PlayerClaim 문서
 *
 * Collection: /playerClaims/{claimId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestorePlayerClaim {
  /** 사용자 ID */
  user_id: string
  /** 플레이어 ID */
  player_id: string
  /** 클레임 상태 */
  status: ClaimStatus
  /** 인증 방법 */
  verification_method: VerificationMethod
  /** 인증 데이터 */
  verification_data?: Record<string, unknown>
  /** 관리자 메모 */
  admin_notes?: string
  /** 클레임 신청일 */
  claimed_at: Timestamp
  /** 검증일 */
  verified_at?: Timestamp
  /** 검증자 ID */
  verified_by?: string
  /** 거절 사유 */
  rejected_reason?: string
  /** 사용자 정보 (임베딩) */
  user?: {
    nickname: string
    email: string
    avatar_url?: string
  }
  /** 플레이어 정보 (임베딩) */
  player?: {
    name: string
    photo_url?: string
  }
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
}

/**
 * 핸드 수정 유형
 */
export type EditType = 'basic_info' | 'players' | 'actions' | 'board'

/**
 * 수정 요청 상태
 */
export type EditRequestStatus = 'pending' | 'approved' | 'rejected'

/**
 * HandEditRequest 문서
 *
 * Collection: /handEditRequests/{requestId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreHandEditRequest {
  /** 핸드 ID */
  hand_id: string
  /** 요청자 ID */
  requester_id: string
  /** 요청자 이름 */
  requester_name: string
  /** 수정 유형 */
  edit_type: EditType
  /** 원본 데이터 */
  original_data: Record<string, unknown>
  /** 제안된 수정 데이터 */
  proposed_data: Record<string, unknown>
  /** 수정 사유 */
  reason: string
  /** 요청 상태 */
  status: EditRequestStatus
  /** 검토자 ID */
  reviewed_by?: string
  /** 검토일 */
  reviewed_at?: Timestamp
  /** 관리자 코멘트 */
  admin_comment?: string
  /** 핸드 정보 (임베딩) */
  hand?: {
    number: string
    description: string
    stream_name?: string
    event_name?: string
    tournament_name?: string
  }
  /** 생성일 */
  created_at: Timestamp
}

/**
 * AdminLog 문서
 *
 * Collection: /adminLogs/{logId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreAdminLog {
  /** 관리자 ID */
  admin_id: string
  /** 액션 */
  action: string
  /** 대상 유형 */
  target_type: 'user' | 'post' | 'comment' | 'hand' | 'player'
  /** 대상 ID */
  target_id?: string
  /** 상세 정보 */
  details?: Record<string, unknown>
  /** 관리자 정보 (임베딩) */
  admin?: {
    nickname: string
    avatar_url?: string
  }
  /** 생성일 */
  created_at: Timestamp
}

/**
 * 게임 타입
 */
export type GameType = 'tournament' | 'cash_game' | 'both'

/**
 * TournamentCategory 문서 (상세 버전)
 *
 * Collection: /tournamentCategories/{categoryId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreTournamentCategory {
  /** 카테고리 ID (문서 ID와 동일) */
  id: string
  /** 카테고리 이름 */
  name: string
  /** 표시 이름 */
  display_name: string
  /** 짧은 이름 */
  short_name?: string
  /** 별칭 목록 */
  aliases: string[]
  /** 로고 URL */
  logo_url?: string
  /** 활성화 여부 */
  is_active: boolean
  /** 게임 타입 */
  game_type: GameType
  /** 상위 카테고리 ID */
  parent_id?: string
  /** 테마 그라디언트 */
  theme_gradient?: string
  /** 테마 텍스트 색상 */
  theme_text?: string
  /** 테마 그림자 */
  theme_shadow?: string
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
}

/**
 * UnsortedStream 문서 (미분류 영상)
 *
 * Collection: /streams/{streamId}
 * Firestore에 snake_case로 저장됨
 */
export interface FirestoreUnsortedStream {
  /** 스트림 이름 */
  name: string
  /** 영상 URL */
  video_url?: string
  /** 영상 파일명 */
  video_file?: string
  /** 영상 소스 */
  video_source?: 'youtube' | 'local' | 'nas'
  /** 발행일 */
  published_at?: Timestamp
  /** 이벤트 ID (정리된 경우) */
  event_id?: string
  /** 정리 여부 */
  is_organized: boolean
  /** 정리일 */
  organized_at?: Timestamp
  /** 생성일 */
  created_at: Timestamp
  /** 수정일 */
  updated_at: Timestamp
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
  /** Unsorted streams (최상위 컬렉션, 아직 조직화되지 않은 비디오) */
  UNSORTED_STREAMS: 'streams',
  HANDS: 'hands',
  HAND_TAGS: (handId: string) => `hands/${handId}/tags`,
  PLAYERS: 'players',
  PLAYER_HANDS: (playerId: string) => `players/${playerId}/hands`,
  USERS: 'users',
  USER_NOTIFICATIONS: (userId: string) => `users/${userId}/notifications`,
  USER_BOOKMARKS: (userId: string) => `users/${userId}/bookmarks`,
  USER_TAG_HISTORY: (userId: string) => `users/${userId}/tagHistory`,
  HAND_COMMENTS: (handId: string) => `hands/${handId}/comments`,
  LIVE_REPORTS: 'liveReports',
  ANALYSIS_JOBS: 'analysisJobs',
  CATEGORIES: 'categories',
  SYSTEM_CONFIGS: 'systemConfigs',
  /** Hand likes (서브컬렉션) */
  HAND_LIKES: (handId: string) => `hands/${handId}/likes`,
  /** Data deletion requests (GDPR/CCPA) */
  DATA_DELETION_REQUESTS: 'dataDeletionRequests',
  /** Player claims (플레이어 클레임 요청) */
  PLAYER_CLAIMS: 'playerClaims',
  /** Hand edit requests (핸드 수정 요청) */
  HAND_EDIT_REQUESTS: 'handEditRequests',
  /** Admin logs (관리자 활동 로그) */
  ADMIN_LOGS: 'adminLogs',
  /** Tournament categories (카테고리 관리) */
  TOURNAMENT_CATEGORIES: 'tournamentCategories',
  /** Community posts (커뮤니티 게시글) */
  POSTS: 'posts',
  /** Post comments (게시글 댓글 서브컬렉션) */
  POST_COMMENTS: (postId: string) => `posts/${postId}/comments`,
} as const
