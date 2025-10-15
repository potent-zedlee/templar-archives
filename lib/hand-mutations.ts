import { supabase } from "./supabase"

/**
 * 핸드 기본 정보 업데이트
 */
export async function updateHandBasicInfo(
  handId: string,
  data: {
    number?: string
    description?: string
    timestamp?: string
    pot_size?: number
    board_cards?: string
  }
) {
  try {
    const { error } = await supabase
      .from('hands')
      .update(data)
      .eq('id', handId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('핸드 정보 업데이트 실패:', error)
    throw error
  }
}

/**
 * 플레이어 정보 업데이트 (hand_players 테이블)
 */
export async function updateHandPlayer(
  handPlayerId: string,
  data: {
    position?: string
    cards?: string
    starting_stack?: number
    ending_stack?: number
  }
) {
  try {
    const { error } = await supabase
      .from('hand_players')
      .update(data)
      .eq('id', handPlayerId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('플레이어 정보 업데이트 실패:', error)
    throw error
  }
}

/**
 * 여러 플레이어 정보를 한 번에 업데이트
 */
export async function updateHandPlayers(
  handId: string,
  players: Array<{
    id: string // hand_player_id
    position?: string
    cards?: string
    starting_stack?: number
    ending_stack?: number
  }>
) {
  try {
    // 각 플레이어에 대해 순차적으로 업데이트
    for (const player of players) {
      const { id, ...data } = player
      await updateHandPlayer(id, data)
    }
    return { success: true }
  } catch (error) {
    console.error('플레이어 정보 일괄 업데이트 실패:', error)
    throw error
  }
}

/**
 * 핸드 액션 추가
 */
export async function addHandAction(data: {
  hand_id: string
  player_id: string
  street: 'preflop' | 'flop' | 'turn' | 'river'
  action_type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
  amount?: number
  sequence: number
}) {
  try {
    const { error } = await supabase
      .from('hand_actions')
      .insert(data)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('액션 추가 실패:', error)
    throw error
  }
}

/**
 * 핸드 액션 삭제
 */
export async function deleteHandActions(handId: string) {
  try {
    const { error } = await supabase
      .from('hand_actions')
      .delete()
      .eq('hand_id', handId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('액션 삭제 실패:', error)
    throw error
  }
}

/**
 * 핸드 액션 일괄 업데이트 (기존 삭제 후 새로 추가)
 */
export async function updateHandActions(
  handId: string,
  actions: Array<{
    player_id: string
    street: 'preflop' | 'flop' | 'turn' | 'river'
    action_type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
    amount?: number
    sequence: number
  }>
) {
  try {
    // 1. 기존 액션 삭제
    await deleteHandActions(handId)

    // 2. 새 액션 추가
    if (actions.length > 0) {
      const actionsWithHandId = actions.map(action => ({
        ...action,
        hand_id: handId,
      }))

      const { error } = await supabase
        .from('hand_actions')
        .insert(actionsWithHandId)

      if (error) throw error
    }

    return { success: true }
  } catch (error) {
    console.error('액션 일괄 업데이트 실패:', error)
    throw error
  }
}

/**
 * 핸드 전체 정보 업데이트 (트랜잭션처럼 동작)
 */
export async function updateHandComplete(
  handId: string,
  data: {
    basicInfo?: {
      number?: string
      description?: string
      timestamp?: string
      pot_size?: number
      board_cards?: string
    }
    players?: Array<{
      id: string
      position?: string
      cards?: string
      starting_stack?: number
      ending_stack?: number
    }>
    actions?: Array<{
      player_id: string
      street: 'preflop' | 'flop' | 'turn' | 'river'
      action_type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
      amount?: number
      sequence: number
    }>
  }
) {
  try {
    // 1. 기본 정보 업데이트
    if (data.basicInfo) {
      await updateHandBasicInfo(handId, data.basicInfo)
    }

    // 2. 플레이어 정보 업데이트
    if (data.players && data.players.length > 0) {
      await updateHandPlayers(handId, data.players)
    }

    // 3. 액션 정보 업데이트
    if (data.actions) {
      await updateHandActions(handId, data.actions)
    }

    return { success: true }
  } catch (error) {
    console.error('핸드 전체 업데이트 실패:', error)
    throw error
  }
}

/**
 * 핸드 삭제
 */
export async function deleteHand(handId: string) {
  try {
    const { error } = await supabase
      .from('hands')
      .delete()
      .eq('id', handId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('핸드 삭제 실패:', error)
    throw error
  }
}
