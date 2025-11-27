/**
 * Supabase to Firestore Migration - Tournaments
 *
 * Supabase tournaments -> Firestore /tournaments
 * Supabase sub_events -> Firestore /tournaments/{id}/events
 * Supabase streams -> Firestore /tournaments/{id}/events/{id}/streams
 *
 * 사용법:
 *   npx tsx scripts/migration/migrate-tournaments.ts
 *   npx tsx scripts/migration/migrate-tournaments.ts --dry-run
 */

import {
  supabase,
  firestore,
  MigrationOptions,
  MigrationResult,
  defaultOptions,
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
  FirestoreTournament,
  FirestoreEvent,
  FirestoreStream,
  TournamentCategory,
  VideoSource,
  Stats,
} from '../../lib/firestore-types'

// ==================== Supabase Types ====================
interface SupabaseTournament {
  id: string
  name: string
  category: string
  category_id: string
  category_logo: string | null
  location: string
  city: string | null
  country: string | null
  game_type: string
  start_date: string
  end_date: string
  created_at: string | null
}

interface SupabaseSubEvent {
  id: string
  tournament_id: string
  name: string
  event_number: string | null
  date: string
  buy_in: string | null
  total_prize: string | null
  winner: string | null
  entry_count: number | null
  blind_structure: string | null
  level_duration: number | null
  starting_stack: number | null
  notes: string | null
  created_at: string | null
}

interface SupabaseStream {
  id: string
  sub_event_id: string | null
  name: string
  video_url: string | null
  video_file: string | null
  video_source: string | null
  video_nas_path: string | null
  published_at: string | null
  is_organized: boolean | null
  organized_at: string | null
  created_at: string | null
}

// ==================== Migration Functions ====================

export async function migrateTournaments(options: MigrationOptions): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    collection: 'tournaments (+ events, streams)',
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    duration: 0,
  }

  logInfo('Starting tournaments migration...')

  if (options.dryRun) {
    logInfo('DRY RUN MODE - No data will be written')
  }

  try {
    // 1. Supabase에서 tournaments 조회
    const { data: tournaments, error: tourError } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: false })

    if (tourError) throw tourError
    if (!tournaments || tournaments.length === 0) {
      logInfo('No tournaments found in Supabase')
      result.duration = Date.now() - startTime
      return result
    }

    logInfo(`Found ${tournaments.length} tournaments`)

    // 2. sub_events 조회
    const { data: subEvents, error: subError } = await supabase
      .from('sub_events')
      .select('*')
      .order('date', { ascending: true })

    if (subError) throw subError
    logInfo(`Found ${subEvents?.length || 0} sub_events (-> events)`)

    // 3. streams 조회
    const { data: streams, error: streamError } = await supabase.from('streams').select('*')

    if (streamError) throw streamError
    logInfo(`Found ${streams?.length || 0} streams`)

    // 4. hands 카운트 조회 (통계용)
    const { data: handCounts } = await supabase
      .from('hands')
      .select('day_id')
      .then((res) => {
        const counts: Record<string, number> = {}
        res.data?.forEach((h) => {
          counts[h.day_id] = (counts[h.day_id] || 0) + 1
        })
        return { data: counts }
      })

    // 5. 데이터 그룹화
    const subEventsByTournament = groupBy(subEvents || [], 'tournament_id')
    const streamsBySubEvent = groupBy(streams || [], 'sub_event_id')

    // 6. 각 토너먼트 마이그레이션
    let tournamentIdx = 0

    for (const tournament of tournaments) {
      try {
        const tournamentEvents = subEventsByTournament[tournament.id] || []

        // 통계 계산
        let totalStreams = 0
        let totalHands = 0

        for (const event of tournamentEvents) {
          const eventStreams = streamsBySubEvent[event.id] || []
          totalStreams += eventStreams.length

          for (const stream of eventStreams) {
            totalHands += handCounts?.[stream.id] || 0
          }
        }

        const tournamentStats: Stats = {
          eventsCount: tournamentEvents.length,
          streamsCount: totalStreams,
          handsCount: totalHands,
        }

        // Tournament 문서 생성
        const firestoreTournament = transformTournament(tournament, tournamentStats)

        if (!options.dryRun) {
          const tournamentRef = firestore.collection('tournaments').doc(tournament.id)
          await tournamentRef.set(firestoreTournament)

          // Events 서브컬렉션 생성
          for (const event of tournamentEvents) {
            const eventStreams = streamsBySubEvent[event.id] || []

            // Event 통계
            let eventHands = 0
            for (const stream of eventStreams) {
              eventHands += handCounts?.[stream.id] || 0
            }

            const eventStats: Stats = {
              streamsCount: eventStreams.length,
              handsCount: eventHands,
            }

            const firestoreEvent = transformEvent(event, eventStats)
            const eventRef = tournamentRef.collection('events').doc(event.id)
            await eventRef.set(firestoreEvent)

            // Streams 서브컬렉션 생성
            for (const stream of eventStreams) {
              const streamHands = handCounts?.[stream.id] || 0
              const streamStats: Stats = {
                handsCount: streamHands,
              }

              const firestoreStream = transformStream(stream, streamStats)
              const streamRef = eventRef.collection('streams').doc(stream.id)
              await streamRef.set(firestoreStream)

              if (options.saveIdMapping) {
                addIdMapping(stream.id, stream.id, 'streams')
              }
            }

            if (options.saveIdMapping) {
              addIdMapping(event.id, event.id, 'events')
            }
          }

          if (options.saveIdMapping) {
            addIdMapping(tournament.id, tournament.id, 'tournaments')
          }
        }

        result.success++
        tournamentIdx++
        logProgress(tournamentIdx, tournaments.length, 'tournaments processed', options)
      } catch (err) {
        result.failed++
        result.errors.push(`Tournament ${tournament.id}: ${err}`)
        if (!options.continueOnError) throw err
        tournamentIdx++
        logProgress(tournamentIdx, tournaments.length, 'tournaments processed', options)
      }
    }

    logSuccess(
      `Migrated ${result.success} tournaments with events and streams`
    )
  } catch (error) {
    logError('Tournaments migration', error, options)
    result.errors.push(`Fatal: ${error}`)
  }

  result.duration = Date.now() - startTime
  return result
}

// ==================== Transform Functions ====================

function transformTournament(
  tournament: SupabaseTournament,
  stats: Stats
): FirestoreTournament {
  const createdAt = toTimestamp(tournament.created_at) || now()

  return {
    name: tournament.name,
    category: tournament.category as TournamentCategory,
    categoryInfo: {
      id: tournament.category_id,
      name: tournament.category as TournamentCategory,
      logo: tournament.category_logo || undefined,
    },
    location: tournament.location,
    city: tournament.city || undefined,
    country: tournament.country || undefined,
    gameType: tournament.game_type === 'cash_game' ? 'cash-game' : 'tournament',
    startDate: toTimestamp(tournament.start_date) || now(),
    endDate: toTimestamp(tournament.end_date) || now(),
    status: 'published',
    stats,
    createdAt: createdAt as Timestamp,
    updatedAt: createdAt as Timestamp,
  }
}

function transformEvent(event: SupabaseSubEvent, stats: Stats): FirestoreEvent {
  const createdAt = toTimestamp(event.created_at) || now()

  return {
    name: event.name,
    eventNumber: event.event_number || undefined,
    date: toTimestamp(event.date) || now(),
    buyIn: event.buy_in || undefined,
    totalPrize: event.total_prize || undefined,
    winner: event.winner || undefined,
    entryCount: event.entry_count || undefined,
    blindStructure: event.blind_structure || undefined,
    levelDuration: event.level_duration || undefined,
    startingStack: event.starting_stack || undefined,
    notes: event.notes || undefined,
    status: 'published',
    stats,
    createdAt: createdAt as Timestamp,
    updatedAt: createdAt as Timestamp,
  }
}

function transformStream(stream: SupabaseStream, stats: Stats): FirestoreStream {
  const createdAt = toTimestamp(stream.created_at) || now()

  let videoSource: VideoSource | undefined
  if (stream.video_source === 'youtube') videoSource = 'youtube'
  else if (stream.video_source === 'upload') videoSource = 'upload'
  else if (stream.video_source === 'nas') videoSource = 'nas'

  return {
    name: stream.name,
    videoUrl: stream.video_url || undefined,
    videoFile: stream.video_file || undefined,
    videoSource,
    publishedAt: toTimestamp(stream.published_at) || undefined,
    status: stream.is_organized ? 'published' : 'draft',
    stats,
    createdAt: createdAt as Timestamp,
    updatedAt: createdAt as Timestamp,
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
  const result = await migrateTournaments(options)
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
