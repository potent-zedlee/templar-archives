/**
 * Supabase to Firestore Migration - Posts & Comments
 *
 * Supabase posts -> Firestore /posts
 * Supabase comments -> Firestore /posts/{id}/comments
 *
 * 사용법:
 *   npx tsx scripts/migration/migrate-posts.ts
 *   npx tsx scripts/migration/migrate-posts.ts --dry-run
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

import type { FirestorePost, FirestoreComment, AuthorInfo } from '../../lib/firestore-types'

// ==================== Supabase Types ====================

interface SupabasePost {
  id: string
  title: string
  content: string
  author_id: string | null
  author_name: string
  author_avatar: string | null
  category: string
  likes_count: number | null
  comments_count: number | null
  is_hidden: boolean | null
  hand_id: string | null
  created_at: string | null
  updated_at: string | null
}

interface SupabaseComment {
  id: string
  post_id: string | null
  hand_id: string | null
  content: string
  author_id: string | null
  author_name: string
  author_avatar: string | null
  parent_comment_id: string | null
  likes_count: number | null
  is_hidden: boolean | null
  created_at: string | null
  updated_at: string | null
}

// ==================== Migration Function ====================

export async function migratePosts(options: MigrationOptions): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    collection: 'posts (+ comments)',
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
    duration: 0,
  }

  logInfo('Starting posts migration...')

  if (options.dryRun) {
    logInfo('DRY RUN MODE - No data will be written')
  }

  try {
    // 1. Posts 조회
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: true })

    if (postsError) throw postsError
    if (!posts || posts.length === 0) {
      logInfo('No posts found in Supabase')
      result.duration = Date.now() - startTime
      return result
    }

    logInfo(`Found ${posts.length} posts in Supabase`)

    // 2. Comments 조회 (post_id가 있는 것만)
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .not('post_id', 'is', null)
      .order('created_at', { ascending: true })

    if (commentsError) throw commentsError
    logInfo(`Found ${comments?.length || 0} comments for posts`)

    // Comments by post_id
    const commentsByPost = groupBy(comments || [], 'post_id')

    // 3. 각 포스트 마이그레이션
    let postIdx = 0

    for (const post of posts) {
      try {
        const postComments = commentsByPost[post.id] || []
        const firestorePost = transformPost(post)

        if (!options.dryRun) {
          const postRef = firestore.collection('posts').doc(post.id)
          await postRef.set(firestorePost)

          // Comments 서브컬렉션
          for (const comment of postComments) {
            const firestoreComment = transformComment(comment)
            const commentRef = postRef.collection('comments').doc(comment.id)
            await commentRef.set(firestoreComment)

            if (options.saveIdMapping) {
              addIdMapping(comment.id, comment.id, 'comments')
            }
          }

          if (options.saveIdMapping) {
            addIdMapping(post.id, post.id, 'posts')
          }
        }

        result.success++
        postIdx++
        logProgress(postIdx, posts.length, 'posts processed', options)
      } catch (err) {
        result.failed++
        result.errors.push(`Post ${post.id}: ${err}`)
        if (!options.continueOnError) throw err
        postIdx++
        logProgress(postIdx, posts.length, 'posts processed', options)
      }
    }

    logSuccess(
      `Migrated ${result.success} posts with ${comments?.length || 0} comments to Firestore`
    )
  } catch (error) {
    logError('Posts migration', error, options)
    result.errors.push(`Fatal: ${error}`)
  }

  result.duration = Date.now() - startTime
  return result
}

// ==================== Transform Functions ====================

function transformPost(post: SupabasePost): FirestorePost {
  const createdAt = toTimestamp(post.created_at) || now()
  const updatedAt = toTimestamp(post.updated_at) || createdAt

  const author: AuthorInfo = {
    id: post.author_id || 'anonymous',
    name: post.author_name,
    avatarUrl: post.author_avatar || undefined,
  }

  return {
    title: post.title,
    content: post.content,
    author,
    stats: {
      likesCount: post.likes_count || 0,
      commentsCount: post.comments_count || 0,
    },
    tags: post.category ? [post.category] : undefined,
    createdAt: createdAt as Timestamp,
    updatedAt: updatedAt as Timestamp,
  }
}

function transformComment(comment: SupabaseComment): FirestoreComment {
  const createdAt = toTimestamp(comment.created_at) || now()
  const updatedAt = toTimestamp(comment.updated_at) || createdAt

  const author: AuthorInfo = {
    id: comment.author_id || 'anonymous',
    name: comment.author_name,
    avatarUrl: comment.author_avatar || undefined,
  }

  return {
    content: comment.content,
    author,
    parentId: comment.parent_comment_id || undefined,
    createdAt: createdAt as Timestamp,
    updatedAt: updatedAt as Timestamp,
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
  const result = await migratePosts(options)
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
