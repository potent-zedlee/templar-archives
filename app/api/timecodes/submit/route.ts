/**
 * Timecode Submission API
 *
 * POST /api/timecodes/submit
 * 사용자가 영상 타임코드를 제출하는 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { timecodeSubmissionSchema } from '@/lib/validation/timecode-schemas'
import { parseTimecode, calculateDuration } from '@/lib/timecode-utils'
import { logError, createErrorResponse } from '@/lib/error-handler'
import { applyRateLimit } from '@/lib/rate-limit'
import { rateLimiters } from '@/lib/rate-limit-config'

export const runtime = 'edge'

/**
 * 타임코드 제출
 * POST /api/timecodes/submit
 */
export async function POST(request: NextRequest) {
  try {
    // Rate Limiting (사용자당 10개/시간)
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.general)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

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

    // 사용자 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, banned_at')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      logError('Timecode Submit API - User not found', { userId: user.id, error: userError })
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 밴 체크
    if (userData.banned_at) {
      return NextResponse.json({ error: '차단된 사용자는 제출할 수 없습니다' }, { status: 403 })
    }

    // 요청 본문 파싱
    const body = await request.json()

    // Zod 스키마 검증
    const parseResult = timecodeSubmissionSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: '입력 데이터가 유효하지 않습니다',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { streamId, startTime, endTime, handNumber, description } = parseResult.data

    // 스트림 존재 확인
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, name')
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      logError('Timecode Submit API - Stream not found', { streamId, error: streamError })
      return NextResponse.json({ error: '영상을 찾을 수 없습니다' }, { status: 404 })
    }

    // 타임코드 검증
    try {
      parseTimecode(startTime)
      if (endTime) {
        parseTimecode(endTime)
        calculateDuration(startTime, endTime)
      }
    } catch (error) {
      return NextResponse.json(
        { error: '타임코드 형식이 올바르지 않습니다' },
        { status: 400 }
      )
    }

    // 타임코드 제출 저장
    const { data: submission, error: insertError } = await supabase
      .from('timecode_submissions')
      .insert({
        stream_id: streamId,
        submitter_id: userData.id,
        submitter_name: userData.username,
        start_time: startTime,
        end_time: endTime || null,
        hand_number: handNumber || null,
        description: description || null,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      logError('Timecode Submit API - Insert failed', { error: insertError })
      return NextResponse.json(
        { error: '타임코드 제출에 실패했습니다' },
        { status: 500 }
      )
    }

    // 성공 응답
    return NextResponse.json(
      {
        success: true,
        submission: {
          id: submission.id,
          streamId: submission.stream_id,
          startTime: submission.start_time,
          endTime: submission.end_time,
          handNumber: submission.hand_number,
          description: submission.description,
          status: submission.status,
          createdAt: submission.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    logError('Timecode Submit API', error)
    const response = createErrorResponse(error, '타임코드 제출 중 오류가 발생했습니다')
    return NextResponse.json({ error: response.error }, { status: response.status })
  }
}
