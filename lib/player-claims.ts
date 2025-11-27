/**
 * Player Claims Database Operations (Firestore)
 *
 * 플레이어 클레임 요청 관리
 *
 * @module lib/player-claims
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import type { FirestorePlayerClaim, ClaimStatus, VerificationMethod } from '@/lib/firestore-types'

export type { ClaimStatus, VerificationMethod } from '@/lib/firestore-types'

export type PlayerClaim = {
  id: string
  user_id: string
  player_id: string
  status: ClaimStatus
  verification_method: VerificationMethod
  verification_data?: Record<string, unknown>
  admin_notes?: string
  claimed_at: string
  verified_at?: string
  verified_by?: string
  rejected_reason?: string
  created_at: string
  updated_at: string
}

export type PlayerClaimWithDetails = PlayerClaim & {
  user: {
    nickname: string
    email: string
    avatar_url?: string
  }
  player: {
    name: string
    photo_url?: string
  }
  verified_by_user?: {
    nickname: string
  }
}

/**
 * Firestore 문서를 PlayerClaim으로 변환
 */
function toPlayerClaim(id: string, data: FirestorePlayerClaim): PlayerClaim {
  return {
    id,
    user_id: data.userId,
    player_id: data.playerId,
    status: data.status,
    verification_method: data.verificationMethod,
    verification_data: data.verificationData,
    admin_notes: data.adminNotes,
    claimed_at: data.claimedAt.toDate().toISOString(),
    verified_at: data.verifiedAt?.toDate().toISOString(),
    verified_by: data.verifiedBy,
    rejected_reason: data.rejectedReason,
    created_at: data.createdAt.toDate().toISOString(),
    updated_at: data.updatedAt.toDate().toISOString(),
  }
}

/**
 * Firestore 문서를 PlayerClaimWithDetails로 변환
 */
function toPlayerClaimWithDetails(id: string, data: FirestorePlayerClaim): PlayerClaimWithDetails {
  const claim = toPlayerClaim(id, data)
  return {
    ...claim,
    user: {
      nickname: data.user?.nickname || 'Unknown',
      email: data.user?.email || '',
      avatar_url: data.user?.avatarUrl,
    },
    player: {
      name: data.player?.name || 'Unknown',
      photo_url: data.player?.photoUrl,
    },
    verified_by_user: data.verifiedBy
      ? {
          nickname: 'Admin', // 별도 조회 필요
        }
      : undefined,
  }
}

/**
 * 플레이어 클레임 요청 생성
 */
export async function requestPlayerClaim({
  userId,
  playerId,
  verificationMethod,
  verificationData,
}: {
  userId: string
  playerId: string
  verificationMethod: VerificationMethod
  verificationData?: Record<string, unknown>
}): Promise<{ data: PlayerClaim | null; error: Error | null }> {
  try {
    // 이미 클레임 요청이 있는지 확인
    const existingQuery = query(
      collection(firestore, COLLECTION_PATHS.PLAYER_CLAIMS),
      where('userId', '==', userId),
      where('playerId', '==', playerId),
      where('status', 'in', ['pending', 'approved'])
    )

    const existingSnapshot = await getDocs(existingQuery)

    if (!existingSnapshot.empty) {
      const existingData = existingSnapshot.docs[0].data() as FirestorePlayerClaim
      return {
        data: null,
        error: new Error(
          existingData.status === 'approved'
            ? '이미 승인된 클레임이 있습니다.'
            : '이미 대기 중인 클레임 요청이 있습니다.'
        ),
      }
    }

    // 사용자 정보 조회
    const userDoc = await getDoc(doc(firestore, COLLECTION_PATHS.USERS, userId))
    const userData = userDoc.data()

    // 플레이어 정보 조회
    const playerDoc = await getDoc(doc(firestore, COLLECTION_PATHS.PLAYERS, playerId))
    const playerData = playerDoc.data()

    const now = Timestamp.now()
    const claimData: Omit<FirestorePlayerClaim, 'verifiedAt' | 'verifiedBy' | 'rejectedReason'> = {
      userId,
      playerId,
      status: 'pending',
      verificationMethod,
      verificationData,
      claimedAt: now,
      user: userData
        ? {
            nickname: userData.nickname || 'Unknown',
            email: userData.email || '',
            avatarUrl: userData.avatarUrl,
          }
        : undefined,
      player: playerData
        ? {
            name: playerData.name || 'Unknown',
            photoUrl: playerData.photoUrl,
          }
        : undefined,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await addDoc(collection(firestore, COLLECTION_PATHS.PLAYER_CLAIMS), claimData)

    return {
      data: toPlayerClaim(docRef.id, claimData as FirestorePlayerClaim),
      error: null,
    }
  } catch (error) {
    console.error('requestPlayerClaim 실패:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * 플레이어의 클레임 정보 조회
 */
export async function getPlayerClaimInfo(
  playerId: string
): Promise<{
  claimed: boolean
  claim?: PlayerClaimWithDetails
}> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.PLAYER_CLAIMS),
      where('playerId', '==', playerId),
      where('status', '==', 'approved')
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { claimed: false }
    }

    const doc = snapshot.docs[0]
    return {
      claimed: true,
      claim: toPlayerClaimWithDetails(doc.id, doc.data() as FirestorePlayerClaim),
    }
  } catch (error) {
    console.error('getPlayerClaimInfo 실패:', error)
    return { claimed: false }
  }
}

/**
 * 유저의 클레임 정보 조회 (자신이 클레임한 플레이어)
 */
export async function getUserClaimedPlayer(userId: string): Promise<{
  data: PlayerClaimWithDetails | null
  error: Error | null
}> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.PLAYER_CLAIMS),
      where('userId', '==', userId),
      where('status', '==', 'approved')
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { data: null, error: null }
    }

    const doc = snapshot.docs[0]
    return {
      data: toPlayerClaimWithDetails(doc.id, doc.data() as FirestorePlayerClaim),
      error: null,
    }
  } catch (error) {
    console.error('getUserClaimedPlayer 실패:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * 유저의 모든 클레임 요청 조회
 */
export async function getUserClaims(userId: string): Promise<{
  data: PlayerClaimWithDetails[]
  error: Error | null
}> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.PLAYER_CLAIMS),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)

    const claims = snapshot.docs.map((doc) =>
      toPlayerClaimWithDetails(doc.id, doc.data() as FirestorePlayerClaim)
    )

    return { data: claims, error: null }
  } catch (error) {
    console.error('getUserClaims 실패:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * 모든 대기 중인 클레임 요청 조회 (관리자용)
 */
export async function getPendingClaims(): Promise<{
  data: PlayerClaimWithDetails[]
  error: Error | null
}> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.PLAYER_CLAIMS),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)

    const claims = snapshot.docs.map((doc) =>
      toPlayerClaimWithDetails(doc.id, doc.data() as FirestorePlayerClaim)
    )

    return { data: claims, error: null }
  } catch (error) {
    console.error('getPendingClaims 실패:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * 모든 클레임 요청 조회 (관리자용)
 */
export async function getAllClaims(): Promise<{
  data: PlayerClaimWithDetails[]
  error: Error | null
}> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.PLAYER_CLAIMS),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)

    const claims = snapshot.docs.map((doc) =>
      toPlayerClaimWithDetails(doc.id, doc.data() as FirestorePlayerClaim)
    )

    return { data: claims, error: null }
  } catch (error) {
    console.error('getAllClaims 실패:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * 클레임 승인 (관리자용)
 */
export async function approvePlayerClaim({
  claimId,
  adminId,
  adminNotes,
}: {
  claimId: string
  adminId: string
  adminNotes?: string
}): Promise<{ data: PlayerClaim | null; error: Error | null }> {
  try {
    const claimRef = doc(firestore, COLLECTION_PATHS.PLAYER_CLAIMS, claimId)

    await updateDoc(claimRef, {
      status: 'approved',
      verifiedAt: Timestamp.now(),
      verifiedBy: adminId,
      adminNotes: adminNotes || null,
      updatedAt: Timestamp.now(),
    })

    const updatedDoc = await getDoc(claimRef)
    if (!updatedDoc.exists()) {
      return { data: null, error: new Error('Claim not found') }
    }

    return {
      data: toPlayerClaim(updatedDoc.id, updatedDoc.data() as FirestorePlayerClaim),
      error: null,
    }
  } catch (error) {
    console.error('approvePlayerClaim 실패:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * 클레임 거절 (관리자용)
 */
export async function rejectPlayerClaim({
  claimId,
  adminId,
  rejectedReason,
  adminNotes,
}: {
  claimId: string
  adminId: string
  rejectedReason: string
  adminNotes?: string
}): Promise<{ data: PlayerClaim | null; error: Error | null }> {
  try {
    const claimRef = doc(firestore, COLLECTION_PATHS.PLAYER_CLAIMS, claimId)

    await updateDoc(claimRef, {
      status: 'rejected',
      verifiedAt: Timestamp.now(),
      verifiedBy: adminId,
      rejectedReason,
      adminNotes: adminNotes || null,
      updatedAt: Timestamp.now(),
    })

    const updatedDoc = await getDoc(claimRef)
    if (!updatedDoc.exists()) {
      return { data: null, error: new Error('Claim not found') }
    }

    return {
      data: toPlayerClaim(updatedDoc.id, updatedDoc.data() as FirestorePlayerClaim),
      error: null,
    }
  } catch (error) {
    console.error('rejectPlayerClaim 실패:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * 클레임 취소 (본인만 가능, pending 상태만)
 */
export async function cancelPlayerClaim(
  claimId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    // 클레임 확인
    const claimRef = doc(firestore, COLLECTION_PATHS.PLAYER_CLAIMS, claimId)
    const claimDoc = await getDoc(claimRef)

    if (!claimDoc.exists()) {
      return { error: new Error('Claim not found') }
    }

    const claimData = claimDoc.data() as FirestorePlayerClaim

    // 본인 확인
    if (claimData.userId !== userId) {
      return { error: new Error('Unauthorized') }
    }

    // pending 상태 확인
    if (claimData.status !== 'pending') {
      return { error: new Error('Only pending claims can be cancelled') }
    }

    await deleteDoc(claimRef)

    return { error: null }
  } catch (error) {
    console.error('cancelPlayerClaim 실패:', error)
    return { error: error as Error }
  }
}

/**
 * 특정 유저가 특정 플레이어를 클레임했는지 확인
 */
export async function checkUserPlayerClaim(
  userId: string,
  playerId: string
): Promise<{
  hasClaim: boolean
  claim?: PlayerClaim
}> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.PLAYER_CLAIMS),
      where('userId', '==', userId),
      where('playerId', '==', playerId),
      where('status', 'in', ['pending', 'approved'])
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { hasClaim: false }
    }

    const doc = snapshot.docs[0]
    return {
      hasClaim: true,
      claim: toPlayerClaim(doc.id, doc.data() as FirestorePlayerClaim),
    }
  } catch (error) {
    console.error('checkUserPlayerClaim 실패:', error)
    return { hasClaim: false }
  }
}
