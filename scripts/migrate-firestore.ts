/**
 * Firestore 마이그레이션 스크립트
 *
 * 실행 방법:
 * npx ts-node scripts/migrate-firestore.ts
 *
 * 또는 Firebase Admin SDK로 실행:
 * node -r ts-node/register scripts/migrate-firestore.ts
 */

import * as admin from 'firebase-admin'

// Firebase Admin 초기화
if (admin.apps.length === 0) {
  const serviceAccount = require('../gcs-service-account-key.json')
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'templar-archives-index',
  })
}

const db = admin.firestore()

/**
 * Migration 1: Hand 문서에 playerIds 필드 추가
 *
 * 기존 players 배열에서 playerId를 추출하여 playerIds 배열 생성
 */
async function migrateHandPlayerIds() {
  console.log('=== Migration 1: Hand playerIds 필드 추가 ===')

  const handsRef = db.collection('hands')
  const snapshot = await handsRef.get()

  console.log(`총 ${snapshot.size}개의 Hand 문서 발견`)

  let updated = 0
  let skipped = 0
  let failed = 0

  const batchSize = 500
  let batch = db.batch()
  let batchCount = 0

  for (const doc of snapshot.docs) {
    const data = doc.data()

    // 이미 playerIds가 있으면 스킵
    if (data.playerIds && Array.isArray(data.playerIds) && data.playerIds.length > 0) {
      skipped++
      continue
    }

    // players 배열에서 playerId 추출
    const players = data.players || []
    const playerIds = players
      .map((p: { playerId?: string }) => p.playerId)
      .filter((id: string | undefined): id is string => !!id)

    if (playerIds.length === 0) {
      skipped++
      continue
    }

    try {
      batch.update(doc.ref, { playerIds })
      batchCount++
      updated++

      // 배치 크기 도달 시 커밋
      if (batchCount >= batchSize) {
        await batch.commit()
        console.log(`  ${updated}개 업데이트됨...`)
        batch = db.batch()
        batchCount = 0
      }
    } catch (error) {
      console.error(`  오류 (${doc.id}):`, error)
      failed++
    }
  }

  // 남은 배치 커밋
  if (batchCount > 0) {
    await batch.commit()
  }

  console.log(`완료: 업데이트=${updated}, 스킵=${skipped}, 실패=${failed}`)
  return { updated, skipped, failed }
}

/**
 * Migration 2: 사용자 이메일 인덱스 검증
 *
 * 이메일로 사용자를 조회할 수 있는지 확인
 */
async function verifyUserEmailIndex() {
  console.log('\n=== Migration 2: 사용자 이메일 인덱스 검증 ===')

  const usersRef = db.collection('users')
  const snapshot = await usersRef.limit(10).get()

  console.log(`샘플 사용자 ${snapshot.size}명 확인:`)
  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    console.log(`  - ${doc.id}: ${data.email} (role: ${data.role})`)
  })

  // 이메일로 쿼리 테스트
  const testEmail = 'jhng.mov@gmail.com'
  const emailQuery = await usersRef.where('email', '==', testEmail).limit(1).get()

  if (!emailQuery.empty) {
    console.log(`\n✓ 이메일 쿼리 성공: ${testEmail}`)
    console.log(`  문서 ID: ${emailQuery.docs[0].id}`)
  } else {
    console.log(`\n✗ 이메일로 사용자를 찾을 수 없음: ${testEmail}`)
  }
}

/**
 * Migration 3: 통계 필드 일관성 검사
 */
async function verifyStatsConsistency() {
  console.log('\n=== Migration 3: 통계 필드 일관성 검사 ===')

  // Tournament stats 검증
  const tournamentsRef = db.collection('tournaments')
  const tournaments = await tournamentsRef.limit(5).get()

  console.log('토너먼트 통계 샘플:')
  for (const doc of tournaments.docs) {
    const data = doc.data()
    const eventsSnapshot = await doc.ref.collection('events').get()
    const actualEventsCount = eventsSnapshot.size

    const storedCount = data.stats?.eventsCount ?? 0
    const match = storedCount === actualEventsCount ? '✓' : '✗'

    console.log(`  ${match} ${data.name}: stored=${storedCount}, actual=${actualEventsCount}`)
  }
}

/**
 * Migration 4: Security Rules 검증용 데이터 확인
 */
async function verifySecurityRulesData() {
  console.log('\n=== Migration 4: Security Rules 데이터 검증 ===')

  // 필수 컬렉션 존재 확인
  const collections = [
    'tournaments',
    'hands',
    'players',
    'users',
    'posts',
    'liveReports',
    'analysisJobs',
    'categories',
    'systemConfigs',
    'adminLogs',
  ]

  for (const collName of collections) {
    const snapshot = await db.collection(collName).limit(1).get()
    const status = snapshot.empty ? '(비어있음)' : `(${snapshot.size}개+)`
    console.log(`  ${collName}: ${status}`)
  }
}

/**
 * 모든 마이그레이션 실행
 */
async function runAllMigrations() {
  console.log('========================================')
  console.log('Firestore 마이그레이션 시작')
  console.log('========================================\n')

  try {
    // 1. Hand playerIds 마이그레이션
    await migrateHandPlayerIds()

    // 2. 이메일 인덱스 검증
    await verifyUserEmailIndex()

    // 3. 통계 일관성 검사
    await verifyStatsConsistency()

    // 4. Security Rules 데이터 검증
    await verifySecurityRulesData()

    console.log('\n========================================')
    console.log('마이그레이션 완료!')
    console.log('========================================')
  } catch (error) {
    console.error('마이그레이션 실패:', error)
    process.exit(1)
  }
}

// 스크립트 실행
runAllMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('오류:', error)
    process.exit(1)
  })
