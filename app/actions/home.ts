'use server'

/**
 * Home Page Server Actions (Firestore)
 *
 * 메인 페이지 데이터를 위한 Server Actions
 */

import { adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import type { PlatformStats, WeeklyHighlight, TopPlayer } from '@/lib/main-page'

/**
 * 플랫폼 통계 조회
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    // 각 컬렉션의 문서 수를 조회
    const [handsSnapshot, tournamentsSnapshot, playersSnapshot] = await Promise.all([
      adminFirestore.collection(COLLECTION_PATHS.HANDS).count().get(),
      adminFirestore.collection(COLLECTION_PATHS.TOURNAMENTS).count().get(),
      adminFirestore.collection(COLLECTION_PATHS.PLAYERS).count().get(),
    ])

    return {
      totalHands: handsSnapshot.data().count,
      totalTournaments: tournamentsSnapshot.data().count,
      totalPlayers: playersSnapshot.data().count,
    }
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return {
      totalHands: 0,
      totalTournaments: 0,
      totalPlayers: 0,
    }
  }
}

/**
 * 주간 하이라이트 조회 (최근 7일간 가장 좋아요가 많은 핸드)
 */
export async function getWeeklyHighlights(): Promise<WeeklyHighlight[]> {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const handsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.HANDS)
      .where('createdAt', '>=', sevenDaysAgo)
      .orderBy('createdAt', 'desc')
      .orderBy('engagement.likesCount', 'desc')
      .limit(3)
      .get()

    const highlights: WeeklyHighlight[] = []

    for (const doc of handsSnapshot.docs) {
      const data = doc.data()

      // Tournament 정보 조회
      let tournamentName = 'Unknown'
      let streamName = 'Unknown'
      let videoUrl = ''

      if (data.tournamentId) {
        const tournamentDoc = await adminFirestore
          .collection(COLLECTION_PATHS.TOURNAMENTS)
          .doc(data.tournamentId)
          .get()

        if (tournamentDoc.exists) {
          tournamentName = tournamentDoc.data()?.name || 'Unknown'
        }
      }

      // Stream 정보 조회
      if (data.streamId && data.tournamentId && data.eventId) {
        const streamDoc = await adminFirestore
          .collection(COLLECTION_PATHS.TOURNAMENTS)
          .doc(data.tournamentId)
          .collection('events')
          .doc(data.eventId)
          .collection('streams')
          .doc(data.streamId)
          .get()

        if (streamDoc.exists) {
          const streamData = streamDoc.data()
          streamName = streamData?.name || 'Unknown'
          videoUrl = streamData?.videoUrl || ''
        }
      }

      highlights.push({
        id: doc.id,
        number: data.number || '',
        description: data.description || '',
        timestamp: data.timestamp || '',
        pot_size: data.potSize || 0,
        likes_count: data.engagement?.likesCount || 0,
        video_url: videoUrl,
        tournament_name: tournamentName,
        day_name: streamName,
      })
    }

    return highlights
  } catch (error) {
    console.error('Error fetching weekly highlights:', error)
    return []
  }
}

/**
 * 최신 게시글 조회
 */
export async function getLatestPosts() {
  try {
    const postsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.POSTS)
      .orderBy('createdAt', 'desc')
      .limit(4)
      .get()

    return postsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        content: data.content,
        category: data.category,
        createdAt: data.createdAt?.toDate().toISOString(),
        likesCount: data.stats?.likesCount || 0,
        commentsCount: data.stats?.commentsCount || 0,
        author: {
          nickname: data.author?.name || 'Anonymous',
          avatarUrl: data.author?.avatarUrl || null,
        },
      }
    })
  } catch (error) {
    console.error('Error fetching latest posts:', error)
    return []
  }
}

/**
 * 상위 플레이어 조회 (총 상금 기준)
 */
export async function getTopPlayers(): Promise<TopPlayer[]> {
  try {
    const playersSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.PLAYERS)
      .orderBy('totalWinnings', 'desc')
      .limit(5)
      .get()

    const topPlayers: TopPlayer[] = []

    for (const doc of playersSnapshot.docs) {
      const data = doc.data()

      // 플레이어의 핸드 수 조회
      const handsCountSnapshot = await adminFirestore
        .collection(COLLECTION_PATHS.HANDS)
        .where('players', 'array-contains-any', [{ playerId: doc.id }])
        .count()
        .get()

      topPlayers.push({
        id: doc.id,
        name: data.name,
        photo_url: data.photoUrl || null,
        total_winnings: data.totalWinnings || 0,
        tournament_count: 0, // 별도 계산 필요
        hands_count: handsCountSnapshot.data().count,
      })
    }

    return topPlayers
  } catch (error) {
    console.error('Error fetching top players:', error)
    return []
  }
}

/**
 * 홈페이지 전체 데이터 조회 (한 번의 호출로 모든 데이터)
 */
export async function getHomePageData() {
  try {
    const [stats, highlights, posts, topPlayers] = await Promise.all([
      getPlatformStats(),
      getWeeklyHighlights(),
      getLatestPosts(),
      getTopPlayers(),
    ])

    return {
      success: true,
      data: {
        stats,
        highlights,
        posts,
        topPlayers,
      },
    }
  } catch (error) {
    console.error('Error fetching home page data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
    }
  }
}
