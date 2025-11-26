/**
 * Hand Saver - DB 저장 유틸리티
 *
 * 기존 lib/database/hand-saver.ts 포팅
 * Cloud Run 환경에 최적화
 */

import { createClient } from '@supabase/supabase-js'
import type { ExtractedHand } from './vertex-analyzer'

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not set')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })
}

export interface SaveHandsResult {
  success: boolean
  saved: number
  errors: number
  total: number
  error?: string
}

export async function saveHandsToDatabase(
  streamId: string,
  hands: ExtractedHand[]
): Promise<SaveHandsResult> {
  const supabase = createSupabaseClient()

  console.log(
    `[HandSaver] Starting to save ${hands.length} hands to stream ${streamId}`
  )

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
      error: `Stream not found: ${streamId}`,
    }
  }

  let savedCount = 0
  let errorCount = 0

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
    total: hands.length,
  }
}

export async function updateStreamStatus(
  streamId: string,
  status: 'analyzing' | 'completed' | 'failed'
): Promise<void> {
  const supabase = createSupabaseClient()

  await supabase
    .from('streams')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', streamId)

  console.log(`[HandSaver] Stream ${streamId} status updated to: ${status}`)
}

async function saveSingleHand(
  supabase: ReturnType<typeof createClient>,
  streamId: string,
  hand: ExtractedHand
): Promise<void> {
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

  // Players
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
          console.error(
            `[HandSaver] Error creating player ${player.name}:`,
            playerError
          )
          continue
        }

        existingPlayer = newPlayer
      }

      const playerId = existingPlayer.id

      const isWinner =
        hand.winners?.some(
          (w) =>
            w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
        ) || false

      await supabase.from('hand_players').insert({
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

  // Actions
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
        console.warn(
          `[HandSaver] Player not found for action: ${action.player}`
        )
        continue
      }

      await supabase.from('hand_actions').insert({
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

function formatSecondsToTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatTimestampDisplay(hand: ExtractedHand): string {
  const start = hand.absolute_timestamp_start
  const end = hand.absolute_timestamp_end

  if (typeof start === 'number' && typeof end === 'number') {
    return `${formatSecondsToTimestamp(start)} ~ ${formatSecondsToTimestamp(end)}`
  }

  if (typeof start === 'number') {
    return formatSecondsToTimestamp(start)
  }

  if (hand.timestamp_start && hand.timestamp_end) {
    return `${hand.timestamp_start} ~ ${hand.timestamp_end}`
  }

  if (hand.timestamp_start) {
    return hand.timestamp_start
  }

  return '00:00'
}

function generateHandDescription(hand: ExtractedHand): string {
  const players = hand.players || []
  if (players.length === 0) return 'Hand'

  const descriptions = players
    .filter((p) => p.holeCards && p.holeCards.length > 0)
    .map((p) => `${p.name} ${p.holeCards?.join('') || ''}`)
    .join(' / ')

  return descriptions || 'Hand'
}

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

interface ParsedBlinds {
  smallBlind: number | null
  bigBlind: number | null
  ante: number | null
}

function parseBlindsFromStakes(stakes: string | undefined): ParsedBlinds {
  const result: ParsedBlinds = {
    smallBlind: null,
    bigBlind: null,
    ante: null,
  }

  if (!stakes) return result

  const parts = stakes.toLowerCase().split('/')

  let sb: number | null = null
  if (parts[0]) {
    const value = parseChipAmount(parts[0])
    if (value > 0) sb = value
  }

  let bb: number | null = null
  if (parts[1]) {
    const value = parseChipAmount(parts[1])
    if (value > 0) bb = value
  }

  if (sb !== null && bb !== null) {
    if (sb <= bb) {
      result.smallBlind = sb
      result.bigBlind = bb
    } else {
      result.smallBlind = bb
      result.bigBlind = sb
    }
  }

  if (parts[2]) {
    const anteStr = parts[2].replace('ante', '').trim()
    const value = parseChipAmount(anteStr)
    if (value >= 0) result.ante = value
  }

  return result
}

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
