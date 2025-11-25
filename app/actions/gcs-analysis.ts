'use server'

/**
 * GCS Analysis - Trigger.dev Integration
 *
 * GCS에 업로드된 영상을 Vertex AI Gemini로 직접 분석하는 Server Action
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'
import type { GCSVideoAnalysisPayload } from '@/trigger/gcs-video-analysis'

export type KanPlatform = 'ept' | 'triton' | 'wsop'

export interface GcsAnalysisInput {
  streamId: string
  gcsUri: string
  segments: TimeSegment[]
  platform?: KanPlatform
  players?: string[]
}

export interface GcsAnalysisResult {
  success: boolean
  jobId?: string
  streamId?: string
  error?: string
}

/**
 * GCS 영상 분석 시작
 *
 * @param input 분석 입력 데이터
 * @returns 작업 ID 및 결과
 */
export async function startGcsAnalysis(
  input: GcsAnalysisInput
): Promise<GcsAnalysisResult> {
  try {
    const { streamId, gcsUri, segments, platform = 'ept', players = [] } = input

    console.log('[GCS-Analysis] Starting analysis with Trigger.dev')
    console.log(`[GCS-Analysis] GCS URI: ${gcsUri}`)
    console.log(`[GCS-Analysis] Segments: ${segments.length}`)
    console.log(`[GCS-Analysis] Platform: ${platform}`)
    console.log(`[GCS-Analysis] Players: ${players.length}`)

    // Stream ID 검증
    if (!streamId) {
      return {
        success: false,
        error: 'Stream ID가 필요합니다'
      }
    }

    // GCS URI 검증
    if (!gcsUri.startsWith('gs://')) {
      return {
        success: false,
        error: '올바른 GCS URI가 아닙니다 (gs://로 시작해야 함)'
      }
    }

    // Supabase 클라이언트 생성
    const supabase = await createServerSupabaseClient()

    // Stream 존재 확인
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, name, status, upload_status, gcs_uri')
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      return {
        success: false,
        error: `Stream을 찾을 수 없습니다: ${streamId}`
      }
    }

    // 업로드 상태 확인
    if (stream.upload_status !== 'uploaded') {
      return {
        success: false,
        error: '영상이 업로드되지 않았습니다. 먼저 영상을 업로드해주세요.'
      }
    }

    if (stream.gcs_uri !== gcsUri) {
      return {
        success: false,
        error: 'GCS URI가 일치하지 않습니다'
      }
    }

    // 세그먼트를 { start, end } 형식으로 변환
    const formattedSegments = segments.map(seg => ({
      start: seg.start,
      end: seg.end
    }))

    // Trigger.dev v4 작업 트리거
    const { tasks, configure } = await import("@trigger.dev/sdk")

    const secretKey = process.env.TRIGGER_SECRET_KEY
    console.log(`[GCS-Analysis] TRIGGER_SECRET_KEY exists: ${!!secretKey}`)

    if (!secretKey) {
      console.error('[GCS-Analysis] TRIGGER_SECRET_KEY is not set!')
      return {
        success: false,
        error: 'TRIGGER_SECRET_KEY가 설정되지 않았습니다'
      }
    }

    // Server Action에서 SDK 사용 시 configure 필요
    configure({
      secretKey: secretKey,
    })

    console.log('[GCS-Analysis] Triggering task: gcs-video-analysis')

    const payload: GCSVideoAnalysisPayload = {
      streamId,
      gcsUri,
      segments: formattedSegments,
      platform,
      players: players.length > 0 ? players : undefined,
    }

    console.log('[GCS-Analysis] Payload:', JSON.stringify(payload))

    const handle = await tasks.trigger("gcs-video-analysis", payload)

    console.log('[GCS-Analysis] Handle received:', JSON.stringify(handle))
    const jobId = handle.id

    console.log(`[GCS-Analysis] Job started: ${jobId}`)

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
    console.error('[GCS-Analysis] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }
  }
}

/**
 * Trigger.dev 작업 상태 조회
 *
 * @param jobId 작업 ID
 * @returns 작업 상태 및 결과
 */
export async function getGcsAnalysisStatus(jobId: string) {
  try {
    const { runs, configure } = await import("@trigger.dev/sdk")

    configure({
      secretKey: process.env.TRIGGER_SECRET_KEY,
    })

    const run = await runs.retrieve(jobId)

    return {
      id: run.id,
      status: run.status,
      output: run.output,
      error: run.error,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.isCompleted ? new Date() : undefined
    }

  } catch (error) {
    console.error('[GCS-Analysis] Error getting job status:', error)
    throw error
  }
}

/**
 * Trigger.dev 작업 결과를 Supabase에 저장
 *
 * @param jobId 작업 ID
 * @returns 저장 결과
 */
export async function saveGcsAnalysisResults(jobId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    // 작업 상태 조회
    const jobStatus = await getGcsAnalysisStatus(jobId)

    if (jobStatus.status !== 'COMPLETED') {
      return {
        success: false,
        error: `작업이 완료되지 않았습니다: ${jobStatus.status}`
      }
    }

    // 결과 파싱
    const { streamId, hands } = jobStatus.output || {}

    if (!streamId || !hands || !Array.isArray(hands)) {
      return {
        success: false,
        error: '잘못된 작업 결과입니다'
      }
    }

    console.log(`[GCS-Analysis] Saving ${hands.length} hands to stream ${streamId}`)

    // Stream 존재 확인
    const { data: stream } = await supabase
      .from('streams')
      .select('id, sub_event_id')
      .eq('id', streamId)
      .single()

    if (!stream) {
      return {
        success: false,
        error: `Stream을 찾을 수 없습니다: ${streamId}`
      }
    }

    let savedCount = 0
    let errorCount = 0

    // 각 핸드를 개별적으로 저장
    for (const hand of hands) {
      try {
        await saveHandToDatabase(supabase, streamId, hand)
        savedCount++
        console.log(`[GCS-Analysis] Saved hand ${hand.handNumber} (${savedCount}/${hands.length})`)
      } catch (error) {
        errorCount++
        console.error(`[GCS-Analysis] Error saving hand ${hand.handNumber}:`, error)
      }
    }

    console.log(`[GCS-Analysis] Save complete: ${savedCount} saved, ${errorCount} errors`)

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
    console.error('[GCS-Analysis] Error saving results:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
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
      day_id: streamId,
      number: String(hand.handNumber),
      description: generateHandDescription(hand),
      timestamp: '00:00',
      pot_size: hand.pot || 0,
      board_cards: formatBoardCards(hand.board),
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
      const normalizedName = player.name.toLowerCase().replace(/[^a-z0-9]/g, '')

      let { data: existingPlayer } = await supabase
        .from('players')
        .select('id, name')
        .eq('normalized_name', normalizedName)
        .single()

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
          console.error(`[GCS-Analysis] Error creating player ${player.name}:`, playerError)
          continue
        }

        existingPlayer = newPlayer
      }

      const playerId = existingPlayer.id

      const isWinner = hand.winners?.some((w: any) =>
        w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
      ) || false

      await supabase
        .from('hand_players')
        .insert({
          hand_id: handId,
          player_id: playerId,
          poker_position: player.position,
          hole_cards: player.holeCards,
          starting_stack: player.stackSize || 0,
          ending_stack: player.stackSize || 0,
          seat: player.seat,
          is_winner: isWinner,
        })

    } catch (error) {
      console.error(`[GCS-Analysis] Error saving player ${player.name}:`, error)
    }
  }

  // 3. Hand_actions 저장
  let sequence = 1
  for (const action of hand.actions || []) {
    try {
      const normalizedName = action.player.toLowerCase().replace(/[^a-z0-9]/g, '')
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('normalized_name', normalizedName)
        .single()

      if (!player) {
        console.warn(`[GCS-Analysis] Player not found for action: ${action.player}`)
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
      console.error(`[GCS-Analysis] Error saving action:`, error)
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
    const anteStr = parts[2].replace('ante', '').trim()
    return parseChipAmount(anteStr)
  }

  return 0
}

/**
 * 칩 금액 파싱
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
