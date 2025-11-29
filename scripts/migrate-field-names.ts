/**
 * Firestore 필드명 마이그레이션 스크립트 (camelCase → snake_case)
 *
 * 실행 방법:
 * - Dry run (미리보기): npx ts-node scripts/migrate-field-names.ts --dry-run
 * - 실제 마이그레이션: npx ts-node scripts/migrate-field-names.ts
 * - 특정 컬렉션만: npx ts-node scripts/migrate-field-names.ts --collections=tournaments,events
 *
 * 롤백:
 * npx ts-node scripts/migrate-field-names.ts --rollback
 */

import * as admin from 'firebase-admin'

// Firebase Admin 초기화
if (admin.apps.length === 0) {
  try {
    // 1. FIREBASE_ADMIN_SDK_KEY 환경변수 (JSON 문자열)
    if (process.env.FIREBASE_ADMIN_SDK_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'templar-archives-index',
      })
    }
    // 2. GOOGLE_APPLICATION_CREDENTIALS 파일 경로
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'templar-archives-index',
      })
    }
    // 3. 로컬 서비스 계정 키 파일
    else {
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
 * 필드명 매핑 정의 (camelCase → snake_case)
 */
const FIELD_MAPPINGS = {
  tournaments: {
    categoryInfo: 'category_info',
    gameType: 'game_type',
    startDate: 'start_date',
    endDate: 'end_date',
    totalPrize: 'total_prize',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  events: {
    eventNumber: 'event_number',
    buyIn: 'buy_in',
    totalPrize: 'total_prize',
    entryCount: 'entry_count',
    blindStructure: 'blind_structure',
    levelDuration: 'level_duration',
    startingStack: 'starting_stack',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  streams: {
    videoUrl: 'video_url',
    videoFile: 'video_file',
    videoSource: 'video_source',
    publishedAt: 'published_at',
    gcsPath: 'gcs_path',
    gcsUri: 'gcs_uri',
    gcsFileSize: 'gcs_file_size',
    gcsUploadedAt: 'gcs_uploaded_at',
    uploadStatus: 'upload_status',
    videoDuration: 'video_duration',
    pipelineStatus: 'pipeline_status',
    pipelineProgress: 'pipeline_progress',
    pipelineError: 'pipeline_error',
    analysisAttempts: 'analysis_attempts',
    currentJobId: 'current_job_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  players: {
    normalizedName: 'normalized_name',
    photoUrl: 'photo_url',
    isPro: 'is_pro',
    totalWinnings: 'total_winnings',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  users: {
    avatarUrl: 'avatar_url',
    emailVerified: 'email_verified',
    pokerExperience: 'poker_experience',
    twitterHandle: 'twitter_handle',
    instagramHandle: 'instagram_handle',
    profileVisibility: 'profile_visibility',
    likesReceived: 'likes_received',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    lastLoginAt: 'last_login_at',
  },
  analysisJobs: {
    streamId: 'stream_id',
    userId: 'user_id',
    errorMessage: 'error_message',
    createdAt: 'created_at',
    startedAt: 'started_at',
    completedAt: 'completed_at',
  },
} as const

type CollectionName = keyof typeof FIELD_MAPPINGS

interface MigrationOptions {
  dryRun: boolean
  rollback: boolean
  collections?: CollectionName[]
}

interface MigrationStats {
  collection: string
  totalDocs: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ docId: string; error: string }>
}

/**
 * 필드 변환 (forward 또는 rollback)
 */
function transformFields(
  data: Record<string, unknown>,
  mapping: Record<string, string>,
  isRollback: boolean
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {}
  const reverseMapping = isRollback
    ? Object.fromEntries(Object.entries(mapping).map(([k, v]) => [v, k]))
    : mapping

  for (const [key, value] of Object.entries(data)) {
    const newKey = reverseMapping[key] || key
    transformed[newKey] = value
  }

  return transformed
}

/**
 * 단일 컬렉션 마이그레이션
 */
async function migrateCollection(
  collectionName: CollectionName,
  options: MigrationOptions
): Promise<MigrationStats> {
  const { dryRun, rollback } = options
  const mapping = FIELD_MAPPINGS[collectionName]

  console.log(
    `\n=== ${rollback ? '롤백' : '마이그레이션'}: ${collectionName} ===`
  )
  console.log(`모드: ${dryRun ? 'DRY RUN (미리보기)' : '실제 실행'}`)

  const stats: MigrationStats = {
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

    // 변환할 필드가 있는지 확인
    const fieldsToMigrate = rollback
      ? Object.values(mapping).filter((snakeField) => snakeField in data)
      : Object.keys(mapping).filter((camelField) => camelField in data)

    if (fieldsToMigrate.length === 0) {
      stats.skipped++
      continue
    }

    try {
      const updates: Record<string, unknown> = {}
      const deletes: string[] = []

      if (rollback) {
        // 롤백: snake_case → camelCase
        Object.entries(mapping).forEach(([camelField, snakeField]) => {
          if (snakeField in data) {
            updates[camelField] = data[snakeField]
            deletes.push(snakeField)
          }
        })
      } else {
        // Forward: camelCase → snake_case
        Object.entries(mapping).forEach(([camelField, snakeField]) => {
          if (camelField in data) {
            updates[snakeField] = data[camelField]
            deletes.push(camelField)
          }
        })
      }

      if (!dryRun) {
        // 새 필드 추가 & 기존 필드 삭제
        const updatePayload = {
          ...updates,
          ...Object.fromEntries(deletes.map((field) => [field, admin.firestore.FieldValue.delete()])),
        }
        batch.update(doc.ref, updatePayload)
        batchCount++
      }

      stats.updated++

      // 진행 상황 로깅
      if (stats.updated % 100 === 0) {
        console.log(`  진행 중... ${stats.updated}/${stats.totalDocs}`)
      }

      // 배치 커밋
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

  // 남은 배치 커밋
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
 * 서브컬렉션 마이그레이션 (tournaments/{id}/events, events/{id}/streams)
 */
async function migrateSubcollections(options: MigrationOptions): Promise<void> {
  const { dryRun, rollback } = options

  console.log(
    `\n=== 서브컬렉션 ${rollback ? '롤백' : '마이그레이션'} ===`
  )

  // 1. tournaments/{id}/events
  const tournamentsSnapshot = await db.collection('tournaments').get()
  console.log(`\n토너먼트 ${tournamentsSnapshot.size}개의 events 서브컬렉션 처리...`)

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
      const mapping = FIELD_MAPPINGS.events

      const fieldsToMigrate = rollback
        ? Object.values(mapping).filter((snakeField) => snakeField in data)
        : Object.keys(mapping).filter((camelField) => camelField in data)

      if (fieldsToMigrate.length === 0) continue

      try {
        const updates: Record<string, unknown> = {}
        const deletes: string[] = []

        if (rollback) {
          Object.entries(mapping).forEach(([camelField, snakeField]) => {
            if (snakeField in data) {
              updates[camelField] = data[snakeField]
              deletes.push(snakeField)
            }
          })
        } else {
          Object.entries(mapping).forEach(([camelField, snakeField]) => {
            if (camelField in data) {
              updates[snakeField] = data[camelField]
              deletes.push(camelField)
            }
          })
        }

        if (!dryRun) {
          const updatePayload = {
            ...updates,
            ...Object.fromEntries(deletes.map((field) => [field, admin.firestore.FieldValue.delete()])),
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

        // 2. events/{id}/streams
        const streamsSnapshot = await eventDoc.ref.collection('streams').get()
        if (streamsSnapshot.empty) continue

        let streamBatch = db.batch()
        let streamBatchCount = 0

        for (const streamDoc of streamsSnapshot.docs) {
          const streamData = streamDoc.data()
          const streamMapping = FIELD_MAPPINGS.streams

          const streamFieldsToMigrate = rollback
            ? Object.values(streamMapping).filter((snakeField) => snakeField in streamData)
            : Object.keys(streamMapping).filter((camelField) => camelField in streamData)

          if (streamFieldsToMigrate.length === 0) continue

          try {
            const streamUpdates: Record<string, unknown> = {}
            const streamDeletes: string[] = []

            if (rollback) {
              Object.entries(streamMapping).forEach(([camelField, snakeField]) => {
                if (snakeField in streamData) {
                  streamUpdates[camelField] = streamData[snakeField]
                  streamDeletes.push(snakeField)
                }
              })
            } else {
              Object.entries(streamMapping).forEach(([camelField, snakeField]) => {
                if (camelField in streamData) {
                  streamUpdates[snakeField] = streamData[camelField]
                  streamDeletes.push(camelField)
                }
              })
            }

            if (!dryRun) {
              const streamUpdatePayload = {
                ...streamUpdates,
                ...Object.fromEntries(streamDeletes.map((field) => [field, admin.firestore.FieldValue.delete()])),
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
 * 모든 마이그레이션 실행
 */
async function runMigrations(options: MigrationOptions): Promise<void> {
  const { dryRun, rollback, collections } = options

  console.log('========================================')
  console.log(
    `Firestore 필드명 ${rollback ? '롤백' : '마이그레이션'} ${dryRun ? '(DRY RUN)' : ''}`
  )
  console.log('========================================')

  const targetCollections: CollectionName[] =
    collections && collections.length > 0
      ? collections
      : (Object.keys(FIELD_MAPPINGS) as CollectionName[])

  const allStats: MigrationStats[] = []

  // 1. 최상위 컬렉션 마이그레이션
  for (const collectionName of targetCollections) {
    const stats = await migrateCollection(collectionName, options)
    allStats.push(stats)
  }

  // 2. 서브컬렉션 마이그레이션
  if (
    !collections ||
    collections.includes('events') ||
    collections.includes('streams')
  ) {
    await migrateSubcollections(options)
  }

  // 최종 결과 요약
  console.log('\n========================================')
  console.log('마이그레이션 결과 요약')
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
    console.log('실제 마이그레이션을 수행하려면 --dry-run 옵션을 제거하세요.')
  }
}

/**
 * CLI 인자 파싱
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)

  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    rollback: args.includes('--rollback'),
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

runMigrations(options)
  .then(() => {
    console.log('\n마이그레이션 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n마이그레이션 실패:', error)
    process.exit(1)
  })
