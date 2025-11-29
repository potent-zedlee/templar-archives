/**
 * Players API Route (Firestore)
 *
 * GET /api/players - 플레이어 목록 조회 (핸드 수 포함)
 *
 * @module app/api/players/route
 */

import { NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS, type FirestorePlayer, type FirestoreHand } from '@/lib/firestore-types'
import type { Timestamp } from 'firebase-admin/firestore'

/**
 * Firestore Timestamp를 ISO 문자열로 변환
 */
function timestampToString(timestamp: Timestamp | undefined): string {
  if (!timestamp) return new Date().toISOString()
  return timestamp.toDate().toISOString()
}

export async function GET() {
  try {
    // 1. 모든 플레이어 조회
    const playersSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.PLAYERS)
      .get()

    const players: Array<FirestorePlayer & { id: string }> = []
    playersSnapshot.forEach((doc) => {
      players.push({
        id: doc.id,
        ...(doc.data() as FirestorePlayer),
      })
    })

    // 2. 핸드 컬렉션에서 플레이어별 핸드 수 계산
    // Firestore에서는 embedded players 배열 내 playerId로 집계
    const handsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.HANDS)
      .get()

    // 플레이어별 핸드 수 계산
    const handCountMap = new Map<string, number>()

    handsSnapshot.forEach((doc) => {
      const hand = doc.data() as FirestoreHand
      if (hand.players && Array.isArray(hand.players)) {
        hand.players.forEach((player) => {
          if (player.player_id) {
            const currentCount = handCountMap.get(player.player_id) || 0
            handCountMap.set(player.player_id, currentCount + 1)
          }
        })
      }
    })

    // 3. 플레이어 데이터와 핸드 수 병합 (snake_case로 기존 코드 호환)
    const playersWithHandCount = players.map((player) => ({
      id: player.id,
      name: player.name,
      normalized_name: player.normalized_name,
      photo_url: player.photo_url,
      country: player.country,
      gender: undefined, // Firestore 스키마에 없음
      is_pro: player.is_pro,
      bio: player.bio,
      total_winnings: player.total_winnings,
      aliases: player.aliases,
      stats: player.stats,
      hand_count: handCountMap.get(player.id) || 0,
      created_at: timestampToString(player.created_at),
      updated_at: timestampToString(player.updated_at),
    }))

    // 4. 기본 정렬: 핸드 수 내림차순
    playersWithHandCount.sort((a, b) => b.hand_count - a.hand_count)

    return NextResponse.json({
      success: true,
      players: playersWithHandCount,
      total: playersWithHandCount.length,
    })
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch players',
      },
      { status: 500 }
    )
  }
}
