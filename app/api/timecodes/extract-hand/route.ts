/**
 * AI Hand Extraction API
 *
 * POST /api/timecodes/extract-hand
 * 관리자가 승인한 타임코드에서 AI를 사용하여 핸드 히스토리 추출
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Anthropic from '@anthropic-ai/sdk'
import { logError, createErrorResponse } from '@/lib/error-handler'
import { parseTimecode } from '@/lib/timecode-utils'

// Node.js runtime (Anthropic SDK 사용)
export const runtime = 'nodejs'
export const maxDuration = 60 // 60초 타임아웃

/**
 * AI 핸드 추출 트리거 (관리자 전용)
 * POST /api/timecodes/extract-hand
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

    // 관리자 권한 확인
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role, banned_at')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin' || userData.banned_at) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // 요청 본문 파싱
    const body = await request.json()
    const { submissionId } = body

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId가 필요합니다' }, { status: 400 })
    }

    // 타임코드 제출 내역 조회
    const { data: submission, error: submissionError } = await supabase
      .from('timecode_submissions')
      .select(
        `
        *,
        stream:streams!timecode_submissions_stream_id_fkey (
          id,
          name,
          video_url,
          video_source,
          video_file,
          video_nas_path
        )
      `
      )
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      logError('Extract Hand API - Submission not found', { submissionId, error: submissionError })
      return NextResponse.json({ error: '제출 내역을 찾을 수 없습니다' }, { status: 404 })
    }

    // 상태 체크 (approved 상태여야 함)
    if (submission.status !== 'approved') {
      return NextResponse.json(
        { error: `현재 상태(${submission.status})에서는 AI 추출을 실행할 수 없습니다` },
        { status: 400 }
      )
    }

    // 영상 정보 확인
    if (!submission.stream) {
      return NextResponse.json({ error: '영상 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 상태를 ai_processing으로 변경
    await supabase
      .from('timecode_submissions')
      .update({ status: 'ai_processing' })
      .eq('id', submissionId)

    try {
      // AI 핸드 추출 실행
      const extractedData = await extractHandWithClaude(submission)

      // 추출 성공 - 데이터 저장 및 상태를 review로 변경
      const { error: updateError } = await supabase
        .from('timecode_submissions')
        .update({
          status: 'review',
          ai_extracted_data: extractedData,
          ai_processed_at: new Date().toISOString(),
          ai_processing_error: null,
        })
        .eq('id', submissionId)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json(
        {
          success: true,
          message: 'AI 핸드 추출이 완료되었습니다',
          data: extractedData,
        },
        { status: 200 }
      )
    } catch (aiError) {
      // AI 추출 실패 - 에러 저장 및 상태를 approved로 복원
      const errorMessage =
        aiError instanceof Error ? aiError.message : 'AI 핸드 추출 중 오류가 발생했습니다'

      await supabase
        .from('timecode_submissions')
        .update({
          status: 'approved',
          ai_processing_error: errorMessage,
        })
        .eq('id', submissionId)

      logError('Extract Hand API - AI extraction failed', { submissionId, error: aiError })

      return NextResponse.json(
        {
          error: 'AI 핸드 추출에 실패했습니다',
          details: errorMessage,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logError('Extract Hand API', error)
    const response = createErrorResponse(error, 'AI 핸드 추출 중 오류가 발생했습니다')
    return NextResponse.json({ error: response.error }, { status: response.status })
  }
}

/**
 * Claude Vision API를 사용하여 핸드 히스토리 추출
 */
async function extractHandWithClaude(submission: any): Promise<any> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // 타임코드 파싱
  const startSeconds = parseTimecode(submission.start_time)
  const endSeconds = submission.end_time ? parseTimecode(submission.end_time) : startSeconds + 300 // 기본 5분

  // 영상 URL 구성
  let videoDescription = ''
  if (submission.stream.video_source === 'youtube' && submission.stream.video_url) {
    videoDescription = `YouTube 영상: ${submission.stream.video_url}\n타임코드: ${submission.start_time}`
    if (submission.end_time) {
      videoDescription += ` ~ ${submission.end_time}`
    }
  } else {
    videoDescription = `영상 이름: ${submission.stream.name}\n타임코드: ${submission.start_time}`
    if (submission.end_time) {
      videoDescription += ` ~ ${submission.end_time}`
    }
  }

  // 추가 정보
  if (submission.hand_number) {
    videoDescription += `\n핸드 번호: ${submission.hand_number}`
  }
  if (submission.description) {
    videoDescription += `\n설명: ${submission.description}`
  }

  // Claude Vision API 호출
  const prompt = `다음은 포커 핸드 영상에 대한 정보입니다:

${videoDescription}

이 정보를 바탕으로 포커 핸드를 분석하여 다음 형식의 JSON으로 응답해주세요:

{
  "handNumber": "핸드 번호 (예: #45)",
  "description": "핸드 간단 설명 (예: AA vs KK all-in preflop)",
  "potSize": 팟 크기 (숫자),
  "boardCards": "보드 카드 (예: Ah Kh Qh Jh Th)",
  "players": [
    {
      "name": "플레이어 이름",
      "position": "포지션 (BTN, SB, BB, UTG, MP, CO)",
      "stackSize": 스택 크기 (숫자),
      "holeCards": "홀카드 (예: As Ah)",
      "isWinner": true/false,
      "winAmount": 승리 금액 (숫자, 옵션)
    }
  ],
  "actions": [
    {
      "playerName": "플레이어 이름",
      "street": "preflop/flop/turn/river",
      "actionType": "fold/check/call/bet/raise/all-in",
      "amount": 액션 금액 (숫자, 옵션),
      "sequenceNumber": 액션 순서 (숫자)
    }
  ]
}

참고:
- 영상을 직접 볼 수 없으므로, 제공된 정보(타임코드, 핸드 번호, 설명)를 최대한 활용하여 추정해주세요.
- 정보가 부족한 경우 null 또는 빈 배열로 표시해주세요.
- 플레이어는 최소 2명 이상이어야 합니다.
- 반드시 유효한 JSON 형식으로만 응답해주세요.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // 응답 파싱
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : JSON.stringify(message.content[0])

    // JSON 추출 (코드 블록 제거)
    let jsonText = responseText.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim()
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '').trim()
    }

    const extractedData = JSON.parse(jsonText)

    // 기본 검증
    if (!extractedData.players || extractedData.players.length < 2) {
      throw new Error('유효한 핸드 데이터가 아닙니다 (플레이어가 2명 미만)')
    }

    return extractedData
  } catch (error) {
    logError('Claude Vision API Error', error)
    throw new Error(
      `AI 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    )
  }
}
