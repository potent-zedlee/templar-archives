import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { ImportHandsRequest, ImportHandsResponse, HandHistory } from '@/lib/types/hand-history'
import { sanitizeErrorMessage, logError } from '@/lib/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/rate-limit'
import { importHandsSchema, validateInput, formatValidationErrors } from '@/lib/validation/api-schemas'
import { isValidUUID, sanitizeText, logSecurityEvent } from '@/lib/security'
import { verifyCSRF } from '@/lib/security/csrf'

export const dynamic = 'force-dynamic'

/**
 * POST /api/import-hands
 * 외부에서 분석된 핸드 히스토리를 import
 */
export async function POST(request: NextRequest) {
  // CSRF 보호
  const csrfError = await verifyCSRF(request)
  if (csrfError) return csrfError

  // Apply rate limiting (10 requests per minute)
  const rateLimitResponse = await applyRateLimit(request, rateLimiters.importHands)
  if (rateLimitResponse) return rateLimitResponse

  const supabase = await createServerSupabaseClient()

  try {
    const body = await request.json()

    // Zod 스키마 검증
    const validation = validateInput(importHandsSchema, body)
    if (!validation.success) {
      const errors = formatValidationErrors(validation.errors!)
      logSecurityEvent('xss_attempt', { errors, body })
      return NextResponse.json(
        {
          success: false,
          error: errors[0] || '입력값이 유효하지 않습니다',
          imported: 0,
          failed: 0
        } as ImportHandsResponse,
        { status: 400 }
      )
    }

    const { dayId, hands } = validation.data!

    // Day가 존재하는지 확인
    const { data: day, error: dayError } = await supabase
      .from('days')
      .select('id')
      .eq('id', dayId)
      .single()

    if (dayError || !day) {
      return NextResponse.json(
        {
          success: false,
          error: 'Day를 찾을 수 없습니다',
          imported: 0,
          failed: 0
        } as ImportHandsResponse,
        { status: 404 }
      )
    }

    let imported = 0
    let failed = 0
    const errors: string[] = []

    // 각 핸드를 처리
    for (let i = 0; i < hands.length; i++) {
      const hand = hands[i]

      try {
        // 1. 핸드 데이터 저장
        const { data: handData, error: handError } = await supabase
          .from('hands')
          .insert({
            day_id: dayId,
            number: hand.handNumber,
            description: hand.summary || `Hand #${hand.handNumber}`,
            timestamp: `${hand.startTime}-${hand.endTime}`,
            favorite: false
          })
          .select()
          .single()

        if (handError || !handData) {
          logError('import-hands', handError)
          throw new Error('핸드 저장에 실패했습니다')
        }

        // 2. 플레이어 정보 저장
        for (const player of hand.players) {
          // 플레이어 이름 sanitize (XSS 방지)
          const sanitizedPlayerName = sanitizeText(player.name, 100)

          // 플레이어가 DB에 있는지 확인
          let { data: existingPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('name', sanitizedPlayerName)
            .single()

          let playerId: string

          if (!existingPlayer) {
            // 플레이어 생성
            const { data: newPlayer, error: playerError } = await supabase
              .from('players')
              .insert({
                name: sanitizedPlayerName,
                country: 'Unknown'
              })
              .select()
              .single()

            if (playerError || !newPlayer) {
              console.error('플레이어 생성 실패:', playerError)
              continue
            }
            playerId = newPlayer.id
          } else {
            playerId = existingPlayer.id
          }

          // hand_players 연결
          await supabase
            .from('hand_players')
            .insert({
              hand_id: handData.id,
              player_id: playerId,
              position: player.position || '',
              cards: player.cards || ''
            })
        }

        imported++
      } catch (error: any) {
        failed++
        logError(`import-hands-hand-${hand.handNumber}`, error)
        const errorMsg = sanitizeErrorMessage(error, '핸드 처리 중 오류가 발생했습니다')
        errors.push(`Hand #${hand.handNumber}: ${errorMsg}`)
      }
    }

    return NextResponse.json({
      success: imported > 0,
      imported,
      failed,
      errors: errors.length > 0 ? errors : undefined
    } as ImportHandsResponse)

  } catch (error: any) {
    logError('import-hands', error)
    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorMessage(error, '핸드 import 중 오류가 발생했습니다'),
        imported: 0,
        failed: 0
      } as ImportHandsResponse,
      { status: 500 }
    )
  }
}

/**
 * GET /api/import-hands
 * API 상태 확인 및 사용 예시 반환
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Hand History Import API',
    usage: {
      endpoint: '/api/import-hands',
      method: 'POST',
      contentType: 'application/json',
      body: {
        dayId: 'uuid-of-day',
        source: 'external-analyzer-v1 (optional)',
        hands: [
          {
            handNumber: '001',
            startTime: '00:26:37',
            endTime: '00:27:58',
            duration: 81,
            confidence: 95,
            summary: '타카자와 오픈레이즈, 모두 폴드',
            players: [
              {
                name: 'Takasugi',
                position: 'BTN',
                cards: 'AhKh',
                stack: 25000
              }
            ],
            potSize: 1500,
            boardCards: 'As Kh Qd',
            winner: 'Takasugi',
            winAmount: 1500
          }
        ]
      }
    }
  })
}
