/**
 * OCR (Optical Character Recognition) 관련 타입 정의
 * Hand History Extraction System에서 사용
 */

// ==================== OCR Region Types ====================

/**
 * OCR 영역 좌표 정보
 * 픽셀 좌표와 퍼센트 좌표를 모두 저장하여 다양한 해상도에 대응
 */
export interface Region {
  /** X 좌표 (픽셀) */
  x: number
  /** Y 좌표 (픽셀) */
  y: number
  /** 너비 (픽셀) */
  width: number
  /** 높이 (픽셀) */
  height: number
  /** X 좌표 (퍼센트, 0-100) */
  x_percent: number
  /** Y 좌표 (퍼센트, 0-100) */
  y_percent: number
  /** 너비 (퍼센트, 0-100) */
  width_percent: number
  /** 높이 (퍼센트, 0-100) */
  height_percent: number
}

/**
 * OCR 영역 설정
 * player: 플레이어 카드 영역
 * board: 보드 카드 + 팟 크기 영역
 */
export interface OcrRegions {
  player: Region
  board: Region
}

// ==================== OCR Data Types ====================

/**
 * OCR로 추출한 플레이어 영역 데이터
 */
export interface OcrPlayerData {
  /** OCR 원본 텍스트 */
  raw: string
  /** 추출된 카드 (예: ["As", "Ah"]) */
  cards: string[]
  /** 추출된 스택 크기 */
  stack: number | null
}

/**
 * OCR로 추출한 보드 영역 데이터
 */
export interface OcrBoardData {
  /** OCR 원본 텍스트 */
  raw: string
  /** 추출된 보드 카드 (예: ["Ah", "Kh", "Qh"]) */
  cards: string[]
  /** 추출된 팟 크기 */
  pot: number | null
}

/**
 * 단일 프레임의 OCR 데이터
 */
export interface OcrData {
  /** 프레임 번호 (1부터 시작) */
  frameNumber: number
  /** 타임스탬프 (예: "00:05:11") */
  timestamp: string
  /** 타임스탬프 (초) */
  timestampSeconds: number
  /** 플레이어 영역 OCR 데이터 */
  player: OcrPlayerData
  /** 보드 영역 OCR 데이터 */
  board: OcrBoardData
}

// ==================== Frame Types ====================

/**
 * 영상에서 추출한 단일 프레임
 */
export interface Frame {
  /** 프레임 번호 (1부터 시작) */
  number: number
  /** 타임스탬프 (예: "00:05:11") */
  timestamp: string
  /** 타임스탬프 (초) */
  timestampSeconds: number
  /** JPEG 이미지 데이터 (Buffer) */
  buffer: Buffer
  /** 프레임 너비 (픽셀) */
  width: number
  /** 프레임 높이 (픽셀) */
  height: number
}

// ==================== Vision Analysis Types ====================

/**
 * Claude Vision 분석 결과 - 단일 액션
 */
export interface VisionAction {
  /** 프레임 번호 */
  frameNumber: number
  /** 플레이어 이름 */
  playerName: string
  /** Street (preflop, flop, turn, river) */
  street: 'preflop' | 'flop' | 'turn' | 'river'
  /** 액션 타입 */
  actionType: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
  /** 액션 금액 (optional) */
  amount?: number
  /** 타임스탬프 */
  timestamp: string
  /** 신뢰도 (0-1) */
  confidence: number
  /** 시퀀스 번호 (최종 병합 시 부여) */
  sequenceNumber?: number
}

/**
 * Claude Vision 분석 결과 - 보드 카드
 */
export interface VisionBoardCards {
  flop: {
    cards: string[]
    frameNumber: number
    timestamp: string
  } | null
  turn: {
    cards: string[]
    frameNumber: number
    timestamp: string
  } | null
  river: {
    cards: string[]
    frameNumber: number
    timestamp: string
  } | null
}

/**
 * Claude Vision 분석 결과 - 홀카드
 */
export interface VisionHoleCards {
  playerName: string
  cards: string[]
  frameNumber: number
  showdownFrame: boolean
}

/**
 * Claude Vision 분석 결과 - 승자
 */
export interface VisionWinner {
  playerName: string
  winAmount: number
  frameNumber: number
}

/**
 * Claude Vision 배치 분석 결과
 */
export interface VisionBatchResult {
  /** 배치 번호 (0부터 시작) */
  batchNumber: number
  /** 추출된 액션 목록 */
  actions: VisionAction[]
  /** 보드 카드 */
  boardCards: VisionBoardCards
  /** 홀카드 목록 */
  holeCards: VisionHoleCards[]
  /** 승자 정보 */
  winner: VisionWinner | null
  /** 관찰 내용 (텍스트) */
  observations: string
}

// ==================== Hand History Types ====================

/**
 * 최종 핸드 히스토리 (ai_extracted_data)
 */
export interface HandHistory {
  /** 핸드 번호 (예: "001") */
  handNumber: string
  /** 간단한 설명 */
  description: string
  /** 최종 팟 크기 */
  potSize: number
  /** 보드 카드 */
  boardCards: {
    flop: string[]
    turn: string[]
    river: string[]
  }
  /** 플레이어 정보 */
  players: HandHistoryPlayer[]
  /** 액션 목록 (시간 순) */
  actions: HandHistoryAction[]
  /** 메타데이터 */
  metadata: HandHistoryMetadata
}

/**
 * 핸드 히스토리 - 플레이어 정보
 */
export interface HandHistoryPlayer {
  /** 플레이어 이름 */
  name: string
  /** 포지션 (BTN, SB, BB, UTG, MP, CO 등) */
  position: string
  /** 스택 크기 */
  stackSize: number
  /** 홀카드 (예: "As Ad") */
  holeCards?: string
  /** 승자 여부 */
  isWinner: boolean
  /** 승리 금액 */
  winAmount?: number
}

/**
 * 핸드 히스토리 - 액션
 */
export interface HandHistoryAction {
  /** 플레이어 이름 */
  playerName: string
  /** Street */
  street: 'preflop' | 'flop' | 'turn' | 'river'
  /** 액션 타입 */
  actionType: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
  /** 액션 금액 */
  amount?: number
  /** 시퀀스 번호 (1부터 시작) */
  sequenceNumber: number
  /** 타임스탬프 */
  timestamp: string
}

/**
 * 핸드 히스토리 - 메타데이터
 */
export interface HandHistoryMetadata {
  /** 프레임 개수 */
  frameCount: number
  /** OCR 정확도 (0-1) */
  ocrAccuracy: number
  /** Vision 배치 개수 */
  visionBatches: number
  /** 추출 소요 시간 (밀리초) */
  extractionDuration: number
  /** 총 비용 (USD) */
  totalCost: number
}

// ==================== Batch API Types ====================

/**
 * Claude Batch API 요청
 */
export interface BatchRequest {
  custom_id: string
  params: {
    model: string
    max_tokens: number
    messages: Array<{
      role: 'user' | 'assistant'
      content: Array<
        | { type: 'text'; text: string }
        | {
            type: 'image'
            source: {
              type: 'base64'
              media_type: 'image/jpeg' | 'image/png'
              data: string
            }
          }
      >
    }>
  }
}

/**
 * Claude Batch API 진행 상태
 */
export interface BatchProgress {
  /** 처리된 요청 수 */
  processed: number
  /** 전체 요청 수 */
  total: number
  /** 진행률 (0-100) */
  percentage: number
}

/**
 * Claude Batch API 상태
 */
export type BatchStatus =
  | 'processing'
  | 'ended'
  | 'canceling'
  | 'canceled'
  | 'errored'

// ==================== Component Props Types ====================

/**
 * VideoPlayerOcrOverlay 컴포넌트 Props
 */
export interface VideoPlayerOcrOverlayProps {
  /** 비디오 너비 (픽셀) */
  videoWidth: number
  /** 비디오 높이 (픽셀) */
  videoHeight: number
  /** 초기 OCR 영역 (수정 모드) */
  initialRegions?: OcrRegions
  /** 영역 설정 완료 콜백 */
  onRegionsSet: (regions: OcrRegions) => void
  /** 취소 콜백 */
  onCancel: () => void
}

/**
 * OcrSetupDialog 컴포넌트 Props
 */
export interface OcrSetupDialogProps {
  /** 열림 상태 */
  open: boolean
  /** 열림 상태 변경 콜백 */
  onOpenChange: (open: boolean) => void
  /** Timecode Submission ID */
  submissionId: string
  /** 스트림 비디오 URL */
  videoUrl: string
  /** 초기 OCR 영역 */
  initialRegions?: OcrRegions
  /** 저장 성공 콜백 */
  onSuccess?: () => void
}

// ==================== Helper Type Guards ====================

/**
 * Region 타입 가드
 */
export function isRegion(obj: unknown): obj is Region {
  if (typeof obj !== 'object' || obj === null) return false

  const region = obj as Record<string, unknown>

  return (
    typeof region.x === 'number' &&
    typeof region.y === 'number' &&
    typeof region.width === 'number' &&
    typeof region.height === 'number' &&
    typeof region.x_percent === 'number' &&
    typeof region.y_percent === 'number' &&
    typeof region.width_percent === 'number' &&
    typeof region.height_percent === 'number' &&
    region.x >= 0 &&
    region.y >= 0 &&
    region.width > 0 &&
    region.height > 0 &&
    region.x_percent >= 0 &&
    region.x_percent <= 100 &&
    region.y_percent >= 0 &&
    region.y_percent <= 100 &&
    region.width_percent > 0 &&
    region.width_percent <= 100 &&
    region.height_percent > 0 &&
    region.height_percent <= 100
  )
}

/**
 * OcrRegions 타입 가드
 */
export function isOcrRegions(obj: unknown): obj is OcrRegions {
  if (typeof obj !== 'object' || obj === null) return false

  const regions = obj as Record<string, unknown>

  return isRegion(regions.player) && isRegion(regions.board)
}

// ==================== Initial Values ====================

/**
 * Region 초기값 생성
 */
export function createInitialRegion(
  x: number,
  y: number,
  width: number,
  height: number,
  videoWidth: number,
  videoHeight: number
): Region {
  return {
    x,
    y,
    width,
    height,
    x_percent: (x / videoWidth) * 100,
    y_percent: (y / videoHeight) * 100,
    width_percent: (width / videoWidth) * 100,
    height_percent: (height / videoHeight) * 100,
  }
}

/**
 * OcrRegions 기본값 생성 (1280x720 비디오 기준)
 */
export function createDefaultOcrRegions(
  videoWidth: number = 1280,
  videoHeight: number = 720
): OcrRegions {
  return {
    // 플레이어 카드 영역 (왼쪽 하단, 예시)
    player: createInitialRegion(100, 500, 300, 150, videoWidth, videoHeight),
    // 보드 + 팟 영역 (중앙 상단, 예시)
    board: createInitialRegion(400, 100, 480, 200, videoWidth, videoHeight),
  }
}
