/**
 * Firestore Archive Status Fix Script
 *
 * tournaments, events, streams의 status를 'draft' → 'published'로 일괄 변경
 *
 * Usage:
 *   npx ts-node scripts/fix-archive-status.ts
 *   npx ts-node scripts/fix-archive-status.ts --dry-run  # 테스트 모드
 */

import { firestore, logInfo, logSuccess, logWarning, logError } from './migration/config'

interface UpdateResult {
  collection: string
  updated: number
  skipped: number
  errors: string[]
}

async function updateTournamentsStatus(dryRun: boolean): Promise<UpdateResult> {
  const result: UpdateResult = { collection: 'tournaments', updated: 0, skipped: 0, errors: [] }

  try {
    const tournamentsRef = firestore.collection('tournaments')
    const snapshot = await tournamentsRef.get()

    logInfo(`Found ${snapshot.size} tournaments`)

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const currentStatus = data.status

      if (currentStatus === 'published') {
        result.skipped++
        continue
      }

      if (dryRun) {
        logInfo(`[DRY-RUN] Would update tournament ${doc.id}: ${currentStatus} → published`)
        result.updated++
        continue
      }

      await tournamentsRef.doc(doc.id).update({ status: 'published' })
      result.updated++
      logInfo(`Updated tournament ${doc.id}: ${currentStatus} → published`)

      // Events 서브컬렉션도 업데이트
      const eventsRef = tournamentsRef.doc(doc.id).collection('events')
      const eventsSnapshot = await eventsRef.get()

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data()
        if (eventData.status !== 'published') {
          if (!dryRun) {
            await eventsRef.doc(eventDoc.id).update({ status: 'published' })
          }
          logInfo(`  Updated event ${eventDoc.id}`)

          // Streams 서브컬렉션도 업데이트
          const streamsRef = eventsRef.doc(eventDoc.id).collection('streams')
          const streamsSnapshot = await streamsRef.get()

          for (const streamDoc of streamsSnapshot.docs) {
            const streamData = streamDoc.data()
            if (streamData.status !== 'published') {
              if (!dryRun) {
                await streamsRef.doc(streamDoc.id).update({ status: 'published' })
              }
              logInfo(`    Updated stream ${streamDoc.id}`)
            }
          }
        }
      }
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error))
    logError('updateTournamentsStatus', error, { verbose: true } as any)
  }

  return result
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('\n' + '='.repeat(60))
  console.log('Firestore Archive Status Fix')
  console.log('='.repeat(60))

  if (dryRun) {
    logWarning('DRY-RUN MODE - No actual changes will be made')
  }

  console.log()

  const startTime = Date.now()

  // 1. Tournaments (+ Events + Streams)
  logInfo('Processing tournaments, events, and streams...')
  const result = await updateTournamentsStatus(dryRun)

  const duration = Date.now() - startTime

  // 결과 출력
  console.log('\n' + '='.repeat(60))
  console.log('Results')
  console.log('='.repeat(60))
  console.log(`  Updated: ${result.updated}`)
  console.log(`  Skipped (already published): ${result.skipped}`)
  console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`)

  if (result.errors.length > 0) {
    console.log(`\n  Errors (${result.errors.length}):`)
    result.errors.forEach((err, i) => {
      console.log(`    ${i + 1}. ${err}`)
    })
  }

  console.log('='.repeat(60) + '\n')

  if (!dryRun && result.updated > 0) {
    logSuccess('Archive data has been updated! Check the website.')
  }

  process.exit(result.errors.length > 0 ? 1 : 0)
}

main().catch(console.error)
