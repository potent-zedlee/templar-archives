/**
 * Firestore 핸드 플레이어 관리 함수
 *
 * 핸드 참여 플레이어 관리를 위한 Firestore 함수들
 * Supabase PostgreSQL에서 마이그레이션됨
 *
 * @module lib/hand-players
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from './firebase'
import {
  COLLECTION_PATHS,
  type FirestoreHand,
  type FirestorePlayer,
  type HandPlayerEmbedded,
  type PokerPosition,
} from './firestore-types'

// ==================== Types ====================

/**
 * 핸드 플레이어 타입
 */
export type HandPlayer = {
  id: string
  hand_id: string
  player_id: string
  position: string | null
  cards: string | null
  starting_stack: number
  ending_stack: number
  created_at: string
  // Join된 플레이어 정보
  player?: {
    id: string
    name: string
    normalized_name: string
    photo_url?: string
    country?: string
  }
}

/**
 * 플레이어 타입
 */
export type Player = {
  id: string
  name: string
  photo_url: string | null
  country: string | null
  total_winnings: number
}

/**
 * 포지션 타입
 */
export const POSITIONS = [
  'BB',
  'SB',
  'BTN',
  'CO',
  'MP',
  'MP+1',
  'MP+2',
  'UTG',
  'UTG+1',
  'UTG+2',
] as const

export type Position = (typeof POSITIONS)[number]

// ==================== Helper Functions ====================

/**
 * Firestore Timestamp을 ISO 문자열로 변환
 */
function timestampToString(ts: Timestamp | undefined): string {
  if (!ts) return new Date().toISOString()
  return ts.toDate().toISOString()
}

/**
 * 이름 정규화 (검색용)
 */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ==================== Main Functions ====================

/**
 * 핸드의 플레이어 목록 가져오기
 *
 * @param handId - 핸드 ID
 * @returns 핸드 플레이어 목록
 */
export async function fetchHandPlayers(handId: string): Promise<HandPlayer[]> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      return []
    }

    const hand = handDoc.data() as FirestoreHand
    const handPlayers: HandPlayer[] = []

    // 임베딩된 플레이어 정보를 HandPlayer 형식으로 변환
    for (const hp of hand.players || []) {
      // 플레이어 상세 정보 조회
      const playerRef = doc(firestore, COLLECTION_PATHS.PLAYERS, hp.player_id)
      const playerDoc = await getDoc(playerRef)
      const player = playerDoc.exists() ? (playerDoc.data() as FirestorePlayer) : null

      handPlayers.push({
        id: `${handId}_${hp.player_id}`, // 복합 ID
        hand_id: handId,
        player_id: hp.player_id,
        position: hp.position || null,
        cards: hp.cards?.join('') || null,
        starting_stack: hp.start_stack || 0,
        ending_stack: hp.end_stack || 0,
        created_at: timestampToString(hand.created_at as Timestamp),
        player: player
          ? {
              id: hp.player_id,
              name: player.name,
              normalized_name: player.normalized_name || normalizeName(player.name),
              photo_url: player.photo_url || undefined,
              country: player.country || undefined,
            }
          : {
              id: hp.player_id,
              name: hp.name,
              normalized_name: normalizeName(hp.name),
              photo_url: undefined,
              country: undefined,
            },
      })
    }

    return handPlayers
  } catch (error) {
    console.error('핸드 플레이어 조회 실패:', error)
    return []
  }
}

/**
 * 전체 플레이어 목록 가져오기
 *
 * @returns 플레이어 목록
 */
export async function fetchAllPlayers(): Promise<Player[]> {
  try {
    const playersRef = collection(firestore, COLLECTION_PATHS.PLAYERS)
    const playersQuery = query(playersRef, orderBy('name', 'asc'))
    const snapshot = await getDocs(playersQuery)

    const players: Player[] = snapshot.docs.map((doc) => {
      const data = doc.data() as FirestorePlayer
      return {
        id: doc.id,
        name: data.name,
        photo_url: data.photo_url || null,
        country: data.country || null,
        total_winnings: data.total_winnings || 0,
      }
    })

    return players
  } catch (error) {
    console.error('전체 플레이어 조회 실패:', error)
    return []
  }
}

/**
 * 핸드에 플레이어 추가
 *
 * @param handId - 핸드 ID
 * @param playerId - 플레이어 ID
 * @param position - 포지션 (선택)
 * @param cards - 카드 (선택)
 * @param startingStack - 시작 스택 (선택)
 * @returns 성공 여부 및 에러 메시지
 */
export async function addPlayerToHand(
  handId: string,
  playerId: string,
  position?: string,
  cards?: string,
  startingStack?: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      return { success: false, error: 'Hand not found' }
    }

    const hand = handDoc.data() as FirestoreHand
    const existingPlayers = hand.players || []

    // 중복 체크
    if (existingPlayers.some((p) => p.player_id === playerId)) {
      return { success: false, error: 'This player is already in this hand' }
    }

    // 플레이어 정보 조회
    const playerRef = doc(firestore, COLLECTION_PATHS.PLAYERS, playerId)
    const playerDoc = await getDoc(playerRef)

    if (!playerDoc.exists()) {
      return { success: false, error: 'Player not found' }
    }

    const player = playerDoc.data() as FirestorePlayer

    // 새 플레이어 정보 생성
    const newPlayer: HandPlayerEmbedded = {
      player_id: playerId,
      name: player.name,
      position: position as PokerPosition | undefined,
      cards: cards ? cards.match(/.{1,2}/g) || undefined : undefined,
      start_stack: startingStack || 0,
      end_stack: 0,
    }

    // 핸드에 플레이어 추가
    const updatedPlayers = [...existingPlayers, newPlayer]

    const batch = writeBatch(firestore)

    // 핸드 업데이트
    batch.update(handRef, {
      players: updatedPlayers,
      updatedAt: serverTimestamp(),
    })

    // 플레이어 핸드 인덱스 추가
    const playerHandRef = doc(firestore, COLLECTION_PATHS.PLAYER_HANDS(playerId), handId)
    batch.set(playerHandRef, {
      tournament_ref: {
        id: hand.tournament_id,
        name: '', // 필요시 조회
        category: '',
      },
      position: position as PokerPosition | undefined,
      cards: cards ? cards.match(/.{1,2}/g) || undefined : undefined,
      result: {
        is_winner: false,
      },
      hand_date: hand.created_at,
    })

    await batch.commit()

    return { success: true }
  } catch (error: unknown) {
    console.error('플레이어 추가 실패:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to add player'
    return { success: false, error: errorMessage }
  }
}

/**
 * 핸드에서 플레이어 제거
 *
 * @param handId - 핸드 ID
 * @param playerId - 플레이어 ID
 * @returns 성공 여부 및 에러 메시지
 */
export async function removePlayerFromHand(
  handId: string,
  playerId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      return { success: false, error: 'Hand not found' }
    }

    const hand = handDoc.data() as FirestoreHand
    const existingPlayers = hand.players || []

    // 플레이어 필터링
    const updatedPlayers = existingPlayers.filter((p) => p.player_id !== playerId)

    const batch = writeBatch(firestore)

    // 핸드 업데이트
    batch.update(handRef, {
      players: updatedPlayers,
      updatedAt: serverTimestamp(),
    })

    // 플레이어 핸드 인덱스 삭제
    const playerHandRef = doc(firestore, COLLECTION_PATHS.PLAYER_HANDS(playerId), handId)
    batch.delete(playerHandRef)

    await batch.commit()

    return { success: true }
  } catch (error: unknown) {
    console.error('플레이어 제거 실패:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove player'
    return { success: false, error: errorMessage }
  }
}

/**
 * 핸드 플레이어 정보 수정
 *
 * @param handId - 핸드 ID
 * @param playerId - 플레이어 ID
 * @param data - 수정할 데이터
 * @returns 성공 여부 및 에러 메시지
 */
export async function updatePlayerInHand(
  handId: string,
  playerId: string,
  data: {
    position?: string
    cards?: string
    starting_stack?: number
    ending_stack?: number
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      return { success: false, error: 'Hand not found' }
    }

    const hand = handDoc.data() as FirestoreHand
    const existingPlayers = hand.players || []

    // 플레이어 찾아서 업데이트
    const updatedPlayers = existingPlayers.map((p) => {
      if (p.player_id === playerId) {
        return {
          ...p,
          position: (data.position as PokerPosition) ?? p.position,
          cards: data.cards ? data.cards.match(/.{1,2}/g) || p.cards : p.cards,
          startStack: data.starting_stack ?? p.start_stack,
          endStack: data.ending_stack ?? p.end_stack,
        }
      }
      return p
    })

    const batch = writeBatch(firestore)

    // 핸드 업데이트
    batch.update(handRef, {
      players: updatedPlayers,
      updatedAt: serverTimestamp(),
    })

    // 플레이어 핸드 인덱스 업데이트
    const playerHandRef = doc(firestore, COLLECTION_PATHS.PLAYER_HANDS(playerId), handId)
    const playerHandDoc = await getDoc(playerHandRef)

    if (playerHandDoc.exists()) {
      batch.update(playerHandRef, {
        position: data.position as PokerPosition | undefined,
        cards: data.cards ? data.cards.match(/.{1,2}/g) || undefined : undefined,
      })
    }

    await batch.commit()

    return { success: true }
  } catch (error: unknown) {
    console.error('플레이어 정보 수정 실패:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update player'
    return { success: false, error: errorMessage }
  }
}

/**
 * 플레이어 검색
 *
 * @param queryStr - 검색어
 * @returns 플레이어 목록
 */
export async function searchPlayers(queryStr: string): Promise<Player[]> {
  try {
    const playersRef = collection(firestore, COLLECTION_PATHS.PLAYERS)

    // Firestore는 부분 문자열 검색을 직접 지원하지 않으므로
    // normalizedName 필드를 사용하여 prefix 검색
    const normalizedQuery = normalizeName(queryStr)

    // 범위 쿼리로 prefix 검색 구현
    const playersQuery = query(
      playersRef,
      where('normalizedName', '>=', normalizedQuery),
      where('normalizedName', '<=', normalizedQuery + '\uf8ff'),
      orderBy('normalizedName'),
      limit(20),
    )

    const snapshot = await getDocs(playersQuery)

    const players: Player[] = snapshot.docs.map((doc) => {
      const data = doc.data() as FirestorePlayer
      return {
        id: doc.id,
        name: data.name,
        photo_url: data.photo_url || null,
        country: data.country || null,
        total_winnings: data.total_winnings || 0,
      }
    })

    return players
  } catch (error) {
    console.error('플레이어 검색 실패:', error)
    return []
  }
}

/**
 * 새 플레이어 생성
 *
 * @param data - 플레이어 데이터
 * @returns 성공 여부 및 생성된 플레이어
 */
export async function createPlayer(data: {
  name: string
  country?: string
  photo_url?: string
}): Promise<{ success: boolean; player?: Player; error?: string }> {
  try {
    const playersRef = collection(firestore, COLLECTION_PATHS.PLAYERS)
    const normalizedName = normalizeName(data.name)

    // 이름 중복 체크
    const duplicateQuery = query(playersRef, where('normalizedName', '==', normalizedName), limit(1))
    const duplicateSnapshot = await getDocs(duplicateQuery)

    if (!duplicateSnapshot.empty) {
      return { success: false, error: 'Player with this name already exists' }
    }

    // 새 플레이어 ID 생성
    const newPlayerRef = doc(playersRef)

    const newPlayer: FirestorePlayer = {
      name: data.name,
      normalized_name: normalizedName,
      country: data.country,
      photo_url: data.photo_url,
      total_winnings: 0,
      created_at: serverTimestamp() as Timestamp,
      updated_at: serverTimestamp() as Timestamp,
    }

    await setDoc(newPlayerRef, newPlayer)

    return {
      success: true,
      player: {
        id: newPlayerRef.id,
        name: data.name,
        photo_url: data.photo_url || null,
        country: data.country || null,
        total_winnings: 0,
      },
    }
  } catch (error: unknown) {
    console.error('플레이어 생성 실패:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create player'
    return { success: false, error: errorMessage }
  }
}

/**
 * 플레이어 정보 조회
 *
 * @param playerId - 플레이어 ID
 * @returns 플레이어 정보
 */
export async function fetchPlayer(playerId: string): Promise<Player | null> {
  try {
    const playerRef = doc(firestore, COLLECTION_PATHS.PLAYERS, playerId)
    const playerDoc = await getDoc(playerRef)

    if (!playerDoc.exists()) {
      return null
    }

    const data = playerDoc.data() as FirestorePlayer

    return {
      id: playerId,
      name: data.name,
      photo_url: data.photo_url || null,
      country: data.country || null,
      total_winnings: data.total_winnings || 0,
    }
  } catch (error) {
    console.error('플레이어 조회 실패:', error)
    return null
  }
}

/**
 * 플레이어 정보 업데이트
 *
 * @param playerId - 플레이어 ID
 * @param data - 업데이트할 데이터
 * @returns 성공 여부
 */
export async function updatePlayer(
  playerId: string,
  data: {
    name?: string
    country?: string
    photo_url?: string
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const playerRef = doc(firestore, COLLECTION_PATHS.PLAYERS, playerId)

    const updateData: any = {
      updated_at: serverTimestamp(),
    }

    if (data.name !== undefined) {
      updateData.name = data.name
      updateData.normalized_name = normalizeName(data.name)
    }
    if (data.country !== undefined) {
      updateData.country = data.country
    }
    if (data.photo_url !== undefined) {
      updateData.photo_url = data.photo_url
    }

    await updateDoc(playerRef, updateData)

    return { success: true }
  } catch (error: unknown) {
    console.error('플레이어 업데이트 실패:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update player'
    return { success: false, error: errorMessage }
  }
}
