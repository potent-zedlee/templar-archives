/**
 * Firestore Archive Diagnostic Script
 *
 * tournaments, events, streams 데이터 상태 진단
 *
 * Usage:
 *   npx tsx scripts/diagnose-archive.ts
 */

import { firestore, logInfo, logWarning, logError } from './migration/config'

async function diagnoseArchive() {
  console.log('\n' + '='.repeat(60))
  console.log('Firestore Archive Diagnostic')
  console.log('='.repeat(60))

  try {
    // 1. Tournaments
    const tournamentsRef = firestore.collection('tournaments')
    const tournamentsSnapshot = await tournamentsRef.limit(5).get()

    console.log('\n📁 TOURNAMENTS')
    console.log(`Total count: ${(await tournamentsRef.count().get()).data().count}`)

    for (const doc of tournamentsSnapshot.docs) {
      const data = doc.data()
      console.log(`\n  Tournament: ${doc.id}`)
      console.log(`    name: ${data.name}`)
      console.log(`    status: ${data.status}`)
      console.log(`    gameType: ${data.gameType}`)
      console.log(`    startDate: ${data.startDate?.toDate?.() || data.startDate}`)

      // Events
      const eventsRef = tournamentsRef.doc(doc.id).collection('events')
      const eventsSnapshot = await eventsRef.limit(3).get()
      const eventsCount = (await eventsRef.count().get()).data().count

      console.log(`\n    📂 EVENTS (${eventsCount} total, showing 3)`)

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data()
        console.log(`      Event: ${eventDoc.id}`)
        console.log(`        name: ${eventData.name}`)
        console.log(`        status: ${eventData.status}`)
        console.log(`        date: ${eventData.date?.toDate?.() || eventData.date}`)

        // Streams
        const streamsRef = eventsRef.doc(eventDoc.id).collection('streams')
        const streamsSnapshot = await streamsRef.limit(2).get()
        const streamsCount = (await streamsRef.count().get()).data().count

        console.log(`\n        📄 STREAMS (${streamsCount} total, showing 2)`)

        for (const streamDoc of streamsSnapshot.docs) {
          const streamData = streamDoc.data()
          console.log(`          Stream: ${streamDoc.id}`)
          console.log(`            name: ${streamData.name}`)
          console.log(`            status: ${streamData.status}`)
          console.log(`            publishedAt: ${streamData.publishedAt?.toDate?.() || streamData.publishedAt || 'undefined'}`)
          console.log(`            videoUrl: ${streamData.videoUrl?.substring(0, 50)}...`)
        }
      }

      // 첫 번째 토너먼트만 자세히 보고 나머지는 요약
      break
    }

    // 2. Summary: Status 분포
    console.log('\n' + '='.repeat(60))
    console.log('📊 STATUS DISTRIBUTION')
    console.log('='.repeat(60))

    const allTournaments = await tournamentsRef.get()
    const statusCounts: Record<string, number> = {}

    for (const doc of allTournaments.docs) {
      const status = doc.data().status || 'undefined'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    }

    console.log('\nTournaments:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

    // Events 샘플 체크
    let eventStatusCounts: Record<string, number> = {}
    let streamStatusCounts: Record<string, number> = {}
    let sampleTournaments = allTournaments.docs.slice(0, 5)

    for (const tDoc of sampleTournaments) {
      const eventsSnap = await tournamentsRef.doc(tDoc.id).collection('events').get()
      for (const eDoc of eventsSnap.docs) {
        const status = eDoc.data().status || 'undefined'
        eventStatusCounts[status] = (eventStatusCounts[status] || 0) + 1

        const streamsSnap = await tournamentsRef.doc(tDoc.id).collection('events').doc(eDoc.id).collection('streams').get()
        for (const sDoc of streamsSnap.docs) {
          const sStatus = sDoc.data().status || 'undefined'
          streamStatusCounts[sStatus] = (streamStatusCounts[sStatus] || 0) + 1
        }
      }
    }

    console.log('\nEvents (sample of 5 tournaments):')
    Object.entries(eventStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

    console.log('\nStreams (sample of 5 tournaments):')
    Object.entries(streamStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

    // 3. 필수 필드 체크
    console.log('\n' + '='.repeat(60))
    console.log('🔍 REQUIRED FIELDS CHECK')
    console.log('='.repeat(60))

    // 첫 번째 토너먼트의 모든 필드 출력
    const firstTournament = allTournaments.docs[0]
    if (firstTournament) {
      console.log('\nFirst Tournament All Fields:')
      const data = firstTournament.data()
      Object.entries(data).forEach(([key, value]) => {
        const displayValue = value?.toDate ? value.toDate() :
                            typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value
        console.log(`  ${key}: ${displayValue}`)
      })
    }

  } catch (error) {
    logError('diagnoseArchive', error, { verbose: true } as any)
  }

  console.log('\n' + '='.repeat(60))
  process.exit(0)
}

diagnoseArchive().catch(console.error)
