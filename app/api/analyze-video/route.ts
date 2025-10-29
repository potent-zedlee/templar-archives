/**
 * Analyze Video API
 *
 * Hand Analysis Engine을 사용하여 영상에서 핸드 히스토리를 자동 추출
 *
 * - High Templar 이상만 사용 가능
 * - SSE 스트리밍으로 진행률 실시간 전송
 * - 결과를 hands, hand_players, hand_actions 테이블에 자동 저장
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { canAnalyzeVideo } from '@/lib/auth-utils'
import { HandAnalyzer } from 'hand-analysis-engine'
import type { AnalysisResult } from 'hand-analysis-engine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes

interface AnalyzeVideoRequest {
  dayId: string
  layout?: 'triton' | 'hustler' | 'wsop' | 'apt'
  maxIterations?: number
}

interface ProgressEvent {
  type: 'progress' | 'boundary' | 'hand' | 'complete' | 'error'
  data: any
}

/**
 * GET /api/analyze-video
 * 영상 분석 시작 (SSE 스트리밍)
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  try {
    // 1. 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다' },
        { status: 401 }
      )
    }

    // 2. 권한 확인 (High Templar 이상)
    const hasPermission = await canAnalyzeVideo(supabase, user.id)
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'High Templar 이상만 영상 분석을 사용할 수 있습니다',
        },
        { status: 403 }
      )
    }

    // 3. 요청 파싱 (쿼리 파라미터)
    const searchParams = request.nextUrl.searchParams
    const dayId = searchParams.get('dayId')
    const layout = (searchParams.get('layout') || 'triton') as 'triton' | 'hustler' | 'wsop' | 'apt'
    const maxIterations = parseInt(searchParams.get('maxIterations') || '3')

    if (!dayId) {
      return NextResponse.json(
        { success: false, error: 'dayId가 필요합니다' },
        { status: 400 }
      )
    }

    // 4. Day 정보 조회
    const { data: day, error: dayError } = await supabase
      .from('streams')
      .select(
        `
        *,
        sub_event:sub_events (
          *,
          tournament:tournaments (
            *
          )
        )
      `
      )
      .eq('id', dayId)
      .single()

    if (dayError || !day) {
      return NextResponse.json(
        { success: false, error: 'Day를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 5. 영상 URL 확인
    const videoUrl =
      day.video_url || day.video_file || day.video_nas_path

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: '영상 URL이 없습니다' },
        { status: 400 }
      )
    }

    // 6. SSE 스트림 생성
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: ProgressEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(data))
        }

        try {
          sendEvent({ type: 'progress', data: { stage: 'initializing', percent: 0 } })

          // 7. Hand Analyzer 초기화
          const apiKey = process.env.GEMINI_API_KEY
          if (!apiKey) {
            throw new Error('GEMINI_API_KEY가 설정되지 않았습니다')
          }

          const analyzer = new HandAnalyzer(apiKey)

          sendEvent({ type: 'progress', data: { stage: 'analyzing', percent: 10 } })

          // 8. 영상 분석 실행
          const result: AnalysisResult = await analyzer.analyzeVideo({
            videoUrl,
            layout: layout as any,
            maxIterations,
          })

          sendEvent({ type: 'progress', data: { stage: 'saving', percent: 80 } })

          // 9. 결과 저장
          let savedCount = 0
          for (const hand of result.hands) {
            try {
              // 핸드 저장
              const { data: savedHand, error: handError } = await supabase
                .from('hands')
                .insert({
                  stream_id: dayId,
                  number: hand.hand_id,
                  timestamp: hand.timestamp.toString(),
                  pot_size: hand.result.pot_final,
                  board_cards: [
                    ...(hand.actions.flop?.cards || []),
                    ...(hand.actions.turn?.cards.slice(3, 4) || []),
                    ...(hand.actions.river?.cards.slice(4, 5) || []),
                  ].join(' ') || null,
                  analyzed_by: 'auto',
                  analysis_confidence: hand.confidence,
                  analysis_metadata: {
                    iterations: result.totalIterations / result.totalHands,
                    layout: layout || 'auto',
                    engine_version: '1.0.0',
                  },
                })
                .select('id')
                .single()

              if (handError || !savedHand) {
                console.error('Failed to save hand:', handError)
                continue
              }

              // 플레이어 저장
              for (const player of hand.players) {
                // 플레이어 조회 또는 생성
                const { data: existingPlayer } = await supabase
                  .from('players')
                  .select('id')
                  .eq('name', player.name)
                  .single()

                let playerId = existingPlayer?.id

                if (!playerId) {
                  const { data: newPlayer } = await supabase
                    .from('players')
                    .insert({
                      name: player.name,
                      total_winnings: 0,
                    })
                    .select('id')
                    .single()

                  playerId = newPlayer?.id
                }

                if (!playerId) continue

                // hand_players 저장
                await supabase.from('hand_players').insert({
                  hand_id: savedHand.id,
                  player_id: playerId,
                  position: player.position,
                  cards: player.hole_cards?.join('') || null,
                  starting_stack: player.stack_start,
                  ending_stack: player.stack_end,
                })

                // hand_actions 저장
                let sequence = 1

                // Preflop
                for (const action of hand.actions.preflop) {
                  await supabase.from('hand_actions').insert({
                    hand_id: savedHand.id,
                    player_id: playerId,
                    street: 'preflop',
                    action_type: action.action as any,
                    amount: action.amount,
                    sequence: sequence++,
                  })
                }

                // Flop
                if (hand.actions.flop) {
                  for (const action of hand.actions.flop.actions) {
                    await supabase.from('hand_actions').insert({
                      hand_id: savedHand.id,
                      player_id: playerId,
                      street: 'flop',
                      action_type: action.action as any,
                      amount: action.amount,
                      sequence: sequence++,
                    })
                  }
                }

                // Turn
                if (hand.actions.turn) {
                  for (const action of hand.actions.turn.actions) {
                    await supabase.from('hand_actions').insert({
                      hand_id: savedHand.id,
                      player_id: playerId,
                      street: 'turn',
                      action_type: action.action as any,
                      amount: action.amount,
                      sequence: sequence++,
                    })
                  }
                }

                // River
                if (hand.actions.river) {
                  for (const action of hand.actions.river.actions) {
                    await supabase.from('hand_actions').insert({
                      hand_id: savedHand.id,
                      player_id: playerId,
                      street: 'river',
                      action_type: action.action as any,
                      amount: action.amount,
                      sequence: sequence++,
                    })
                  }
                }
              }

              savedCount++
              sendEvent({
                type: 'hand',
                data: {
                  handId: savedHand.id,
                  handNumber: hand.hand_id,
                  confidence: hand.confidence,
                },
              })
            } catch (error) {
              console.error('Error saving hand:', error)
            }
          }

          sendEvent({ type: 'progress', data: { stage: 'complete', percent: 100 } })

          // 10. 완료 이벤트
          sendEvent({
            type: 'complete',
            data: {
              totalHands: result.totalHands,
              savedHands: savedCount,
              successRate: (savedCount / result.totalHands) * 100,
              processingTime: result.processingTime,
              averageConfidence: result.averageConfidence,
            },
          })

          controller.close()
        } catch (error: any) {
          sendEvent({
            type: 'error',
            data: { message: error.message || 'Unknown error' },
          })
          controller.close()
        }
      },
    })

    // 11. SSE 응답 반환
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Analyze video error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '영상 분석 중 오류가 발생했습니다',
      },
      { status: 500 }
    )
  }
}
