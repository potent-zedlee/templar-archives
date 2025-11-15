import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sanitizeErrorMessage, logError } from '@/lib/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/rate-limit'
import { importHandsSchema, validateInput, formatValidationErrors } from '@/lib/validation/api-schemas'
import { sanitizeText, logSecurityEvent } from '@/lib/security'
import { verifyCSRF } from '@/lib/security/csrf'
import { findBestMatch } from '@/lib/name-matching'

export const dynamic = 'force-dynamic'

// 매칭 결과 저장용 타입
interface PlayerMatchResult {
  inputName: string
  matchedName: string
  playerId: string
  similarity: number
  confidence: 'high' | 'medium' | 'low'
  isPartialMatch: boolean
}

/**
 * POST /api/import-hands
 * 외부에서 분석된 핸드 히스토리를 import
 */
export async function POST(request: NextRequest) {
  // 서버 간 호출 확인 (Origin과 Referer 둘 다 없음)
  const isServerToServer = !request.headers.get('origin') && !request.headers.get('referer')

  // 클라이언트 요청만 CSRF 검증
  if (!isServerToServer) {
    const csrfError = await verifyCSRF(request)
    if (csrfError) return csrfError
  }

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
        },
        { status: 400 }
      )
    }

    const { streamId, hands } = validation.data!

    // Stream이 존재하는지 확인
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id')
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stream을 찾을 수 없습니다',
          imported: 0,
          failed: 0
        },
        { status: 404 }
      )
    }

    let imported = 0
    let failed = 0
    const errors: string[] = []
    const matchResults: PlayerMatchResult[] = []

    // 각 핸드를 처리
    for (let i = 0; i < hands.length; i++) {
      const hand = hands[i]

      try {
        // 1. 핸드 데이터 저장
        const { data: handData, error: handError } = await supabase
          .from('hands')
          .insert({
            day_id: streamId,
            number: hand.number,
            description: hand.description,
            summary: hand.summary,
            timestamp: hand.timestamp,
            pot_size: hand.pot_size,
            board_cards: hand.board_cards,
            favorite: false
          })
          .select()
          .single()

        if (handError || !handData) {
          logError('import-hands', handError)
          throw new Error('핸드 저장에 실패했습니다')
        }

        // 2. 플레이어 정보 저장
        // 먼저 모든 플레이어 목록을 가져와서 fuzzy matching에 사용
        const { data: allPlayers } = await supabase
          .from('players')
          .select('id, name')

        const playerNameMap = new Map<string, string>() // 입력 이름 → DB 플레이어 ID

        if (hand.players && hand.players.length > 0) {
          for (const player of hand.players) {
            // 플레이어 이름 sanitize (XSS 방지)
            const sanitizedPlayerName = sanitizeText(player.name, 100)

            // 1. 정확히 일치하는 플레이어 찾기
            let { data: existingPlayer } = await supabase
              .from('players')
              .select('id, name')
              .eq('name', sanitizedPlayerName)
              .maybeSingle()

            let playerId: string
            let matchedName = sanitizedPlayerName

            // 2. 정확한 일치가 없으면 fuzzy matching 시도
            if (!existingPlayer && allPlayers && allPlayers.length > 0) {
              const candidateNames = allPlayers.map((p) => p.name)
              const bestMatch = findBestMatch(sanitizedPlayerName, candidateNames, 70)

              if (bestMatch && bestMatch.confidence !== 'low') {
                // 신뢰도가 높거나 중간이면 기존 플레이어 사용
                existingPlayer = allPlayers.find((p) => p.name === bestMatch.name)
                matchedName = bestMatch.name
                console.log(
                  `Fuzzy match: "${sanitizedPlayerName}" → "${bestMatch.name}" (${bestMatch.similarity}%)`
                )

                // 매칭 결과 저장
                if (existingPlayer) {
                  matchResults.push({
                    inputName: sanitizedPlayerName,
                    matchedName: bestMatch.name,
                    playerId: existingPlayer.id,
                    similarity: bestMatch.similarity,
                    confidence: bestMatch.confidence,
                    isPartialMatch: bestMatch.isPartialMatch,
                  })
                }
              }
            }

            if (!existingPlayer) {
              // 플레이어 생성 (자동 등록)
              const { data: newPlayer, error: playerError } = await supabase
                .from('players')
                .insert({
                  name: sanitizedPlayerName,
                  country: null, // 나중에 업데이트 가능
                })
                .select()
                .single()

              if (playerError || !newPlayer) {
                console.error('플레이어 생성 실패:', playerError)
                continue
              }
              playerId = newPlayer.id
            } else {
              playerId = existingPlayer.id ?? newPlayer?.id ?? ''
            }

            if (!playerId) continue

            // 매핑 저장 (액션 저장 시 사용)
            playerNameMap.set(sanitizedPlayerName, playerId)

            // hand_players 연결
            const { error: handPlayerError } = await supabase
              .from('hand_players')
              .insert({
                hand_id: handData.id,
                player_id: playerId,
                position: player.position || null,
                cards: player.cards ? player.cards.split('').map(c => c).join('') : null,
              })

            if (handPlayerError) {
              console.error('hand_players 저장 실패:', handPlayerError)
            }
          }
        }

        // 3. 액션 정보 저장
        const actions: Array<{
          playerId: string
          actionType: string
          street: string
          amount: number
          order: number
          description?: string
        }> = []

        let actionOrder = 1

        // 액션 추출 함수
        const extractActions = (street: string, actionsData: any) => {
          if (!actionsData) return

          // 문자열 배열 형식 (간단한 형식)
          if (Array.isArray(actionsData) && typeof actionsData[0] === 'string') {
            actionsData.forEach((actionStr: string) => {
              // 예: "Tom Dwan raises to 1500"
              const parts = actionStr.split(' ')
              if (parts.length >= 2) {
                const playerName = parts.slice(0, -2).join(' ')
                const actionType = parts[parts.length - 2]
                const amount = parseInt(parts[parts.length - 1]) || 0

                actions.push({
                  playerId: playerName, // 나중에 매핑
                  actionType: actionType.toLowerCase(),
                  street,
                  amount,
                  order: actionOrder++,
                })
              }
            })
          }
          // 객체 배열 형식 (상세 형식)
          else if (Array.isArray(actionsData)) {
            actionsData.forEach((action: any) => {
              actions.push({
                playerId: action.player || action.playerName,
                actionType: action.action || action.actionType,
                street,
                amount: action.amount || 0,
                order: actionOrder++,
                description: action.description,
              })
            })
          }
        }

        // streets 객체에서 액션 추출 (우선순위)
        if (hand.streets) {
          if (hand.streets.preflop?.actions) {
            extractActions('preflop', hand.streets.preflop.actions)
          }
          if (hand.streets.flop?.actions) {
            extractActions('flop', hand.streets.flop.actions)
          }
          if (hand.streets.turn?.actions) {
            extractActions('turn', hand.streets.turn.actions)
          }
          if (hand.streets.river?.actions) {
            extractActions('river', hand.streets.river.actions)
          }
        }
        // 간단한 형식에서 액션 추출 (폴백)
        else {
          if (hand.preflop) extractActions('preflop', hand.preflop)
          if (hand.flop) extractActions('flop', hand.flop)
          if (hand.turn) extractActions('turn', hand.turn)
          if (hand.river) extractActions('river', hand.river)
        }

        // 액션 저장
        for (const action of actions) {
          // 플레이어 ID 찾기 (매핑 사용)
          const sanitizedPlayerName = sanitizeText(action.playerId, 100)
          let playerId = playerNameMap.get(sanitizedPlayerName)

          // 매핑에 없으면 DB에서 직접 찾기
          if (!playerId) {
            const { data: player } = await supabase
              .from('players')
              .select('id')
              .eq('name', sanitizedPlayerName)
              .maybeSingle()

            if (player) {
              playerId = player.id
            } else if (allPlayers) {
              // Fuzzy matching 시도
              const candidateNames = allPlayers.map((p) => p.name)
              const bestMatch = findBestMatch(sanitizedPlayerName, candidateNames, 70)

              if (bestMatch && bestMatch.confidence !== 'low') {
                const matchedPlayer = allPlayers.find((p) => p.name === bestMatch.name)
                if (matchedPlayer) {
                  playerId = matchedPlayer.id
                  console.log(
                    `Action fuzzy match: "${sanitizedPlayerName}" → "${bestMatch.name}"`
                  )
                }
              }
            }
          }

          if (playerId) {
            const { error: actionError } = await supabase
              .from('hand_actions')
              .insert({
                hand_id: handData.id,
                player_id: playerId,
                action_type: action.actionType,
                street: action.street,
                amount: action.amount,
                action_order: action.order,
                description: action.description,
              })

            if (actionError) {
              console.error('hand_actions 저장 실패:', actionError)
            }
          }
        }

        imported++
      } catch (error: any) {
        failed++
        logError(`import-hands-hand-${hand.number}`, error)
        const errorMsg = sanitizeErrorMessage(error, '핸드 처리 중 오류가 발생했습니다')
        errors.push(`Hand #${hand.number}: ${errorMsg}`)
      }
    }

    return NextResponse.json({
      success: imported > 0,
      imported,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      matchResults: matchResults.length > 0 ? matchResults : undefined
    } as ImportHandsResponse & { matchResults?: PlayerMatchResult[] })

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
