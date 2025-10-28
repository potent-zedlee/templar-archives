/**
 * Timecode Review API
 *
 * POST /api/timecodes/review
 * 관리자가 AI 추출된 핸드 히스토리를 검수하고 승인/거부
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { reviewHandSchema } from '@/lib/validation/timecode-schemas'
import { logError, createErrorResponse } from '@/lib/error-handler'

export const runtime = 'edge'

/**
 * 핸드 히스토리 검수 및 승인
 * POST /api/timecodes/review
 */
export async function POST(request: NextRequest) {
  try {
    // Supabase 클라이언트 생성
    const supabase = await createServerSupabaseClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // High Templar 이상 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, banned_at')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['high_templar', 'admin']
    if (userError || !userData || userData.banned_at || !allowedRoles.includes(userData.role)) {
      return NextResponse.json({ error: 'High Templar 이상의 권한이 필요합니다' }, { status: 403 })
    }

    // 요청 본문 파싱
    const body = await request.json()

    // Zod 스키마 검증
    const parseResult = reviewHandSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: '입력 데이터가 유효하지 않습니다',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { submissionId, handData, adminComment } = parseResult.data

    // 타임코드 제출 내역 조회
    const { data: submission, error: submissionError } = await supabase
      .from('timecode_submissions')
      .select(
        `
        *,
        stream:streams!timecode_submissions_stream_id_fkey (
          id,
          name
        )
      `
      )
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      logError('Review API - Submission not found', { submissionId, error: submissionError })
      return NextResponse.json({ error: '제출 내역을 찾을 수 없습니다' }, { status: 404 })
    }

    // 상태 체크 (review 상태여야 함)
    if (submission.status !== 'review') {
      return NextResponse.json(
        { error: `현재 상태(${submission.status})에서는 검수를 진행할 수 없습니다` },
        { status: 400 }
      )
    }

    // 핸드 생성
    const { data: hand, error: handError } = await supabase
      .from('hands')
      .insert({
        day_id: submission.stream_id,
        number: handData.number || submission.hand_number || null,
        description: handData.description || submission.description || null,
        timestamp: submission.start_time,
        pot_size: handData.potSize || null,
        board_cards: handData.boardCards || null,
        favorite: false,
      })
      .select()
      .single()

    if (handError || !hand) {
      logError('Review API - Hand creation failed', { error: handError })
      return NextResponse.json({ error: '핸드 생성에 실패했습니다' }, { status: 500 })
    }

    // 플레이어 정보 삽입
    if (handData.players && handData.players.length > 0) {
      const handPlayers = handData.players.map((player) => ({
        hand_id: hand.id,
        player_id: player.playerId,
        position: player.position,
        stack_size: player.stackSize,
        player_cards: player.holeCards || null,
        is_winner: player.isWinner || false,
        win_amount: player.winAmount || null,
      }))

      const { error: playersError } = await supabase.from('hand_players').insert(handPlayers)

      if (playersError) {
        logError('Review API - Hand players insertion failed', { error: playersError })
        // 핸드 삭제 (롤백)
        await supabase.from('hands').delete().eq('id', hand.id)
        return NextResponse.json({ error: '플레이어 정보 저장에 실패했습니다' }, { status: 500 })
      }
    }

    // 액션 정보 삽입
    if (handData.actions && handData.actions.length > 0) {
      const handActions = handData.actions.map((action) => ({
        hand_id: hand.id,
        player_id: action.playerId,
        street: action.street,
        action_type: action.actionType,
        amount: action.amount || null,
        sequence_number: action.sequenceNumber,
      }))

      const { error: actionsError } = await supabase.from('hand_actions').insert(handActions)

      if (actionsError) {
        logError('Review API - Hand actions insertion failed', { error: actionsError })
        // 핸드 삭제 (롤백)
        await supabase.from('hands').delete().eq('id', hand.id)
        return NextResponse.json({ error: '액션 정보 저장에 실패했습니다' }, { status: 500 })
      }
    }

    // 타임코드 제출 상태를 completed로 변경
    const { error: updateError } = await supabase
      .from('timecode_submissions')
      .update({
        status: 'completed',
        final_hand_id: hand.id,
        admin_comment: adminComment || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateError) {
      logError('Review API - Submission update failed', { error: updateError })
      return NextResponse.json({ error: '제출 상태 업데이트에 실패했습니다' }, { status: 500 })
    }

    // 플레이어 통계 캐시 무효화 (플레이어 ID 목록)
    const playerIds = handData.players?.map((p) => p.playerId) || []
    // Note: 실제로는 플레이어 통계 캐시 무효화 로직이 필요합니다

    return NextResponse.json(
      {
        success: true,
        message: '핸드 검수가 완료되었습니다',
        handId: hand.id,
      },
      { status: 200 }
    )
  } catch (error) {
    logError('Review API', error)
    const response = createErrorResponse(error, '핸드 검수 중 오류가 발생했습니다')
    return NextResponse.json({ error: response.error }, { status: response.status })
  }
}

/**
 * 핸드 히스토리 거부
 * DELETE /api/timecodes/review
 */
export async function DELETE(request: NextRequest) {
  try {
    // Supabase 클라이언트 생성
    const supabase = await createServerSupabaseClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // High Templar 이상 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, banned_at')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['high_templar', 'admin']
    if (userError || !userData || userData.banned_at || !allowedRoles.includes(userData.role)) {
      return NextResponse.json({ error: 'High Templar 이상의 권한이 필요합니다' }, { status: 403 })
    }

    // 요청 본문 파싱
    const body = await request.json()
    const { submissionId, adminComment } = body

    if (!submissionId || !adminComment) {
      return NextResponse.json({ error: 'submissionId와 adminComment가 필요합니다' }, { status: 400 })
    }

    // 타임코드 제출 내역 조회
    const { data: submission, error: submissionError } = await supabase
      .from('timecode_submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: '제출 내역을 찾을 수 없습니다' }, { status: 404 })
    }

    // 상태 체크 (review 상태여야 함)
    if (submission.status !== 'review') {
      return NextResponse.json(
        { error: `현재 상태(${submission.status})에서는 거부할 수 없습니다` },
        { status: 400 }
      )
    }

    // 상태를 rejected로 변경
    const { error: updateError } = await supabase
      .from('timecode_submissions')
      .update({
        status: 'rejected',
        admin_comment: adminComment,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateError) {
      return NextResponse.json({ error: '거부 처리에 실패했습니다' }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        message: '핸드가 거부되었습니다',
      },
      { status: 200 }
    )
  } catch (error) {
    logError('Review API - Reject', error)
    const response = createErrorResponse(error, '핸드 거부 중 오류가 발생했습니다')
    return NextResponse.json({ error: response.error }, { status: response.status })
  }
}
