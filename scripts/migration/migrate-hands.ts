/**
 * Supabase to Firestore Migration - Hands
 *
 * Supabase hands + hand_players + hand_actions -> Firestore /hands (플랫)
 * players와 actions는 임베딩으로 저장
 *
 * 사용법:
 *   npx tsx scripts/migration/migrate-hands.ts
 *   npx tsx scripts/migration/migrate-hands.ts --dry-run
 */

import {
  supabase,
  firestore,
  MigrationOptions,
  MigrationResult,
  parseCliOptions,
  toTimestamp,
  now,
  logProgress,
  logError,
  logInfo,
  logSuccess,
  logWarning,
  printMigrationResult,
  addIdMapping,
  Timestamp,
} from './config'

import type {
  FirestoreHand,
  HandPlayerEmbedded,
  HandActionEmbedded,
  PokerPosition,
  PokerStreet,
  PokerActionType,
} from '../../lib/firestore-types'

// ==================== Supabase Types ====================

interface SupabaseHand {
  id: string
  day_id: string // stream_id
  number: string
  description: string
  timestamp: string
  board_flop: string[] | null
  board_turn: string | null
  board_river: string | null
  pot_size: number | null
  stakes: string | null
  ai_summary: string | null
  thumbnail_url: string | null
  favorite: boolean | null
  likes_count: number | null
  bookmarks_count: number | null
  video_timestamp_start: number | null
  video_timestamp_end: number | null
  job_id: string | null
  created_at: string | null
}

interface SupabaseHandPlayer {
  id: string
  hand_id: string
  player_id: string
  poker_position: string | null
  seat: number | null
  hole_cards: string[] | null
  cards: string | null
  starting_stack: number | null
  ending_stack: number | null
  is_winner: boolean | null
  hand_description: string | null
  created_at: string | null
}

interface SupabaseHandAction {
  id: string
  hand_id: string
  player_id: string
  street: string
  sequence: number
  action_type: string
  amount: number | null
  created_at: string | null
}

interface SupabasePlayer {
  id: string
  name: string
}

interface StreamWithHierarchy {
  id: string
  sub_event_id: string | null
  sub_event: {
    id: string
    tournament_id: string
  } | null
}

// ==================== Migration Function ====================

export async function migrateHands(options: MigrationOptions): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    collection: 'hands',
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    duration: 0,
  }

  logInfo('Starting hands migration...')

  if (options.dryRun) {
    logInfo('DRY RUN MODE - No data will be written')
  }

  try {
    // 1. 필요한 참조 데이터 조회
    logInfo('Fetching reference data...')

    // Players 이름 매핑
    const { data: players } = await supabase.from('players').select('id, name')
    const playerNameMap = new Map<string, string>()
    players?.forEach((p) => playerNameMap.set(p.id, p.name))
    logInfo(`Loaded ${playerNameMap.size} players for name lookup`)

    // Streams with hierarchy (tournament_id, event_id 조회)
    const { data: streams } = await supabase
      .from('streams')
      .select(
        `
        id,
        sub_event_id,
        sub_event:sub_events (
          id,
          tournament_id
        )
      `
      )
      .not('sub_event_id', 'is', null) as { data: StreamWithHierarchy[] | null }

    const streamHierarchyMap = new Map<
      string,
      { eventId: string; tournamentId: string }
    >()
    streams?.forEach((s) => {
      if (s.sub_event) {
        streamHierarchyMap.set(s.id, {
          eventId: s.sub_event.id,
          tournamentId: s.sub_event.tournament_id,
        })
      }
    })
    logInfo(`Loaded ${streamHierarchyMap.size} stream hierarchies`)

    // 2. Hands 조회
    const { data: hands, error: handsError } = await supabase
      .from('hands')
      .select('*')
      .order('created_at', { ascending: true })

    if (handsError) throw handsError
    if (!hands || hands.length === 0) {
      logInfo('No hands found in Supabase')
      result.duration = Date.now() - startTime
      return result
    }

    logInfo(`Found ${hands.length} hands`)

    // 3. Hand players 조회
    const { data: handPlayers } = await supabase.from('hand_players').select('*')
    const handPlayersMap = groupBy(handPlayers || [], 'hand_id')
    logInfo(`Loaded ${handPlayers?.length || 0} hand_players`)

    // 4. Hand actions 조회
    const { data: handActions } = await supabase
      .from('hand_actions')
      .select('*')
      .order('sequence', { ascending: true })
    const handActionsMap = groupBy(handActions || [], 'hand_id')
    logInfo(`Loaded ${handActions?.length || 0} hand_actions`)

    // 5. 배치 처리
    const batches: SupabaseHand[][] = []
    for (let i = 0; i < hands.length; i += options.batchSize) {
      batches.push(hands.slice(i, i + options.batchSize))
    }

    logInfo(`Processing ${batches.length} batches (size: ${options.batchSize})`)

    let processed = 0

    for (const batch of batches) {
      if (!options.dryRun) {
        const writeBatch = firestore.batch()

        for (const hand of batch) {
          try {
            // Hierarchy 조회
            const hierarchy = streamHierarchyMap.get(hand.day_id)
            if (!hierarchy) {
              // Unorganized stream - 스킵하거나 기본값 사용
              result.skipped++
              continue
            }

            // Players 임베딩 변환
            const players = (handPlayersMap[hand.id] || []).map((hp) =>
              transformHandPlayer(hp, playerNameMap)
            )

            // Actions 임베딩 변환
            const actions = (handActionsMap[hand.id] || []).map((ha) =>
              transformHandAction(ha, playerNameMap)
            )

            const firestoreHand = transformHand(
              hand,
              hierarchy.tournamentId,
              hierarchy.eventId,
              players,
              actions
            )

            const docRef = firestore.collection('hands').doc(hand.id)
            writeBatch.set(docRef, firestoreHand)

            if (options.saveIdMapping) {
              addIdMapping(hand.id, hand.id, 'hands')
            }
          } catch (err) {
            result.failed++
            result.errors.push(`Hand ${hand.id}: ${err}`)
            if (!options.continueOnError) throw err
          }
        }

        await writeBatch.commit()
      }

      processed += batch.length
      result.success += batch.length - result.skipped
      logProgress(processed, hands.length, 'hands processed', options)
    }

    logSuccess(
      `Migrated ${result.success} hands, skipped ${result.skipped} (unorganized)`
    )
  } catch (error) {
    logError('Hands migration', error, options)
    result.errors.push(`Fatal: ${error}`)
  }

  result.duration = Date.now() - startTime
  return result
}

// ==================== Transform Functions ====================

function transformHand(
  hand: SupabaseHand,
  tournamentId: string,
  eventId: string,
  players: HandPlayerEmbedded[],
  actions: HandActionEmbedded[]
): FirestoreHand {
  const createdAt = toTimestamp(hand.created_at) || now()

  return {
    streamId: hand.day_id,
    eventId,
    tournamentId,
    number: hand.number,
    description: hand.description,
    aiSummary: hand.ai_summary || undefined,
    timestamp: hand.timestamp,
    boardFlop: hand.board_flop || undefined,
    boardTurn: hand.board_turn || undefined,
    boardRiver: hand.board_river || undefined,
    potSize: hand.pot_size || undefined,
    videoTimestampStart: hand.video_timestamp_start || undefined,
    videoTimestampEnd: hand.video_timestamp_end || undefined,
    jobId: hand.job_id || undefined,
    players,
    actions,
    engagement: {
      likesCount: hand.likes_count || 0,
      bookmarksCount: hand.bookmarks_count || 0,
    },
    thumbnailUrl: hand.thumbnail_url || undefined,
    favorite: hand.favorite || undefined,
    createdAt: createdAt as Timestamp,
    updatedAt: createdAt as Timestamp,
  }
}

function transformHandPlayer(
  hp: SupabaseHandPlayer,
  playerNameMap: Map<string, string>
): HandPlayerEmbedded {
  // 카드 파싱: string | string[] 처리
  let cards: string[] | undefined
  if (hp.hole_cards && Array.isArray(hp.hole_cards)) {
    cards = hp.hole_cards
  } else if (hp.cards) {
    // "As Kd" 형태를 ["As", "Kd"]로 변환
    cards = hp.cards.split(/\s+/).filter(Boolean)
  }

  return {
    playerId: hp.player_id,
    name: playerNameMap.get(hp.player_id) || 'Unknown',
    position: hp.poker_position as PokerPosition | undefined,
    seat: hp.seat || undefined,
    cards,
    startStack: hp.starting_stack || undefined,
    endStack: hp.ending_stack || undefined,
    isWinner: hp.is_winner || undefined,
    handDescription: hp.hand_description || undefined,
  }
}

function transformHandAction(
  ha: SupabaseHandAction,
  playerNameMap: Map<string, string>
): HandActionEmbedded {
  return {
    playerId: ha.player_id,
    playerName: playerNameMap.get(ha.player_id) || 'Unknown',
    street: ha.street as PokerStreet,
    sequence: ha.sequence,
    actionType: ha.action_type as PokerActionType,
    amount: ha.amount || undefined,
  }
}

// ==================== Utility ====================

function groupBy<T extends Record<string, unknown>>(
  array: T[],
  key: keyof T
): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key] || 'undefined')
      if (!result[groupKey]) {
        result[groupKey] = []
      }
      result[groupKey].push(item)
      return result
    },
    {} as Record<string, T[]>
  )
}

// ==================== Main ====================

async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const result = await migrateHands(options)
  printMigrationResult(result)
  process.exit(result.failed > 0 ? 1 : 0)
}

// Only run main if this is the entry point
if (require.main === module) {
  main().catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
}
