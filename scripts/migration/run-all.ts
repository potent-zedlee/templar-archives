/**
 * Supabase to Firestore Migration - Run All
 *
 * 모든 마이그레이션을 순서대로 실행
 *
 * 사용법:
 *   npx tsx scripts/migration/run-all.ts
 *   npx tsx scripts/migration/run-all.ts --dry-run
 *   npx tsx scripts/migration/run-all.ts --only=players,hands
 *   npx tsx scripts/migration/run-all.ts --skip=posts
 */

import * as fs from 'fs'
import * as path from 'path'

import {
  MigrationOptions,
  MigrationResult,
  parseCliOptions,
  logInfo,
  logSuccess,
  logError,
  logWarning,
  printMigrationResult,
  getAllMappings,
} from './config'

import { migratePlayers } from './migrate-players'
import { migrateTournaments } from './migrate-tournaments'
import { migrateHands } from './migrate-hands'
import { migrateUsers } from './migrate-users'
import { migratePosts } from './migrate-posts'

// ==================== Migration Order ====================

interface MigrationTask {
  name: string
  description: string
  order: number
  run: (options: MigrationOptions) => Promise<MigrationResult>
}

const MIGRATIONS: MigrationTask[] = [
  {
    name: 'players',
    description: 'Players collection',
    order: 1,
    run: migratePlayers,
  },
  {
    name: 'tournaments',
    description: 'Tournaments with events and streams',
    order: 2,
    run: migrateTournaments,
  },
  {
    name: 'hands',
    description: 'Hands with embedded players and actions',
    order: 3,
    run: migrateHands,
  },
  {
    name: 'users',
    description: 'Users collection',
    order: 4,
    run: migrateUsers,
  },
  {
    name: 'posts',
    description: 'Posts with comments',
    order: 5,
    run: migratePosts,
  },
]

// ==================== Main Function ====================

async function runAllMigrations(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseCliOptions(args)

  // Parse --only and --skip options
  let onlyMigrations: string[] | null = null
  let skipMigrations: string[] = []

  for (const arg of args) {
    if (arg.startsWith('--only=')) {
      onlyMigrations = arg
        .split('=')[1]
        .split(',')
        .map((s) => s.trim())
    }
    if (arg.startsWith('--skip=')) {
      skipMigrations = arg
        .split('=')[1]
        .split(',')
        .map((s) => s.trim())
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('  SUPABASE TO FIRESTORE MIGRATION')
  console.log('='.repeat(70))

  if (options.dryRun) {
    logWarning('DRY RUN MODE - No data will be written to Firestore')
  }

  console.log(`\nConfiguration:`)
  console.log(`  Batch Size: ${options.batchSize}`)
  console.log(`  Continue on Error: ${options.continueOnError}`)
  console.log(`  Save ID Mapping: ${options.saveIdMapping}`)
  console.log(`  Verbose: ${options.verbose}`)

  if (onlyMigrations) {
    console.log(`  Only: ${onlyMigrations.join(', ')}`)
  }
  if (skipMigrations.length > 0) {
    console.log(`  Skip: ${skipMigrations.join(', ')}`)
  }

  console.log('\n')

  // Determine which migrations to run
  let migrationsToRun = [...MIGRATIONS]

  if (onlyMigrations) {
    migrationsToRun = migrationsToRun.filter((m) => onlyMigrations!.includes(m.name))
  }

  migrationsToRun = migrationsToRun.filter((m) => !skipMigrations.includes(m.name))

  if (migrationsToRun.length === 0) {
    logWarning('No migrations to run. Check your --only or --skip options.')
    process.exit(0)
  }

  logInfo(`Running ${migrationsToRun.length} migrations...\n`)

  const allResults: MigrationResult[] = []
  const startTime = Date.now()

  // Run migrations in order
  for (const migration of migrationsToRun.sort((a, b) => a.order - b.order)) {
    console.log('\n' + '-'.repeat(60))
    logInfo(`Starting: ${migration.name} (${migration.description})`)
    console.log('-'.repeat(60))

    try {
      const result = await migration.run(options)
      allResults.push(result)
      printMigrationResult(result)

      if (result.failed > 0 && !options.continueOnError) {
        logError('Stopping due to errors', new Error('Migration failed'), options)
        break
      }
    } catch (error) {
      logError(`Migration ${migration.name} failed`, error, options)
      allResults.push({
        collection: migration.name,
        success: 0,
        failed: 1,
        skipped: 0,
        errors: [`Fatal: ${error}`],
        duration: 0,
      })

      if (!options.continueOnError) {
        break
      }
    }
  }

  // Summary
  const totalDuration = Date.now() - startTime
  console.log('\n' + '='.repeat(70))
  console.log('  MIGRATION SUMMARY')
  console.log('='.repeat(70))

  let totalSuccess = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const result of allResults) {
    console.log(
      `  ${result.collection.padEnd(35)} | Success: ${result.success.toString().padStart(5)} | Failed: ${result.failed.toString().padStart(4)} | Skipped: ${result.skipped.toString().padStart(4)}`
    )
    totalSuccess += result.success
    totalFailed += result.failed
    totalSkipped += result.skipped
  }

  console.log('-'.repeat(70))
  console.log(
    `  ${'TOTAL'.padEnd(35)} | Success: ${totalSuccess.toString().padStart(5)} | Failed: ${totalFailed.toString().padStart(4)} | Skipped: ${totalSkipped.toString().padStart(4)}`
  )
  console.log('-'.repeat(70))
  console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)

  // Save ID mappings
  if (options.saveIdMapping && !options.dryRun) {
    const mappings = getAllMappings()
    if (mappings.length > 0) {
      const mappingDir = path.resolve(process.cwd(), 'scripts/migration')
      const mappingPath = path.join(
        mappingDir,
        `id-mappings-${new Date().toISOString().split('T')[0]}.json`
      )
      fs.writeFileSync(mappingPath, JSON.stringify(mappings, null, 2))
      logInfo(`ID mappings saved to: ${mappingPath}`)
      logInfo(`Total mappings: ${mappings.length}`)
    }
  }

  console.log('='.repeat(70) + '\n')

  // Exit code
  if (totalFailed > 0) {
    logWarning(`Migration completed with ${totalFailed} failures`)
    process.exit(1)
  } else {
    logSuccess('All migrations completed successfully!')
    process.exit(0)
  }
}

// ==================== Entry Point ====================

runAllMigrations().catch((err) => {
  console.error('Migration runner failed:', err)
  process.exit(1)
})
