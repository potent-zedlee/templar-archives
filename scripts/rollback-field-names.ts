/**
 * Firestore 필드명 롤백 스크립트 (snake_case → camelCase)
 *
 * 실행 방법:
 * - Dry run (미리보기): npx ts-node scripts/rollback-field-names.ts --dry-run
 * - 실제 롤백: npx ts-node scripts/rollback-field-names.ts
 * - 특정 컬렉션만: npx ts-node scripts/rollback-field-names.ts --collections=tournaments,events
 *
 * 이 스크립트는 migrate-field-names.ts의 변경을 되돌립니다.
 */

import * as admin from 'firebase-admin'

// Firebase Admin 초기화
if (admin.apps.length === 0) {
  try {
    if (process.env.FIREBASE_ADMIN_SDK_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'templar-archives-index',
      })
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'templar-archives-index',
      })
    } else {
      const serviceAccount = require('../gcs-service-account-key.json')
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'templar-archives-index',
      })
    }
  } catch (error) {
    console.error('Firebase Admin 초기화 실패:', error)
    process.exit(1)
  }
}

const db = admin.firestore()

/**
 * 필드명 매핑 (snake_case → camelCase로 역변환)
 */
const ROLLBACK_MAPPINGS = {
  tournaments: {
    category_info: 'categoryInfo',
    game_type: 'gameType',
    start_date: 'startDate',
    end_date: 'endDate',
    total_prize: 'totalPrize',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  events: {
    event_number: 'eventNumber',
    buy_in: 'buyIn',
    total_prize: 'totalPrize',
    entry_count: 'entryCount',
    blind_structure: 'blindStructure',
    level_duration: 'levelDuration',
    starting_stack: 'startingStack',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  streams: {
    video_url: 'videoUrl',
    video_file: 'videoFile',
    video_source: 'videoSource',
    published_at: 'publishedAt',
    gcs_path: 'gcsPath',
    gcs_uri: 'gcsUri',
    gcs_file_size: 'gcsFileSize',
    gcs_uploaded_at: 'gcsUploadedAt',
    upload_status: 'uploadStatus',
    video_duration: 'videoDuration',
    pipeline_status: 'pipelineStatus',
    pipeline_progress: 'pipelineProgress',
    pipeline_error: 'pipelineError',
    analysis_attempts: 'analysisAttempts',
    current_job_id: 'currentJobId',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  players: {
    normalized_name: 'normalizedName',
    photo_url: 'photoUrl',
    is_pro: 'isPro',
    total_winnings: 'totalWinnings',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  users: {
    avatar_url: 'avatarUrl',
    email_verified: 'emailVerified',
    poker_experience: 'pokerExperience',
    twitter_handle: 'twitterHandle',
    instagram_handle: 'instagramHandle',
    profile_visibility: 'profileVisibility',
    likes_received: 'likesReceived',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    last_login_at: 'lastLoginAt',
  },
  analysisJobs: {
    stream_id: 'streamId',
    user_id: 'userId',
    error_message: 'errorMessage',
    created_at: 'createdAt',
    started_at: 'startedAt',
    completed_at: 'completedAt',
  },
} as const

type CollectionName = keyof typeof ROLLBACK_MAPPINGS

interface RollbackOptions {
  dryRun: boolean
  collections?: CollectionName[]
}

interface RollbackStats {
  collection: string
  totalDocs: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ docId: string; error: string }>
}

/**
 * 단일 컬렉션 롤백
 */
async function rollbackCollection(
  collectionName: CollectionName,
  options: RollbackOptions
): Promise<RollbackStats> {
  const { dryRun } = options
  const mapping = ROLLBACK_MAPPINGS[collectionName]

  console.log(`\n=== 롤백: ${collectionName} ===`)
  console.log(`모드: ${dryRun ? 'DRY RUN (미리보기)' : '실제 실행'}`)

  const stats: RollbackStats = {
    collection: collectionName,
    totalDocs: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  const collectionRef = db.collection(collectionName)
  const snapshot = await collectionRef.get()
  stats.totalDocs = snapshot.size

  console.log(`총 ${stats.totalDocs}개 문서 발견`)

  if (stats.totalDocs === 0) {
    console.log('문서가 없어 스킵합니다.')
    return stats
  }

  const batchSize = 500
  let batch = db.batch()
  let batchCount = 0

  for (const doc of snapshot.docs) {
    const data = doc.data()

    // 롤백할 필드가 있는지 확인 (snake_case 필드가 존재하는지)
    const fieldsToRollback = Object.keys(mapping).filter(
      (snakeField) => snakeField in data
    )

    if (fieldsToRollback.length === 0) {
      stats.skipped++
      continue
    }

    try {
      const updates: Record<string, unknown> = {}
      const deletes: string[] = []

      // snake_case → camelCase 변환
      Object.entries(mapping).forEach(([snakeField, camelField]) => {
        if (snakeField in data) {
          updates[camelField] = data[snakeField]
          deletes.push(snakeField)
        }
      })

      if (!dryRun) {
        const updatePayload = {
          ...updates,
          ...Object.fromEntries(
            deletes.map((field) => [field, admin.firestore.FieldValue.delete()])
          ),
        }
        batch.update(doc.ref, updatePayload)
        batchCount++
      }

      stats.updated++

      if (stats.updated % 100 === 0) {
        console.log(`  진행 중... ${stats.updated}/${stats.totalDocs}`)
      }

      if (batchCount >= batchSize) {
        if (!dryRun) {
          await batch.commit()
          console.log(`  배치 커밋: ${stats.updated}개 업데이트됨`)
        }
        batch = db.batch()
        batchCount = 0
      }
    } catch (error) {
      stats.failed++
      stats.errors.push({
        docId: doc.id,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(`  오류 (${doc.id}):`, error)
    }
  }

  if (batchCount > 0 && !dryRun) {
    await batch.commit()
    console.log(`  최종 배치 커밋: ${stats.updated}개 업데이트됨`)
  }

  console.log(
    `완료: 업데이트=${stats.updated}, 스킵=${stats.skipped}, 실패=${stats.failed}`
  )

  if (stats.errors.length > 0) {
    console.log('\n오류 상세:')
    stats.errors.forEach(({ docId, error }) => {
      console.log(`  - ${docId}: ${error}`)
    })
  }

  return stats
}

/**
 * 서브컬렉션 롤백
 */
async function rollbackSubcollections(options: RollbackOptions): Promise<void> {
  const { dryRun } = options

  console.log('\n=== 서브컬렉션 롤백 ===')

  const tournamentsSnapshot = await db.collection('tournaments').get()
  console.log(
    `\n토너먼트 ${tournamentsSnapshot.size}개의 events 서브컬렉션 처리...`
  )

  let totalEventsProcessed = 0
  let totalStreamsProcessed = 0

  for (const tournamentDoc of tournamentsSnapshot.docs) {
    const eventsSnapshot = await tournamentDoc.ref.collection('events').get()

    if (eventsSnapshot.empty) continue

    const batchSize = 500
    let batch = db.batch()
    let batchCount = 0

    for (const eventDoc of eventsSnapshot.docs) {
      const data = eventDoc.data()
      const mapping = ROLLBACK_MAPPINGS.events

      const fieldsToRollback = Object.keys(mapping).filter(
        (snakeField) => snakeField in data
      )

      if (fieldsToRollback.length === 0) continue

      try {
        const updates: Record<string, unknown> = {}
        const deletes: string[] = []

        Object.entries(mapping).forEach(([snakeField, camelField]) => {
          if (snakeField in data) {
            updates[camelField] = data[snakeField]
            deletes.push(snakeField)
          }
        })

        if (!dryRun) {
          const updatePayload = {
            ...updates,
            ...Object.fromEntries(
              deletes.map((field) => [field, admin.firestore.FieldValue.delete()])
            ),
          }
          batch.update(eventDoc.ref, updatePayload)
          batchCount++
        }

        totalEventsProcessed++

        if (batchCount >= batchSize) {
          if (!dryRun) {
            await batch.commit()
          }
          batch = db.batch()
          batchCount = 0
        }

        // streams 서브컬렉션 처리
        const streamsSnapshot = await eventDoc.ref.collection('streams').get()
        if (streamsSnapshot.empty) continue

        let streamBatch = db.batch()
        let streamBatchCount = 0

        for (const streamDoc of streamsSnapshot.docs) {
          const streamData = streamDoc.data()
          const streamMapping = ROLLBACK_MAPPINGS.streams

          const streamFieldsToRollback = Object.keys(streamMapping).filter(
            (snakeField) => snakeField in streamData
          )

          if (streamFieldsToRollback.length === 0) continue

          try {
            const streamUpdates: Record<string, unknown> = {}
            const streamDeletes: string[] = []

            Object.entries(streamMapping).forEach(([snakeField, camelField]) => {
              if (snakeField in streamData) {
                streamUpdates[camelField] = streamData[snakeField]
                streamDeletes.push(snakeField)
              }
            })

            if (!dryRun) {
              const streamUpdatePayload = {
                ...streamUpdates,
                ...Object.fromEntries(
                  streamDeletes.map((field) => [
                    field,
                    admin.firestore.FieldValue.delete(),
                  ])
                ),
              }
              streamBatch.update(streamDoc.ref, streamUpdatePayload)
              streamBatchCount++
            }

            totalStreamsProcessed++

            if (streamBatchCount >= batchSize) {
              if (!dryRun) {
                await streamBatch.commit()
              }
              streamBatch = db.batch()
              streamBatchCount = 0
            }
          } catch (error) {
            console.error(`  스트림 오류 (${streamDoc.id}):`, error)
          }
        }

        if (streamBatchCount > 0 && !dryRun) {
          await streamBatch.commit()
        }
      } catch (error) {
        console.error(`  이벤트 오류 (${eventDoc.id}):`, error)
      }
    }

    if (batchCount > 0 && !dryRun) {
      await batch.commit()
    }
  }

  console.log(`총 events: ${totalEventsProcessed}개 처리`)
  console.log(`총 streams: ${totalStreamsProcessed}개 처리`)
}

/**
 * 모든 롤백 실행
 */
async function runRollback(options: RollbackOptions): Promise<void> {
  const { dryRun, collections } = options

  console.log('========================================')
  console.log(
    `Firestore 필드명 롤백 (snake_case → camelCase) ${dryRun ? '(DRY RUN)' : ''}`
  )
  console.log('========================================')

  const targetCollections: CollectionName[] =
    collections && collections.length > 0
      ? collections
      : (Object.keys(ROLLBACK_MAPPINGS) as CollectionName[])

  const allStats: RollbackStats[] = []

  // 1. 최상위 컬렉션 롤백
  for (const collectionName of targetCollections) {
    const stats = await rollbackCollection(collectionName, options)
    allStats.push(stats)
  }

  // 2. 서브컬렉션 롤백
  if (
    !collections ||
    collections.includes('events') ||
    collections.includes('streams')
  ) {
    await rollbackSubcollections(options)
  }

  // 최종 결과 요약
  console.log('\n========================================')
  console.log('롤백 결과 요약')
  console.log('========================================')

  let totalUpdated = 0
  let totalSkipped = 0
  let totalFailed = 0

  allStats.forEach((stats) => {
    console.log(`\n${stats.collection}:`)
    console.log(`  총 문서: ${stats.totalDocs}`)
    console.log(`  업데이트: ${stats.updated}`)
    console.log(`  스킵: ${stats.skipped}`)
    console.log(`  실패: ${stats.failed}`)

    totalUpdated += stats.updated
    totalSkipped += stats.skipped
    totalFailed += stats.failed
  })

  console.log('\n========================================')
  console.log(`전체 업데이트: ${totalUpdated}`)
  console.log(`전체 스킵: ${totalSkipped}`)
  console.log(`전체 실패: ${totalFailed}`)
  console.log('========================================')

  if (dryRun) {
    console.log('\nDRY RUN 모드: 실제 변경은 발생하지 않았습니다.')
    console.log('실제 롤백을 수행하려면 --dry-run 옵션을 제거하세요.')
  }
}

/**
 * CLI 인자 파싱
 */
function parseArgs(): RollbackOptions {
  const args = process.argv.slice(2)

  const options: RollbackOptions = {
    dryRun: args.includes('--dry-run'),
  }

  const collectionsArg = args.find((arg) => arg.startsWith('--collections='))
  if (collectionsArg) {
    const collectionsStr = collectionsArg.split('=')[1]
    options.collections = collectionsStr.split(',') as CollectionName[]
  }

  return options
}

// 스크립트 실행
const options = parseArgs()

runRollback(options)
  .then(() => {
    console.log('\n롤백 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n롤백 실패:', error)
    process.exit(1)
  })
