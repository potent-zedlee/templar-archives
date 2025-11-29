/**
 * Hand Edit Requests Database Operations (Firestore)
 *
 * 핸드 수정 요청 관리
 *
 * @module lib/hand-edit-requests
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import type { FirestoreHandEditRequest, EditType, EditRequestStatus } from '@/lib/firestore-types'

export type { EditType, EditRequestStatus } from '@/lib/firestore-types'

export type HandEditRequest = {
  id: string
  hand_id: string
  requester_id: string
  requester_name: string
  edit_type: EditType
  original_data: Record<string, unknown>
  proposed_data: Record<string, unknown>
  reason: string
  status: EditRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_comment: string | null
  created_at: string
}

/**
 * Firestore 문서를 HandEditRequest로 변환
 */
function toHandEditRequest(id: string, data: FirestoreHandEditRequest): HandEditRequest {
  return {
    id,
    hand_id: data.hand_id,
    requester_id: data.requester_id,
    requester_name: data.requester_name,
    edit_type: data.edit_type,
    original_data: data.original_data,
    proposed_data: data.proposed_data,
    reason: data.reason,
    status: data.status,
    reviewed_by: data.reviewed_by || null,
    reviewed_at: data.reviewed_at?.toDate().toISOString() || null,
    admin_comment: data.admin_comment || null,
    created_at: data.created_at.toDate().toISOString(),
  }
}

/**
 * 핸드 수정 요청 생성
 */
export async function createEditRequest({
  handId,
  requesterId,
  requesterName,
  editType,
  originalData,
  proposedData,
  reason,
}: {
  handId: string
  requesterId: string
  requesterName: string
  editType: EditType
  originalData: Record<string, unknown>
  proposedData: Record<string, unknown>
  reason: string
}) {
  try {
    // 핸드 정보 조회 (임베딩용)
    const handDoc = await getDoc(doc(firestore, COLLECTION_PATHS.HANDS, handId))
    const handData = handDoc.exists() ? handDoc.data() : null

    const requestData: FirestoreHandEditRequest = {
      hand_id: handId,
      requester_id: requesterId,
      requester_name: requesterName,
      edit_type: editType,
      original_data: originalData,
      proposed_data: proposedData,
      reason,
      status: 'pending',
      hand: handData
        ? {
            number: handData.number,
            description: handData.description,
            stream_name: handData.stream_name,
            event_name: handData.event_name,
            tournament_name: handData.tournament_name,
          }
        : undefined,
      created_at: Timestamp.now(),
    }

    const docRef = await addDoc(
      collection(firestore, COLLECTION_PATHS.HAND_EDIT_REQUESTS),
      requestData
    )

    return toHandEditRequest(docRef.id, requestData)
  } catch (error) {
    console.error('createEditRequest 실패:', error)
    throw error
  }
}

/**
 * 수정 요청 목록 조회 (관리자)
 */
export async function fetchEditRequests({
  status,
  limit: limitCount = 50,
}: {
  status?: EditRequestStatus
  limit?: number
} = {}) {
  try {
    let q = query(
      collection(firestore, COLLECTION_PATHS.HAND_EDIT_REQUESTS),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    )

    if (status) {
      q = query(
        collection(firestore, COLLECTION_PATHS.HAND_EDIT_REQUESTS),
        where('status', '==', status),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      )
    }

    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as FirestoreHandEditRequest
      const request = toHandEditRequest(docSnap.id, data)

      // 핸드 정보 (임베딩된 데이터 사용)
      return {
        ...request,
        hand: data.hand
          ? {
              id: data.hand_id,
              number: data.hand.number,
              description: data.hand.description,
              day: {
                name: data.hand.stream_name || 'N/A',
                sub_event: {
                  name: data.hand.event_name || 'N/A',
                  tournament: {
                    name: data.hand.tournament_name || 'N/A',
                  },
                },
              },
            }
          : null,
      }
    })
  } catch (error) {
    console.error('fetchEditRequests 실패:', error)
    throw error
  }
}

/**
 * 사용자별 수정 요청 조회
 */
export async function fetchUserEditRequests({
  userId,
  status,
  limit: limitCount = 20,
}: {
  userId: string
  status?: EditRequestStatus
  limit?: number
}) {
  try {
    let q = query(
      collection(firestore, COLLECTION_PATHS.HAND_EDIT_REQUESTS),
      where('requester_id', '==', userId),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    )

    if (status) {
      q = query(
        collection(firestore, COLLECTION_PATHS.HAND_EDIT_REQUESTS),
        where('requester_id', '==', userId),
        where('status', '==', status),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      )
    }

    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as FirestoreHandEditRequest
      const request = toHandEditRequest(docSnap.id, data)

      return {
        ...request,
        hand: data.hand
          ? {
              id: data.hand_id,
              number: data.hand.number,
              description: data.hand.description,
              day: {
                name: data.hand.stream_name || 'N/A',
                sub_event: {
                  name: data.hand.event_name || 'N/A',
                  tournament: {
                    name: data.hand.tournament_name || 'N/A',
                  },
                },
              },
            }
          : null,
      }
    })
  } catch (error) {
    console.error('fetchUserEditRequests 실패:', error)
    throw error
  }
}

/**
 * 수정 요청 승인 및 핸드 데이터 적용
 */
export async function approveEditRequest({
  requestId,
  adminId,
  adminComment,
}: {
  requestId: string
  adminId: string
  adminComment?: string
}) {
  try {
    // 1. Get request details
    const requestRef = doc(firestore, COLLECTION_PATHS.HAND_EDIT_REQUESTS, requestId)
    const requestSnap = await getDoc(requestRef)

    if (!requestSnap.exists()) {
      throw new Error('Request not found')
    }

    const requestData = requestSnap.data() as FirestoreHandEditRequest

    // 2. Apply edits to hand based on edit_type
    await applyEditToHand(requestData.hand_id, requestData.edit_type, requestData.proposed_data)

    // 3. Update request status
    await updateDoc(requestRef, {
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: Timestamp.now(),
      admin_comment: adminComment || null,
    })

    const updatedSnap = await getDoc(requestRef)
    return toHandEditRequest(updatedSnap.id, updatedSnap.data() as FirestoreHandEditRequest)
  } catch (error) {
    console.error('approveEditRequest 실패:', error)
    throw error
  }
}

/**
 * 수정 요청 거부
 */
export async function rejectEditRequest({
  requestId,
  adminId,
  adminComment,
}: {
  requestId: string
  adminId: string
  adminComment?: string
}) {
  try {
    const requestRef = doc(firestore, COLLECTION_PATHS.HAND_EDIT_REQUESTS, requestId)

    await updateDoc(requestRef, {
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: Timestamp.now(),
      admin_comment: adminComment || null,
    })

    const updatedSnap = await getDoc(requestRef)
    return toHandEditRequest(updatedSnap.id, updatedSnap.data() as FirestoreHandEditRequest)
  } catch (error) {
    console.error('rejectEditRequest 실패:', error)
    throw error
  }
}

/**
 * 핸드 데이터에 수정사항 적용
 */
async function applyEditToHand(
  handId: string,
  editType: EditType,
  proposedData: Record<string, unknown>
) {
  const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)

  switch (editType) {
    case 'basic_info':
      // Update hand basic info (description, timestamp, etc.)
      const basicUpdate: Record<string, unknown> = {
        updated_at: Timestamp.now(),
      }
      if (proposedData.description) basicUpdate.description = proposedData.description
      if (proposedData.timestamp) basicUpdate.timestamp = proposedData.timestamp

      await updateDoc(handRef, basicUpdate)
      break

    case 'board':
      // Update board cards and pot
      const boardUpdate: Record<string, unknown> = {
        updated_at: Timestamp.now(),
      }
      if (proposedData.board_flop) boardUpdate.board_flop = proposedData.board_flop
      if (proposedData.board_turn) boardUpdate.board_turn = proposedData.board_turn
      if (proposedData.board_river) boardUpdate.board_river = proposedData.board_river
      if (proposedData.pot_size) boardUpdate.pot_size = proposedData.pot_size

      await updateDoc(handRef, boardUpdate)
      break

    case 'players':
      // Update players array (embedded in hand document)
      if (proposedData.players && Array.isArray(proposedData.players)) {
        await updateDoc(handRef, {
          players: proposedData.players,
          updated_at: Timestamp.now(),
        })
      }
      break

    case 'actions':
      // Update actions array (embedded in hand document)
      if (proposedData.actions && Array.isArray(proposedData.actions)) {
        await updateDoc(handRef, {
          actions: proposedData.actions,
          updated_at: Timestamp.now(),
        })
      }
      break
  }
}

/**
 * 핸드 데이터 가져오기 (수정 요청용)
 */
export async function getHandDataForEdit(handId: string) {
  try {
    const handDoc = await getDoc(doc(firestore, COLLECTION_PATHS.HANDS, handId))

    if (!handDoc.exists()) {
      throw new Error('Hand not found')
    }

    const handData = handDoc.data()

    return {
      hand: {
        id: handDoc.id,
        number: handData.number,
        description: handData.description,
        timestamp: handData.timestamp,
        boardFlop: handData.board_flop,
        boardTurn: handData.board_turn,
        boardRiver: handData.board_river,
        potSize: handData.pot_size,
        streamName: handData.stream_name,
        eventName: handData.event_name,
        tournamentName: handData.tournament_name,
      },
      players: handData.players || [],
      actions: handData.actions || [],
    }
  } catch (error) {
    console.error('getHandDataForEdit 실패:', error)
    throw error
  }
}
