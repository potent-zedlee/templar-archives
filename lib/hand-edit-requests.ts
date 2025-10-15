import { createClientSupabaseClient } from './supabase-client'

export type EditType = 'basic_info' | 'players' | 'actions' | 'board'
export type EditRequestStatus = 'pending' | 'approved' | 'rejected'

export type HandEditRequest = {
  id: string
  hand_id: string
  requester_id: string
  requester_name: string
  edit_type: EditType
  original_data: any
  proposed_data: any
  reason: string
  status: EditRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_comment: string | null
  created_at: string
}

/**
 * 핸드 수정 요청 생성
 */
export async function createEditRequest({
  handId,
  requesterId,
  requesterName,
  editType,
  originalData,
  proposedData,
  reason
}: {
  handId: string
  requesterId: string
  requesterName: string
  editType: EditType
  originalData: any
  proposedData: any
  reason: string
}) {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('hand_edit_requests')
    .insert({
      hand_id: handId,
      requester_id: requesterId,
      requester_name: requesterName,
      edit_type: editType,
      original_data: originalData,
      proposed_data: proposedData,
      reason,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 수정 요청 목록 조회 (관리자)
 */
export async function fetchEditRequests({
  status,
  limit = 50
}: {
  status?: EditRequestStatus
  limit?: number
} = {}) {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('hand_edit_requests')
    .select(`
      id,
      hand_id,
      requester_id,
      requester_name,
      edit_type,
      original_data,
      proposed_data,
      reason,
      status,
      reviewed_by,
      reviewed_at,
      admin_comment,
      created_at,
      hand:hand_id (
        id,
        number,
        description,
        day:day_id (
          name,
          sub_event:sub_event_id (
            name,
            tournament:tournament_id (
              name
            )
          )
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * 사용자별 수정 요청 조회
 */
export async function fetchUserEditRequests({
  userId,
  status,
  limit = 20
}: {
  userId: string
  status?: EditRequestStatus
  limit?: number
}) {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('hand_edit_requests')
    .select(`
      id,
      hand_id,
      edit_type,
      original_data,
      proposed_data,
      reason,
      status,
      reviewed_at,
      admin_comment,
      created_at,
      hand:hand_id (
        id,
        number,
        description,
        day:day_id (
          name,
          sub_event:sub_event_id (
            name,
            tournament:tournament_id (
              name
            )
          )
        )
      )
    `)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * 수정 요청 승인 및 핸드 데이터 적용
 */
export async function approveEditRequest({
  requestId,
  adminId,
  adminComment
}: {
  requestId: string
  adminId: string
  adminComment?: string
}) {
  const supabase = createClientSupabaseClient()

  // 1. Get request details
  const { data: request, error: fetchError } = await supabase
    .from('hand_edit_requests')
    .select('hand_id, edit_type, proposed_data')
    .eq('id', requestId)
    .single()

  if (fetchError) throw fetchError

  // 2. Apply edits to hand based on edit_type
  await applyEditToHand(request.hand_id, request.edit_type, request.proposed_data)

  // 3. Update request status
  const { data, error } = await supabase
    .from('hand_edit_requests')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      admin_comment: adminComment || null
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 수정 요청 거부
 */
export async function rejectEditRequest({
  requestId,
  adminId,
  adminComment
}: {
  requestId: string
  adminId: string
  adminComment?: string
}) {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('hand_edit_requests')
    .update({
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      admin_comment: adminComment || null
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 핸드 데이터에 수정사항 적용
 */
async function applyEditToHand(
  handId: string,
  editType: EditType,
  proposedData: any
) {
  const supabase = createClientSupabaseClient()

  switch (editType) {
    case 'basic_info':
      // Update hand basic info (description, timestamp, etc.)
      const { error: handError } = await supabase
        .from('hands')
        .update({
          description: proposedData.description,
          timestamp: proposedData.timestamp,
          // Add other basic fields as needed
        })
        .eq('id', handId)

      if (handError) throw handError
      break

    case 'board':
      // Update board cards and pot
      const { error: boardError } = await supabase
        .from('hands')
        .update({
          board_cards: proposedData.board_cards,
          pot_size: proposedData.pot_size
        })
        .eq('id', handId)

      if (boardError) throw boardError
      break

    case 'players':
      // Update hand_players
      // This is more complex - would need to handle player updates/additions/deletions
      // For now, just update existing players
      if (proposedData.players && Array.isArray(proposedData.players)) {
        for (const player of proposedData.players) {
          if (player.id) {
            const { error: playerError } = await supabase
              .from('hand_players')
              .update({
                position: player.position,
                cards: player.cards,
                starting_stack: player.starting_stack,
                ending_stack: player.ending_stack
              })
              .eq('id', player.id)

            if (playerError) throw playerError
          }
        }
      }
      break

    case 'actions':
      // Update hand_actions
      // This would typically involve deleting old actions and inserting new ones
      // For simplicity, we'll skip this for now
      // In a real implementation, you'd want to:
      // 1. Delete existing actions for this hand
      // 2. Insert new actions from proposedData
      break
  }
}

/**
 * 핸드 데이터 가져오기 (수정 요청용)
 */
export async function getHandDataForEdit(handId: string) {
  const supabase = createClientSupabaseClient()

  const { data: hand, error: handError } = await supabase
    .from('hands')
    .select(`
      id,
      number,
      description,
      timestamp,
      board_cards,
      pot_size,
      day:day_id (
        name,
        sub_event:sub_event_id (
          name,
          tournament:tournament_id (
            name
          )
        )
      )
    `)
    .eq('id', handId)
    .single()

  if (handError) throw handError

  const { data: players, error: playersError } = await supabase
    .from('hand_players')
    .select(`
      id,
      position,
      cards,
      starting_stack,
      ending_stack,
      player:player_id (
        id,
        name
      )
    `)
    .eq('hand_id', handId)

  if (playersError) throw playersError

  return {
    hand,
    players: players || []
  }
}
