import { supabase } from "./supabase"

/**
 * 플레이어 통계 타입
 */
export type PlayerStatistics = {
  vpip: number // Voluntarily Put In Pot (%)
  pfr: number // Pre-Flop Raise (%)
  threeBet: number // 3Bet (%)
  ats: number // Attempt To Steal (%)
  winRate: number // Win Rate (%)
  avgPotSize: number // Average Pot Size
  showdownWinRate: number // Showdown Win %
  totalHands: number // Total hands played
  handsWon: number // Total hands won
}

/**
 * 플레이어의 모든 액션 가져오기
 */
export async function fetchPlayerActions(playerId: string) {
  try {
    const { data, error } = await supabase
      .from('hand_actions')
      .select('*')
      .eq('player_id', playerId)
      .order('hand_id, sequence')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('플레이어 액션 조회 실패:', error)
    return []
  }
}

/**
 * 플레이어가 참여한 모든 핸드 정보 가져오기
 */
export async function fetchPlayerHandsInfo(playerId: string) {
  try {
    const { data, error } = await supabase
      .from('hand_players')
      .select(`
        *,
        hands!inner(id, pot_size)
      `)
      .eq('player_id', playerId)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('플레이어 핸드 정보 조회 실패:', error)
    return []
  }
}

/**
 * VPIP 계산 (Voluntarily Put In Pot)
 * 프리플롭에서 자발적으로 칩을 넣은 비율
 */
export function calculateVPIP(actions: any[]): number {
  if (actions.length === 0) return 0

  // 프리플롭 액션만 필터
  const preflopActions = actions.filter(a => a.street === 'preflop')

  // 핸드별로 그룹화
  const handActionsMap = new Map<string, any[]>()
  preflopActions.forEach(action => {
    if (!handActionsMap.has(action.hand_id)) {
      handActionsMap.set(action.hand_id, [])
    }
    handActionsMap.get(action.hand_id)!.push(action)
  })

  let vpipCount = 0
  const totalHands = handActionsMap.size

  // 각 핸드에서 VPIP 여부 확인
  handActionsMap.forEach((handActions) => {
    // Call, Bet, Raise 액션이 있으면 VPIP
    const hasVPIP = handActions.some(a =>
      ['call', 'bet', 'raise', 'all-in'].includes(a.action_type)
    )
    if (hasVPIP) vpipCount++
  })

  return totalHands > 0 ? Math.round((vpipCount / totalHands) * 100) : 0
}

/**
 * PFR 계산 (Pre-Flop Raise)
 * 프리플롭에서 레이즈한 비율
 */
export function calculatePFR(actions: any[]): number {
  if (actions.length === 0) return 0

  const preflopActions = actions.filter(a => a.street === 'preflop')
  const handActionsMap = new Map<string, any[]>()

  preflopActions.forEach(action => {
    if (!handActionsMap.has(action.hand_id)) {
      handActionsMap.set(action.hand_id, [])
    }
    handActionsMap.get(action.hand_id)!.push(action)
  })

  let pfrCount = 0
  const totalHands = handActionsMap.size

  handActionsMap.forEach((handActions) => {
    // Raise 액션이 있으면 PFR
    const hasPFR = handActions.some(a =>
      ['raise', 'bet'].includes(a.action_type) && a.amount && a.amount > 0
    )
    if (hasPFR) pfrCount++
  })

  return totalHands > 0 ? Math.round((pfrCount / totalHands) * 100) : 0
}

/**
 * 3BET 계산
 * 프리플롭에서 3벳한 비율
 */
export function calculate3Bet(actions: any[]): number {
  if (actions.length === 0) return 0

  const preflopActions = actions.filter(a => a.street === 'preflop')
  const handActionsMap = new Map<string, any[]>()

  preflopActions.forEach(action => {
    if (!handActionsMap.has(action.hand_id)) {
      handActionsMap.set(action.hand_id, [])
    }
    handActionsMap.get(action.hand_id)!.push(action)
  })

  let threeBetCount = 0
  let threeBetOpportunities = 0

  handActionsMap.forEach((handActions) => {
    // 액션을 시퀀스 순서로 정렬
    handActions.sort((a, b) => a.sequence - b.sequence)

    // 레이즈가 있는 핸드만 3벳 기회가 있음
    const hasRaise = handActions.some(a => ['raise', 'bet'].includes(a.action_type))
    if (!hasRaise) return

    threeBetOpportunities++

    // 두 번째 레이즈가 있으면 3벳
    let raiseCount = 0
    for (const action of handActions) {
      if (['raise', 'bet'].includes(action.action_type)) {
        raiseCount++
        if (raiseCount >= 2) {
          threeBetCount++
          break
        }
      }
    }
  })

  return threeBetOpportunities > 0
    ? Math.round((threeBetCount / threeBetOpportunities) * 100)
    : 0
}

/**
 * ATS 계산 (Attempt To Steal)
 * BTN/CO/SB에서 스틸 시도 비율
 */
export function calculateATS(actions: any[], handPlayersData: any[]): number {
  if (actions.length === 0 || handPlayersData.length === 0) return 0

  // 포지션별 hand_player 데이터 매핑
  const positionMap = new Map<string, string>()
  handPlayersData.forEach(hp => {
    positionMap.set(hp.hand_id, hp.position)
  })

  const preflopActions = actions.filter(a => a.street === 'preflop')
  const handActionsMap = new Map<string, any[]>()

  preflopActions.forEach(action => {
    if (!handActionsMap.has(action.hand_id)) {
      handActionsMap.set(action.hand_id, [])
    }
    handActionsMap.get(action.hand_id)!.push(action)
  })

  let stealAttempts = 0
  let stealOpportunities = 0

  handActionsMap.forEach((handActions, handId) => {
    const position = positionMap.get(handId)

    // BTN, CO, SB 포지션만 스틸 기회
    if (!['BTN', 'CO', 'SB'].includes(position || '')) return

    stealOpportunities++

    // 첫 번째 레이즈가 있으면 스틸 시도
    handActions.sort((a, b) => a.sequence - b.sequence)
    const firstAction = handActions.find(a =>
      ['raise', 'bet'].includes(a.action_type)
    )

    if (firstAction) stealAttempts++
  })

  return stealOpportunities > 0
    ? Math.round((stealAttempts / stealOpportunities) * 100)
    : 0
}

/**
 * 승률 계산
 */
export function calculateWinRate(handPlayersData: any[]): number {
  if (handPlayersData.length === 0) return 0

  const totalHands = handPlayersData.length

  // 스택이 증가한 핸드 = 이긴 핸드
  const handsWon = handPlayersData.filter(hp => {
    const stackChange = (hp.ending_stack || 0) - (hp.starting_stack || 0)
    return stackChange > 0
  }).length

  return totalHands > 0 ? Math.round((handsWon / totalHands) * 100) : 0
}

/**
 * 평균 팟 크기 계산
 */
export function calculateAvgPotSize(handPlayersData: any[]): number {
  if (handPlayersData.length === 0) return 0

  const potSizes = handPlayersData
    .map(hp => hp.hands?.pot_size || 0)
    .filter(size => size > 0)

  if (potSizes.length === 0) return 0

  const sum = potSizes.reduce((acc, size) => acc + size, 0)
  return Math.round(sum / potSizes.length)
}

/**
 * 플레이 스타일 타입
 */
export type PlayStyle = 'TAG' | 'LAG' | 'Tight' | 'Loose' | 'Unknown'

/**
 * 플레이 스타일 분류
 *
 * TAG (Tight Aggressive): VPIP < 25%, PFR > 15%
 * LAG (Loose Aggressive): VPIP > 25%, PFR > 15%
 * Tight (Tight Passive): VPIP < 25%, PFR < 15%
 * Loose (Loose Passive): VPIP > 25%, PFR < 15%
 */
export function classifyPlayStyle(vpip: number, pfr: number, totalHands: number): PlayStyle {
  // 충분한 샘플이 없으면 Unknown
  if (totalHands < 20) {
    return 'Unknown'
  }

  const isLoose = vpip > 25
  const isAggressive = pfr > 15

  if (isLoose && isAggressive) return 'LAG'
  if (isLoose && !isAggressive) return 'Loose'
  if (!isLoose && isAggressive) return 'TAG'
  if (!isLoose && !isAggressive) return 'Tight'

  return 'Unknown'
}

/**
 * 플레이 스타일 설명
 */
export function getPlayStyleDescription(style: PlayStyle): string {
  switch (style) {
    case 'TAG':
      return '타이트 어그레시브 - 좋은 핸드만 플레이하며 공격적으로 플레이합니다.'
    case 'LAG':
      return '루즈 어그레시브 - 많은 핸드를 플레이하며 공격적입니다.'
    case 'Tight':
      return '타이트 패시브 - 좋은 핸드만 플레이하지만 소극적입니다.'
    case 'Loose':
      return '루즈 패시브 - 많은 핸드를 플레이하지만 소극적입니다.'
    default:
      return '충분한 데이터가 없습니다.'
  }
}

/**
 * 플레이 스타일 색상
 */
export function getPlayStyleColor(style: PlayStyle): string {
  switch (style) {
    case 'TAG':
      return 'text-green-600 dark:text-green-400'
    case 'LAG':
      return 'text-blue-600 dark:text-blue-400'
    case 'Tight':
      return 'text-gray-600 dark:text-gray-400'
    case 'Loose':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * 포지션별 통계
 */
export type PositionStats = {
  position: string
  hands: number
  vpip: number
  pfr: number
  winRate: number
}

/**
 * 포지션별 통계 계산
 */
export async function calculatePositionStats(playerId: string): Promise<PositionStats[]> {
  try {
    const [actions, handPlayersData] = await Promise.all([
      fetchPlayerActions(playerId),
      fetchPlayerHandsInfo(playerId),
    ])

    // 포지션별로 그룹화
    const positionGroups: Record<string, { actions: any[], handPlayers: any[] }> = {}

    handPlayersData.forEach(hp => {
      const pos = hp.position || 'Unknown'
      if (!positionGroups[pos]) {
        positionGroups[pos] = { actions: [], handPlayers: [] }
      }
      positionGroups[pos].handPlayers.push(hp)
    })

    actions.forEach(action => {
      const handPlayer = handPlayersData.find(hp => hp.hand_id === action.hand_id)
      if (handPlayer) {
        const pos = handPlayer.position || 'Unknown'
        if (positionGroups[pos]) {
          positionGroups[pos].actions.push(action)
        }
      }
    })

    // 각 포지션별 통계 계산
    const positionStats: PositionStats[] = Object.entries(positionGroups).map(([position, data]) => {
      const vpip = calculateVPIP(data.actions)
      const pfr = calculatePFR(data.actions)
      const winRate = calculateWinRate(data.handPlayers)

      return {
        position,
        hands: data.handPlayers.length,
        vpip,
        pfr,
        winRate,
      }
    })

    // 포지션 순서 정렬
    const positionOrder = ['UTG', 'UTG+1', 'MP', 'CO', 'BTN', 'SB', 'BB']
    return positionStats.sort((a, b) => {
      const aIndex = positionOrder.indexOf(a.position)
      const bIndex = positionOrder.indexOf(b.position)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  } catch (error) {
    console.error('포지션별 통계 계산 실패:', error)
    return []
  }
}

/**
 * 플레이어 전체 통계 계산
 */
export async function calculatePlayerStatistics(playerId: string): Promise<PlayerStatistics> {
  try {
    // 데이터 가져오기
    const [actions, handPlayersData] = await Promise.all([
      fetchPlayerActions(playerId),
      fetchPlayerHandsInfo(playerId),
    ])

    // 통계 계산
    const vpip = calculateVPIP(actions)
    const pfr = calculatePFR(actions)
    const threeBet = calculate3Bet(actions)
    const ats = calculateATS(actions, handPlayersData)
    const winRate = calculateWinRate(handPlayersData)
    const avgPotSize = calculateAvgPotSize(handPlayersData)

    // Showdown Win Rate (간단한 근사값 - 실제로는 더 복잡함)
    const showdownWinRate = winRate // 임시로 winRate 사용

    return {
      vpip,
      pfr,
      threeBet,
      ats,
      winRate,
      avgPotSize,
      showdownWinRate,
      totalHands: handPlayersData.length,
      handsWon: handPlayersData.filter(hp => {
        const stackChange = (hp.ending_stack || 0) - (hp.starting_stack || 0)
        return stackChange > 0
      }).length,
    }
  } catch (error) {
    console.error('플레이어 통계 계산 실패:', error)
    // 기본값 반환
    return {
      vpip: 0,
      pfr: 0,
      threeBet: 0,
      ats: 0,
      winRate: 0,
      avgPotSize: 0,
      showdownWinRate: 0,
      totalHands: 0,
      handsWon: 0,
    }
  }
}
