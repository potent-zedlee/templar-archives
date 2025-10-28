/**
 * Hand History Builder
 *
 * VisionBatchResult를 병합하여 최종 HandHistory 생성
 */

import type {
  HandHistory,
  HandHistoryPlayer,
  HandHistoryAction,
  HandHistoryMetadata,
  VisionBatchResult,
  VisionAction,
  VisionHoleCards,
} from '@/lib/types/ocr'

/**
 * 여러 배치 결과를 단일 핸드 히스토리로 병합
 */
export function mergeVisionBatchResults(
  batchResults: VisionBatchResult[]
): {
  actions: VisionAction[]
  boardCards: { flop: string[]; turn: string[]; river: string[] }
  holeCards: VisionHoleCards[]
  winner: { playerName: string; winAmount: number } | null
} {
  // 모든 배치의 액션 수집 및 정렬
  const allActions = batchResults
    .flatMap((batch) => batch.actions)
    .sort((a, b) => a.frameNumber - b.frameNumber)

  // 시퀀스 번호 부여
  allActions.forEach((action, index) => {
    action.sequenceNumber = index + 1
  })

  // 보드 카드 병합 (가장 늦게 발견된 것 사용)
  let flop = batchResults.find((b) => b.boardCards.flop)?.boardCards.flop
  let turn = batchResults.find((b) => b.boardCards.turn)?.boardCards.turn
  let river = batchResults.find((b) => b.boardCards.river)?.boardCards.river

  // 홀카드 병합 (중복 제거)
  const holeCardsMap = new Map<string, VisionHoleCards>()
  batchResults.forEach((batch) => {
    batch.holeCards.forEach((hc) => {
      holeCardsMap.set(hc.playerName, hc)
    })
  })
  const allHoleCards = Array.from(holeCardsMap.values())

  // 승자 정보 (가장 마지막 배치에서)
  const winner = batchResults[batchResults.length - 1]?.winner || null

  return {
    actions: allActions,
    boardCards: {
      flop: flop?.cards || [],
      turn: turn?.cards || [],
      river: river?.cards || [],
    },
    holeCards: allHoleCards,
    winner,
  }
}

/**
 * 플레이어 포지션 추정 (액션 순서 기반)
 */
export function estimatePlayerPosition(
  playerName: string,
  allActions: VisionAction[]
): string {
  // Preflop 액션에서 순서 찾기
  const preflopActions = allActions.filter((a) => a.street === 'preflop')
  const playerIndex = preflopActions.findIndex((a) => a.playerName === playerName)

  if (playerIndex === -1) return 'Unknown'

  // 간단한 포지션 추정 (6-max 기준)
  const positions = ['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN']
  return positions[playerIndex % positions.length] || 'Unknown'
}

/**
 * HandHistory 생성
 */
export function buildHandHistory(
  batchResults: VisionBatchResult[],
  metadata: {
    frameCount: number
    ocrAccuracy: number
    visionBatches: number
    extractionDuration: number
    totalCost: number
  }
): HandHistory {
  const merged = mergeVisionBatchResults(batchResults)

  // 플레이어 목록 생성
  const playerMap = new Map<string, HandHistoryPlayer>()

  // 액션에서 플레이어 추출
  merged.actions.forEach((action) => {
    if (!playerMap.has(action.playerName)) {
      playerMap.set(action.playerName, {
        name: action.playerName,
        position: estimatePlayerPosition(action.playerName, merged.actions),
        stackSize: 0, // OCR 데이터에서 가져오거나 기본값
        isWinner: false,
        winAmount: 0,
      })
    }
  })

  // 홀카드 추가
  merged.holeCards.forEach((hc) => {
    const player = playerMap.get(hc.playerName)
    if (player) {
      player.holeCards = hc.cards.join(' ')
    }
  })

  // 승자 정보 추가
  if (merged.winner) {
    const winner = playerMap.get(merged.winner.playerName)
    if (winner) {
      winner.isWinner = true
      winner.winAmount = merged.winner.winAmount
    }
  }

  // 최종 팟 크기 계산 (모든 액션의 금액 합)
  const potSize = merged.actions.reduce((sum, action) => {
    return sum + (action.amount || 0)
  }, 0)

  // HandHistory 액션 변환
  const actions: HandHistoryAction[] = merged.actions.map((action) => ({
    playerName: action.playerName,
    street: action.street,
    actionType: action.actionType,
    amount: action.amount,
    sequenceNumber: action.sequenceNumber!,
    timestamp: action.timestamp,
  }))

  // 메타데이터
  const historyMetadata: HandHistoryMetadata = {
    frameCount: metadata.frameCount,
    ocrAccuracy: metadata.ocrAccuracy,
    visionBatches: metadata.visionBatches,
    extractionDuration: metadata.extractionDuration,
    totalCost: metadata.totalCost,
  }

  // 설명 생성
  const description = generateHandDescription(
    Array.from(playerMap.values()),
    merged.boardCards,
    merged.winner
  )

  return {
    handNumber: '001', // 기본값, API에서 업데이트
    description,
    potSize,
    boardCards: merged.boardCards,
    players: Array.from(playerMap.values()),
    actions,
    metadata: historyMetadata,
  }
}

/**
 * 핸드 설명 생성
 */
function generateHandDescription(
  players: HandHistoryPlayer[],
  boardCards: { flop: string[]; turn: string[]; river: string[] },
  winner: { playerName: string; winAmount: number } | null
): string {
  const playerCount = players.length
  const winnerName = winner?.playerName || 'Unknown'
  const board = [
    ...boardCards.flop,
    ...boardCards.turn.slice(3),
    ...boardCards.river.slice(4),
  ].join(' ')

  return `${playerCount}-handed hand. Board: ${board || 'Unknown'}. Winner: ${winnerName}`
}

/**
 * HandHistory 검증
 */
export function validateHandHistory(handHistory: HandHistory): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 플레이어 체크
  if (handHistory.players.length === 0) {
    errors.push('No players found')
  }

  // 액션 체크
  if (handHistory.actions.length === 0) {
    errors.push('No actions found')
  }

  // 보드 카드 체크
  const totalBoardCards =
    handHistory.boardCards.flop.length +
    handHistory.boardCards.turn.length +
    handHistory.boardCards.river.length

  if (totalBoardCards === 0) {
    errors.push('No board cards found')
  }

  // 승자 체크
  const hasWinner = handHistory.players.some((p) => p.isWinner)
  if (!hasWinner) {
    errors.push('No winner found')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 비용 계산 (Claude Vision Batch API)
 */
export function calculateVisionCost(
  frameCount: number,
  batchCount: number
): {
  inputTokens: number
  outputTokens: number
  totalCost: number
  costPerFrame: number
} {
  // 이미지당 입력 토큰 추정 (1280x720 JPEG ≈ 1,600 tokens)
  const tokensPerImage = 1600

  // 배치당 출력 토큰 추정 (4,000 max)
  const outputTokensPerBatch = 4000

  // 총 토큰
  const inputTokens = frameCount * tokensPerImage
  const outputTokens = batchCount * outputTokensPerBatch

  // 비용 계산 (claude-3-5-sonnet-20241022 Batch API)
  // Input: $1.50 / 1M tokens
  // Output: $7.50 / 1M tokens
  const inputCost = (inputTokens / 1000000) * 1.5
  const outputCost = (outputTokens / 1000000) * 7.5

  const totalCost = inputCost + outputCost
  const costPerFrame = totalCost / frameCount

  return {
    inputTokens,
    outputTokens,
    totalCost,
    costPerFrame,
  }
}
