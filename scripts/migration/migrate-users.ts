/**
 * Supabase to Firestore Migration - Users
 *
 * Supabase users -> Firestore /users
 *
 * 사용법:
 *   npx tsx scripts/migration/migrate-users.ts
 *   npx tsx scripts/migration/migrate-users.ts --dry-run
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
  printMigrationResult,
  addIdMapping,
  Timestamp,
} from './config'

import type { FirestoreUser, UserRole } from '../../lib/firestore-types'

// ==================== Supabase Types ====================

interface SupabaseUser {
  id: string
  email: string
  nickname: string
  avatar_url: string | null
  role: string | null
  bio: string | null
  location: string | null
  website: string | null
  twitter_handle: string | null
  instagram_handle: string | null
  poker_experience: string | null
  profile_visibility: string | null
  posts_count: number | null
  comments_count: number | null
  likes_received: number | null
  is_banned: boolean | null
  ban_reason: string | null
  banned_at: string | null
  banned_by: string | null
  last_sign_in_at: string | null
  last_activity_at: string | null
  created_at: string | null
  updated_at: string | null
}

// ==================== Migration Function ====================

export async function migrateUsers(options: MigrationOptions): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    collection: 'users',
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    duration: 0,
  }

  logInfo('Starting users migration...')

  if (options.dryRun) {
    logInfo('DRY RUN MODE - No data will be written')
  }

  try {
    // 1. Supabase에서 users 조회
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    if (!users || users.length === 0) {
      logInfo('No users found in Supabase')
      result.duration = Date.now() - startTime
      return result
    }

    logInfo(`Found ${users.length} users in Supabase`)

    // 2. 각 사용자 마이그레이션
    let userIdx = 0

    for (const user of users) {
      try {
        const firestoreUser = transformUser(user)

        if (!options.dryRun) {
          const docRef = firestore.collection('users').doc(user.id)
          await docRef.set(firestoreUser)

          if (options.saveIdMapping) {
            addIdMapping(user.id, user.id, 'users')
          }
        }

        result.success++
        userIdx++
        logProgress(userIdx, users.length, 'users migrated', options)
      } catch (err) {
        result.failed++
        result.errors.push(`User ${user.id}: ${err}`)
        if (!options.continueOnError) throw err
        userIdx++
        logProgress(userIdx, users.length, 'users migrated', options)
      }
    }

    logSuccess(`Migrated ${result.success} users to Firestore`)
  } catch (error) {
    logError('Users migration', error, options)
    result.errors.push(`Fatal: ${error}`)
  }

  result.duration = Date.now() - startTime
  return result
}

// ==================== Transform Functions ====================

function transformRole(supabaseRole: string | null): UserRole {
  // Supabase roles -> Firestore roles
  const roleMap: Record<string, UserRole> = {
    admin: 'admin',
    high_templar: 'high_templar',
    templar: 'high_templar', // 기존 templar를 high_templar로 매핑
    arbiter: 'arbiter',
    reporter: 'reporter',
    user: 'user',
  }

  return roleMap[supabaseRole || 'user'] || 'user'
}

function transformUser(user: SupabaseUser): FirestoreUser {
  const createdAt = toTimestamp(user.created_at) || now()
  const updatedAt = toTimestamp(user.updated_at) || createdAt

  return {
    email: user.email,
    nickname: user.nickname || undefined,
    avatarUrl: user.avatar_url || undefined,
    role: transformRole(user.role),
    emailVerified: true, // Supabase 인증된 사용자만 존재
    stats: {
      postsCount: user.posts_count || 0,
      commentsCount: user.comments_count || 0,
    },
    createdAt: createdAt as Timestamp,
    updatedAt: updatedAt as Timestamp,
    lastLoginAt: toTimestamp(user.last_sign_in_at) || undefined,
  }
}

// ==================== Main ====================

async function main() {
  const options = parseCliOptions(process.argv.slice(2))
  const result = await migrateUsers(options)
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
