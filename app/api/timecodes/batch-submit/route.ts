/**
 * Batch Timecode Submit API
 *
 * POST /api/timecodes/batch-submit
 * High Templar 이상이 여러 타임코드를 한 번에 제출
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { batchTimecodeSubmissionSchema } from '@/lib/validation/timecode-schemas'
import { parseHHMMSS } from '@/lib/timecode-utils'
import { logError, createErrorResponse } from '@/lib/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/rate-limit'

export const runtime = 'edge'

/**
 * Batch 타임코드 제출 (High Templar 이상)
 * POST /api/timecodes/batch-submit
 */
export async function POST(request: NextRequest) {
  try {
    // Rate Limiting (5회/분)
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.parseApi)
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

    // 유저 정보 조회 (role, banned_at 체크)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, nickname, role, banned_at')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      // 디버깅을 위한 로깅
      console.error('[batch-submit] User info not found:', {
        userId: user.id,
        userEmail: user.email,
        error: userError?.message,
        errorCode: userError?.code,
      })

      return NextResponse.json(
        {
          error: '제출자 계정 정보를 찾을 수 없습니다. 관리자에게 문의하세요.',
          details: process.env.NODE_ENV === 'development' ? `User ID: ${user.id}` : undefined
        },
        { status: 404 }
      )
    }

    // Banned 체크
    if (userData.banned_at) {
      return NextResponse.json({ error: '정지된 사용자입니다' }, { status: 403 })
    }

    // 모든 인증된 사용자가 타임코드 제출 가능 (역할 제한 없음)

    // 요청 본문 파싱
    const body = await request.json()

    // Zod 스키마 검증
    const parseResult = batchTimecodeSubmissionSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: '입력 데이터가 유효하지 않습니다',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { streamId, timecodes } = parseResult.data

    // Stream 존재 확인
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, name')
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      return NextResponse.json({ error: '스트림을 찾을 수 없습니다' }, { status: 404 })
    }

    // 타임코드 유효성 검증 (시작 < 종료)
    for (let i = 0; i < timecodes.length; i++) {
      const { handNumber, startTime, endTime } = timecodes[i]

      const startSeconds = parseHHMMSS(startTime)
      const endSeconds = parseHHMMSS(endTime)

      if (startSeconds >= endSeconds) {
        return NextResponse.json(
          {
            error: `핸드 번호 ${handNumber}: 시작 시간이 종료 시간보다 늦거나 같습니다`,
          },
          { status: 400 }
        )
      }
    }

    // 중복 핸드 번호 체크 (배열 내에서)
    const handNumbers = timecodes.map((tc) => tc.handNumber)
    const uniqueHandNumbers = new Set(handNumbers)
    if (uniqueHandNumbers.size !== handNumbers.length) {
      return NextResponse.json(
        { error: '중복된 핸드 번호가 있습니다' },
        { status: 400 }
      )
    }

    // Batch Insert
    const submissionsToInsert = timecodes.map((tc) => ({
      stream_id: streamId,
      submitter_id: userData.id,
      submitter_name: userData.nickname || user.email || 'Unknown',
      start_time: tc.startTime,
      end_time: tc.endTime,
      hand_number: tc.handNumber,
      description: tc.description || null,
      ocr_regions: null, // OCR 영역은 관리자가 나중에 설정
      status: 'pending',
    }))

    const { data: submissions, error: insertError } = await supabase
      .from('timecode_submissions')
      .insert(submissionsToInsert)
      .select()

    if (insertError) {
      // 상세한 에러 로깅
      console.error('[batch-submit] Insert failed:', {
        error: insertError,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
        streamId,
        submissionCount: timecodes.length,
        userId: userData.id,
      })
      logError('Batch Submit API - Insert failed', { error: insertError, streamId })
      return NextResponse.json(
        {
          error: '타임코드 제출에 실패했습니다',
          details: insertError.message,
          code: insertError.code
        },
        { status: 500 }
      )
    }

    // 관리자에게 알림 전송 (트리거가 자동으로 처리)

    return NextResponse.json(
      {
        success: true,
        message: `${submissions.length}개의 타임코드가 제출되었습니다`,
        submittedCount: submissions.length,
        submissions,
      },
      { status: 201 }
    )
  } catch (error) {
    logError('Batch Submit API', error)
    const response = createErrorResponse(error, 'Batch 타임코드 제출 중 오류가 발생했습니다')
    return NextResponse.json({ error: response.error }, { status: response.status })
  }
}
