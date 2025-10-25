import { createClientSupabaseClient } from "./supabase-client"

/**
 * Hand Action 타입
 */
export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'

export type HandAction = {
  id: string
  hand_id: string
  player_id: string
  street: Street
  action_type: ActionType
  amount?: number
  sequence: number
  created_at: string
}

export type HandActionInput = {
  hand_id: string
  player_id: string
  street: Street
  action_type: ActionType
  amount?: number
  sequence: number
}

/**
 * 핸드의 모든 액션 조회
 */
export async function getHandActions(handId: string): Promise<HandAction[]> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('hand_actions')
      .select('*')
      .eq('hand_id', handId)
      .order('sequence', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch hand actions:', error)
    throw error
  }
}

/**
 * Street별 액션 조회
 */
export async function getHandActionsByStreet(
  handId: string,
  street: Street
): Promise<HandAction[]> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('hand_actions')
      .select('*')
      .eq('hand_id', handId)
      .eq('street', street)
      .order('sequence', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error(`Failed to fetch ${street} actions:`, error)
    throw error
  }
}

/**
 * 단일 액션 생성
 */
export async function createHandAction(action: HandActionInput): Promise<HandAction> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('hand_actions')
      .insert({
        ...action,
        amount: action.amount || 0,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to create hand action:', error)
    throw error
  }
}

/**
 * 여러 액션 일괄 생성 (트랜잭션)
 */
export async function bulkCreateHandActions(
  actions: HandActionInput[]
): Promise<HandAction[]> {
  const supabase = createClientSupabaseClient()

  try {
    const actionsWithDefaults = actions.map(action => ({
      ...action,
      amount: action.amount || 0,
    }))

    const { data, error } = await supabase
      .from('hand_actions')
      .insert(actionsWithDefaults)
      .select()

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to bulk create hand actions:', error)
    throw error
  }
}

/**
 * 액션 수정
 */
export async function updateHandAction(
  actionId: string,
  updates: Partial<HandActionInput>
): Promise<HandAction> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('hand_actions')
      .update(updates)
      .eq('id', actionId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to update hand action:', error)
    throw error
  }
}

/**
 * 액션 삭제
 */
export async function deleteHandAction(actionId: string): Promise<void> {
  const supabase = createClientSupabaseClient()

  try {
    const { error } = await supabase
      .from('hand_actions')
      .delete()
      .eq('id', actionId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to delete hand action:', error)
    throw error
  }
}

/**
 * 핸드의 모든 액션 삭제
 */
export async function deleteAllHandActions(handId: string): Promise<void> {
  const supabase = createClientSupabaseClient()

  try {
    const { error } = await supabase
      .from('hand_actions')
      .delete()
      .eq('hand_id', handId)

    if (error) throw error
  } catch (error) {
    console.error('Failed to delete all hand actions:', error)
    throw error
  }
}

/**
 * 다음 시퀀스 번호 계산
 */
export async function calculateNextSequence(
  handId: string,
  street: Street
): Promise<number> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('hand_actions')
      .select('sequence')
      .eq('hand_id', handId)
      .eq('street', street)
      .order('sequence', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (first action)
      throw error
    }

    return data ? data.sequence + 1 : 1
  } catch (error) {
    console.error('Failed to calculate next sequence:', error)
    return 1
  }
}

/**
 * 액션 시퀀스 유효성 검증
 */
export function validateActionSequence(actions: HandAction[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Street별로 그룹화
  const streetGroups: Record<Street, HandAction[]> = {
    preflop: [],
    flop: [],
    turn: [],
    river: [],
  }

  actions.forEach(action => {
    streetGroups[action.street].push(action)
  })

  // 각 Street별 검증
  Object.entries(streetGroups).forEach(([street, streetActions]) => {
    if (streetActions.length === 0) return

    // 시퀀스 번호 정렬 확인
    const sequences = streetActions.map(a => a.sequence).sort((a, b) => a - b)
    const expectedSequences = Array.from({ length: sequences.length }, (_, i) => i + 1)

    if (JSON.stringify(sequences) !== JSON.stringify(expectedSequences)) {
      errors.push(`${street}: Invalid sequence numbers`)
    }

    // 액션 타입 규칙 검증
    streetActions.forEach((action, index) => {
      // fold/check은 금액이 0이어야 함
      if (['fold', 'check'].includes(action.action_type) && action.amount !== 0) {
        errors.push(`${street} action ${index + 1}: fold/check must have amount 0`)
      }

      // bet/raise/all-in은 금액이 있어야 함
      if (
        ['bet', 'raise', 'all-in'].includes(action.action_type) &&
        (!action.amount || action.amount <= 0)
      ) {
        errors.push(`${street} action ${index + 1}: bet/raise/all-in must have positive amount`)
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 액션 시퀀스 재정렬 (드래그앤드롭 후)
 */
export async function reorderHandActions(
  handId: string,
  street: Street,
  newOrder: string[] // action IDs in new order
): Promise<void> {
  const supabase = createClientSupabaseClient()

  try {
    // 각 액션의 시퀀스 번호 업데이트
    const updates = newOrder.map((actionId, index) => ({
      id: actionId,
      sequence: index + 1,
    }))

    // 일괄 업데이트 (upsert 사용)
    for (const update of updates) {
      const { error } = await supabase
        .from('hand_actions')
        .update({ sequence: update.sequence })
        .eq('id', update.id)
        .eq('hand_id', handId)
        .eq('street', street)

      if (error) throw error
    }
  } catch (error) {
    console.error('Failed to reorder hand actions:', error)
    throw error
  }
}
