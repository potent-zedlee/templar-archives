'use server'

/**
 * KAN Analysis - Trigger.dev Integration
 *
 * Python 백엔드를 대체하는 Trigger.dev 기반 분석 시스템
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'

// Trigger.dev v3에서 작업을 트리거하는 방법
// TODO: @trigger.dev/sdk/v3에서 실제 클라이언트 import 필요
// import { tasks } from "@trigger.dev/sdk/v3";
// import { videoAnalysisTask } from "@/trigger/video-analysis";

export type KanPlatform = 'ept' | 'triton' | 'wsop'

export interface TriggerKanAnalysisInput {
  videoUrl: string
  segments: TimeSegment[]
  platform?: KanPlatform
  streamId?: string
}

export interface TriggerKanAnalysisResult {
  success: boolean
  jobId?: string
  streamId?: string
  error?: string
}

/**
 * Trigger.dev로 KAN 분석 시작
 *
 * @param input 분석 입력 데이터
 * @returns 작업 ID 및 결과
 */
export async function startKanAnalysisWithTrigger(
  input: TriggerKanAnalysisInput
): Promise<TriggerKanAnalysisResult> {
  try {
    const { videoUrl, segments, platform = 'ept', streamId } = input

    console.log('[KAN-Trigger] Starting analysis with Trigger.dev')
    console.log(`[KAN-Trigger] URL: ${videoUrl}`)
    console.log(`[KAN-Trigger] Segments: ${segments.length}`)
    console.log(`[KAN-Trigger] Platform: ${platform}`)

    // Stream ID 검증
    if (!streamId) {
      return {
        success: false,
        error: 'Stream ID is required'
      }
    }

    // Supabase 클라이언트 생성
    const supabase = await createServerSupabaseClient()

    // Stream 존재 확인
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, name, status')
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      return {
        success: false,
        error: `Stream not found: ${streamId}`
      }
    }

    // 세그먼트를 { start, end } 형식으로 변환
    const formattedSegments = segments.map(seg => ({
      start: seg.start,
      end: seg.end
    }))

    // Trigger.dev v3 작업 트리거
    const { tasks } = await import("@trigger.dev/sdk/v3");

    const handle = await tasks.trigger("kan-video-analysis", {
      youtubeUrl: videoUrl,
      segments: formattedSegments,
      platform,
      streamId
    });

    const jobId = handle.id;

    console.log(`[KAN-Trigger] Job started: ${jobId}`)

    // Stream 상태 업데이트 (분석 중)
    await supabase
      .from('streams')
      .update({
        status: 'analyzing',
        updated_at: new Date().toISOString()
      })
      .eq('id', streamId)

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      jobId,
      streamId
    }

  } catch (error) {
    console.error('[KAN-Trigger] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Trigger.dev 작업 상태 조회
 *
 * @param jobId 작업 ID
 * @returns 작업 상태 및 결과
 */
export async function getTriggerJobStatus(jobId: string) {
  try {
    // Trigger.dev v3에서 작업 상태 조회
    const { runs } = await import("@trigger.dev/sdk/v3");

    const run = await runs.retrieve(jobId);

    return {
      id: run.id,
      status: run.status, // "QUEUED" | "EXECUTING" | "COMPLETED" | "FAILED" | "CANCELED" etc
      output: run.output,
      error: run.error,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.isCompleted ? new Date() : undefined
    }

  } catch (error) {
    console.error('[KAN-Trigger] Error getting job status:', error)
    throw error
  }
}

/**
 * Trigger.dev 작업 결과를 Supabase에 저장
 *
 * @param jobId 작업 ID
 * @returns 저장 결과
 */
export async function saveTriggerJobResults(jobId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    // 작업 상태 조회
    const jobStatus = await getTriggerJobStatus(jobId)

    if (jobStatus.status !== 'COMPLETED') {
      return {
        success: false,
        error: `Job not completed: ${jobStatus.status}`
      }
    }

    // 결과 파싱
    const { streamId, hands, platform } = jobStatus.output || {}

    if (!streamId || !hands || !Array.isArray(hands)) {
      return {
        success: false,
        error: 'Invalid job output'
      }
    }

    console.log(`[KAN-Trigger] Saving ${hands.length} hands to stream ${streamId}`)

    // Stream 존재 확인
    const { data: stream } = await supabase
      .from('streams')
      .select('id, sub_event_id')
      .eq('id', streamId)
      .single()

    if (!stream) {
      return {
        success: false,
        error: `Stream not found: ${streamId}`
      }
    }

    let savedCount = 0
    let errorCount = 0

    // 각 핸드를 개별적으로 저장 (트랜잭션 대신 개별 처리)
    for (const hand of hands) {
      try {
        await saveHandToDatabase(supabase, streamId, hand)
        savedCount++
        console.log(`[KAN-Trigger] Saved hand ${hand.handNumber} (${savedCount}/${hands.length})`)
      } catch (error) {
        errorCount++
        console.error(`[KAN-Trigger] Error saving hand ${hand.handNumber}:`, error)
      }
    }

    console.log(`[KAN-Trigger] Save complete: ${savedCount} saved, ${errorCount} errors`)

    // Stream 상태 업데이트 (완료)
    await supabase
      .from('streams')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', streamId)

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      saved: savedCount,
      errors: errorCount,
      total: hands.length
    }

  } catch (error) {
    console.error('[KAN-Trigger] Error saving results:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 단일 핸드를 데이터베이스에 저장
 */
async function saveHandToDatabase(
  supabase: any,
  streamId: string,
  hand: any
) {
  // 1. Hands 테이블에 저장
  const { data: insertedHand, error: handError } = await supabase
    .from('hands')
    .insert({
      day_id: streamId, // streams 테이블의 FK
      number: String(hand.handNumber),
      description: generateHandDescription(hand),
      timestamp: '00:00', // 타임스탬프는 나중에 업데이트 가능
      pot_size: hand.pot || 0,
      board_cards: formatBoardCards(hand.board),
      // 블라인드 정보 파싱 (stakes에서)
      small_blind: parseBlindFromStakes(hand.stakes, 'sb'),
      big_blind: parseBlindFromStakes(hand.stakes, 'bb'),
      ante: parseBlindFromStakes(hand.stakes, 'ante'),
    })
    .select()
    .single()

  if (handError || !insertedHand) {
    throw new Error(`Failed to insert hand: ${handError?.message}`)
  }

  const handId = insertedHand.id

  // 2. Players 확인 및 생성, Hand_players 저장
  for (const player of hand.players || []) {
    try {
      // 플레이어 이름 정규화 (소문자, 공백 제거)
      const normalizedName = player.name.toLowerCase().replace(/[^a-z0-9]/g, '')

      // 플레이어 조회 (normalized_name으로)
      let { data: existingPlayer } = await supabase
        .from('players')
        .select('id, name')
        .eq('normalized_name', normalizedName)
        .single()

      // 플레이어가 없으면 생성
      if (!existingPlayer) {
        const { data: newPlayer, error: playerError } = await supabase
          .from('players')
          .insert({
            name: player.name,
            normalized_name: normalizedName,
          })
          .select()
          .single()

        if (playerError) {
          console.error(`[KAN-Trigger] Error creating player ${player.name}:`, playerError)
          continue
        }

        existingPlayer = newPlayer
      }

      const playerId = existingPlayer.id

      // Winner 확인
      const isWinner = hand.winners?.some((w: any) =>
        w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
      ) || false

      // Hand_players 저장
      await supabase
        .from('hand_players')
        .insert({
          hand_id: handId,
          player_id: playerId,
          poker_position: player.position,
          hole_cards: player.holeCards, // ["As", "Kd"] 형식
          starting_stack: player.stackSize || 0,
          ending_stack: player.stackSize || 0, // 초기값
          seat: player.seat,
          is_winner: isWinner,
        })

    } catch (error) {
      console.error(`[KAN-Trigger] Error saving player ${player.name}:`, error)
    }
  }

  // 3. Hand_actions 저장
  let sequence = 1
  for (const action of hand.actions || []) {
    try {
      // 플레이어 이름으로 player_id 조회
      const normalizedName = action.player.toLowerCase().replace(/[^a-z0-9]/g, '')
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('normalized_name', normalizedName)
        .single()

      if (!player) {
        console.warn(`[KAN-Trigger] Player not found for action: ${action.player}`)
        continue
      }

      await supabase
        .from('hand_actions')
        .insert({
          hand_id: handId,
          player_id: player.id,
          street: action.street,
          action_type: action.action,
          amount: action.amount || 0,
          sequence: sequence++,
        })

    } catch (error) {
      console.error(`[KAN-Trigger] Error saving action:`, error)
    }
  }
}

/**
 * 핸드 설명 생성
 */
function generateHandDescription(hand: any): string {
  const players = hand.players || []
  if (players.length === 0) return 'Hand'

  const descriptions = players
    .filter((p: any) => p.holeCards && p.holeCards.length > 0)
    .map((p: any) => `${p.name} ${p.holeCards.join('')}`)
    .join(' / ')

  return descriptions || 'Hand'
}

/**
 * 보드 카드 포맷팅
 */
function formatBoardCards(board: any): string {
  if (!board) return ''

  const cards: string[] = []
  if (board.flop && Array.isArray(board.flop)) {
    cards.push(...board.flop)
  }
  if (board.turn) cards.push(board.turn)
  if (board.river) cards.push(board.river)

  return cards.join(' ')
}

/**
 * Stakes 문자열에서 블라인드 파싱
 * 예: "50k/100k/100k ante" → sb: 50000, bb: 100000, ante: 100000
 */
function parseBlindFromStakes(stakes: string | undefined, type: 'sb' | 'bb' | 'ante'): number {
  if (!stakes) return 0

  const parts = stakes.toLowerCase().split('/')

  if (type === 'sb' && parts[0]) {
    return parseChipAmount(parts[0])
  }

  if (type === 'bb' && parts[1]) {
    return parseChipAmount(parts[1])
  }

  if (type === 'ante' && parts[2]) {
    // "100k ante" 형식
    const anteStr = parts[2].replace('ante', '').trim()
    return parseChipAmount(anteStr)
  }

  return 0
}

/**
 * 칩 금액 파싱 (k, m 단위 지원)
 * 예: "50k" → 50000, "1.5m" → 1500000
 */
function parseChipAmount(str: string): number {
  const normalized = str.toLowerCase().trim()

  if (normalized.endsWith('k')) {
    return Math.floor(parseFloat(normalized) * 1000)
  }

  if (normalized.endsWith('m')) {
    return Math.floor(parseFloat(normalized) * 1000000)
  }

  return Math.floor(parseFloat(normalized) || 0)
}
