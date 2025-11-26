/**
 * Hand Saver - DB 저장 유틸리티
 *
 * Trigger.dev task에서 직접 DB에 저장할 때 사용
 * Server Action과 Trigger.dev 양쪽에서 재사용 가능
 */

import { createClient } from '@supabase/supabase-js'
import type { ExtractedHand } from '../video/vertex-analyzer'

// Trigger.dev 환경에서 사용할 Supabase 클라이언트 생성
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not set')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })
}

export interface SaveHandsResult {
  success: boolean
  saved: number
  errors: number
  total: number
  error?: string
}

/**
 * 핸드 데이터를 DB에 저장
 *
 * @param streamId 스트림 ID
 * @param hands 추출된 핸드 배열
 * @returns 저장 결과
 */
export async function saveHandsToDatabase(
  streamId: string,
  hands: ExtractedHand[]
): Promise<SaveHandsResult> {
  const supabase = createSupabaseClient()

  console.log(`[HandSaver] Starting to save ${hands.length} hands to stream ${streamId}`)

  // Stream 존재 확인
  const { data: stream, error: streamError } = await supabase
    .from('streams')
    .select('id, sub_event_id')
    .eq('id', streamId)
    .single()

  if (streamError || !stream) {
    return {
      success: false,
      saved: 0,
      errors: 0,
      total: hands.length,
      error: `Stream not found: ${streamId}`
    }
  }

  let savedCount = 0
  let errorCount = 0

  // 각 핸드를 개별적으로 저장
  for (const hand of hands) {
    try {
      await saveSingleHand(supabase, streamId, hand)
      savedCount++

      if (savedCount % 10 === 0) {
        console.log(`[HandSaver] Progress: ${savedCount}/${hands.length}`)
      }
    } catch (error) {
      errorCount++
      console.error(`[HandSaver] Error saving hand ${hand.handNumber}:`, error)
    }
  }

  console.log(`[HandSaver] Complete: ${savedCount} saved, ${errorCount} errors`)

  return {
    success: true,
    saved: savedCount,
    errors: errorCount,
    total: hands.length
  }
}

/**
 * 스트림 상태 업데이트
 */
export async function updateStreamStatus(
  streamId: string,
  status: 'analyzing' | 'completed' | 'failed'
): Promise<void> {
  const supabase = createSupabaseClient()

  await supabase
    .from('streams')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', streamId)

  console.log(`[HandSaver] Stream ${streamId} status updated to: ${status}`)
}

/**
 * 단일 핸드를 DB에 저장
 */
async function saveSingleHand(
  supabase: ReturnType<typeof createClient>,
  streamId: string,
  hand: ExtractedHand
): Promise<void> {
  // 1. Hands 테이블에 저장
  // blinds를 함께 파싱 (제약 조건: 둘 다 NULL이거나 둘 다 NOT NULL이고 SB <= BB)
  const blinds = parseBlindsFromStakes(hand.stakes)

  const { data: insertedHand, error: handError } = await supabase
    .from('hands')
    .insert({
      day_id: streamId,
      number: String(hand.handNumber),
      description: generateHandDescription(hand),
      timestamp: formatTimestampDisplay(hand),
      video_timestamp_start: hand.absolute_timestamp_start ?? null,
      video_timestamp_end: hand.absolute_timestamp_end ?? null,
      pot_size: hand.pot || 0,
      board_cards: formatBoardCards(hand.board),
      small_blind: blinds.smallBlind,
      big_blind: blinds.bigBlind,
      ante: blinds.ante,
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
          console.error(`[HandSaver] Error creating player ${player.name}:`, playerError)
          continue
        }

        existingPlayer = newPlayer
      }

      const playerId = existingPlayer.id

      const isWinner = hand.winners?.some((w) =>
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
      console.error(`[HandSaver] Error saving player ${player.name}:`, error)
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
        console.warn(`[HandSaver] Player not found for action: ${action.player}`)
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
      console.error(`[HandSaver] Error saving action:`, error)
    }
  }
}

/**
 * 초 단위 타임스탬프를 표시용 문자열로 변환
 */
function formatSecondsToTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * 핸드의 타임코드를 표시용 문자열로 포맷팅
 */
function formatTimestampDisplay(hand: ExtractedHand): string {
  const start = hand.absolute_timestamp_start
  const end = hand.absolute_timestamp_end

  if (typeof start === 'number' && typeof end === 'number') {
    return `${formatSecondsToTimestamp(start)} ~ ${formatSecondsToTimestamp(end)}`
  }

  if (typeof start === 'number') {
    return formatSecondsToTimestamp(start)
  }

  // fallback: AI가 추출한 상대 타임코드 사용
  if (hand.timestamp_start && hand.timestamp_end) {
    return `${hand.timestamp_start} ~ ${hand.timestamp_end}`
  }

  if (hand.timestamp_start) {
    return hand.timestamp_start
  }

  return '00:00'
}

/**
 * 핸드 설명 생성
 */
function generateHandDescription(hand: ExtractedHand): string {
  const players = hand.players || []
  if (players.length === 0) return 'Hand'

  const descriptions = players
    .filter((p) => p.holeCards && p.holeCards.length > 0)
    .map((p) => `${p.name} ${p.holeCards?.join('') || ''}`)
    .join(' / ')

  return descriptions || 'Hand'
}

/**
 * 보드 카드 포맷팅
 */
function formatBoardCards(board: ExtractedHand['board']): string {
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
 * Stakes 문자열에서 블라인드 파싱 (통합)
 *
 * DB 제약 조건:
 * - small_blind/big_blind: 둘 다 NULL이거나, 둘 다 NOT NULL이고 SB <= BB
 * - small_blind/big_blind: NULL 또는 > 0
 * - ante: NULL 또는 >= 0
 */
interface ParsedBlinds {
  smallBlind: number | null
  bigBlind: number | null
  ante: number | null
}

function parseBlindsFromStakes(stakes: string | undefined): ParsedBlinds {
  const result: ParsedBlinds = {
    smallBlind: null,
    bigBlind: null,
    ante: null
  }

  if (!stakes) return result

  const parts = stakes.toLowerCase().split('/')

  // SB 파싱
  let sb: number | null = null
  if (parts[0]) {
    const value = parseChipAmount(parts[0])
    if (value > 0) sb = value
  }

  // BB 파싱
  let bb: number | null = null
  if (parts[1]) {
    const value = parseChipAmount(parts[1])
    if (value > 0) bb = value
  }

  // 제약 조건 검증: 둘 다 NULL이거나, 둘 다 NOT NULL이고 SB <= BB
  if (sb !== null && bb !== null) {
    // 둘 다 있는 경우: SB <= BB 검증
    if (sb <= bb) {
      result.smallBlind = sb
      result.bigBlind = bb
    } else {
      // SB > BB인 경우: 값을 swap하거나, 둘 다 NULL로 설정
      // 안전하게 swap 수행 (AI가 순서를 잘못 추출했을 가능성)
      result.smallBlind = bb
      result.bigBlind = sb
    }
  }
  // 한쪽만 있는 경우: 둘 다 NULL로 유지 (제약 조건 위반 방지)

  // Ante 파싱 (독립적)
  if (parts[2]) {
    const anteStr = parts[2].replace('ante', '').trim()
    const value = parseChipAmount(anteStr)
    if (value >= 0) result.ante = value
  }

  return result
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
