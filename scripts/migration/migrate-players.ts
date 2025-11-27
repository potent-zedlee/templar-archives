/**
 * Supabase to Firestore Migration - Players
 *
 * Supabase players 테이블 -> Firestore /players 컬렉션
 *
 * 사용법:
 *   npx tsx scripts/migration/migrate-players.ts
 *   npx tsx scripts/migration/migrate-players.ts --dry-run
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
  printMigrationResult,
  addIdMapping,
  Timestamp,
} from './config'

import type { FirestorePlayer } from '../../lib/firestore-types'

interface SupabasePlayer {
  id: string
  name: string
  normalized_name: string
  aliases: string[] | null
  photo_url: string | null
  country: string | null
  is_pro: boolean | null
  bio: string | null
  total_winnings: number | null
  created_at: string | null
}

export async function migratePlayers(options: MigrationOptions): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    collection: 'players',
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    duration: 0,
  }

  logInfo('Starting players migration...')

  if (options.dryRun) {
    logInfo('DRY RUN MODE - No data will be written')
  }

  try {
    // 1. Supabase에서 players 조회
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!players || players.length === 0) {
      logInfo('No players found in Supabase')
      result.duration = Date.now() - startTime
      return result
    }

    logInfo(`Found ${players.length} players in Supabase`)

    // 2. 배치 처리
    const batches: SupabasePlayer[][] = []
    for (let i = 0; i < players.length; i += options.batchSize) {
      batches.push(players.slice(i, i + options.batchSize))
    }

    logInfo(`Processing ${batches.length} batches (size: ${options.batchSize})`)

    let processed = 0

    for (const batch of batches) {
      if (!options.dryRun) {
        const writeBatch = firestore.batch()

        for (const player of batch) {
          try {
            const docRef = firestore.collection('players').doc(player.id)
            const firestorePlayer = transformPlayer(player)
            writeBatch.set(docRef, firestorePlayer)

            if (options.saveIdMapping) {
              addIdMapping(player.id, player.id, 'players')
            }
          } catch (err) {
            result.failed++
            result.errors.push(`Player ${player.id}: ${err}`)
            if (!options.continueOnError) throw err
          }
        }

        await writeBatch.commit()
      }

      processed += batch.length
      result.success += batch.length
      logProgress(processed, players.length, 'players migrated', options)
    }

    logSuccess(`Migrated ${result.success} players to Firestore`)
  } catch (error) {
    logError('Players migration', error, options)
    result.errors.push(`Fatal: ${error}`)
  }

  result.duration = Date.now() - startTime
  return result
}

function transformPlayer(player: SupabasePlayer): FirestorePlayer {
  const createdAt = toTimestamp(player.created_at) || now()

  return {
    name: player.name,
    normalizedName: player.normalized_name,
    aliases: player.aliases || undefined,
    photoUrl: player.photo_url || undefined,
    country: player.country || undefined,
    isPro: player.is_pro || undefined,
    bio: player.bio || undefined,
    totalWinnings: player.total_winnings || undefined,
    stats: undefined, // 별도로 player_stats_cache에서 마이그레이션 필요시 추가
    createdAt: createdAt as Timestamp,
    updatedAt: createdAt as Timestamp,
  }
}

// Main execution (when run directly)
async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const result = await migratePlayers(options)
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
