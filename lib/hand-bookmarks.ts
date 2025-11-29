/**
 * 핸드 북마크 관리
 *
 * Firestore를 사용하여 사용자별 핸드 북마크를 관리합니다.
 * Collection: /users/{userId}/bookmarks/{bookmarkId}
 *
 * @module lib/hand-bookmarks
 */

import { firestore } from './firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { COLLECTION_PATHS, type FirestoreBookmark } from './firestore-types'

export type HandBookmark = {
  id: string
  hand_id: string
  user_id: string
  folder_name?: string
  notes?: string
  created_at: string
}

export type HandBookmarkWithDetails = HandBookmark & {
  hand?: {
    id: string
    number: string
    description: string
    timestamp: string
    day?: {
      id: string
      name: string
      sub_event?: {
        id: string
        name: string
        tournament?: {
          id: string
          name: string
          category: string
        }
      }
    }
  }
}

/**
 * Firestore 북마크를 레거시 형식으로 변환
 */
function convertToLegacyFormat(
  bookmarkId: string,
  userId: string,
  bookmark: FirestoreBookmark
): HandBookmarkWithDetails {
  const createdAt =
    bookmark.created_at instanceof Timestamp
      ? bookmark.created_at.toDate().toISOString()
      : new Date().toISOString()

  return {
    id: bookmarkId,
    hand_id: bookmark.ref_id,
    user_id: userId,
    folder_name: bookmark.folder_name,
    notes: bookmark.notes,
    created_at: createdAt,
    hand: bookmark.ref_data
      ? {
          id: bookmark.ref_id,
          number: bookmark.ref_data.number || '',
          description: bookmark.ref_data.description || '',
          timestamp: bookmark.ref_data.timestamp || '',
          day: bookmark.ref_data.stream_name
            ? {
                id: '',
                name: bookmark.ref_data.stream_name,
                sub_event: bookmark.ref_data.event_name
                  ? {
                      id: '',
                      name: bookmark.ref_data.event_name,
                      tournament: bookmark.ref_data.tournament_name
                        ? {
                            id: '',
                            name: bookmark.ref_data.tournament_name,
                            category: bookmark.ref_data.tournament_category || '',
                          }
                        : undefined,
                    }
                  : undefined,
              }
            : undefined,
        }
      : undefined,
  }
}

/**
 * 핸드 북마크 추가
 */
export async function addHandBookmark(
  handId: string,
  userId: string,
  folderName?: string,
  notes?: string
): Promise<void> {
  const bookmarksRef = collection(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId))
  const bookmarkDocRef = doc(bookmarksRef, handId) // handId를 문서 ID로 사용

  // 핸드 정보 가져오기 (ref_data용)
  let ref_data: FirestoreBookmark['ref_data'] = {
    title: '',
    description: '',
  }

  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handDocRef)
    if (handDoc.exists()) {
      const handData = handDoc.data()
      ref_data = {
        title: handData.description || `Hand #${handData.number}`,
        description: handData.description,
        number: handData.number,
        timestamp: handData.timestamp,
      }
    }
  } catch (error) {
    console.error('핸드 정보 조회 실패:', error)
  }

  const bookmarkData: Omit<FirestoreBookmark, 'created_at'> & { created_at: ReturnType<typeof serverTimestamp> } = {
    type: 'hand',
    ref_id: handId,
    folder_name: folderName || undefined,
    notes: notes || undefined,
    ref_data,
    created_at: serverTimestamp(),
  }

  try {
    await setDoc(bookmarkDocRef, bookmarkData)
  } catch (error) {
    console.error('북마크 추가 실패:', error)
    throw error
  }
}

/**
 * 핸드 북마크 삭제
 */
export async function removeHandBookmark(handId: string, userId: string): Promise<void> {
  const bookmarkDocRef = doc(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId), handId)

  try {
    await deleteDoc(bookmarkDocRef)
  } catch (error) {
    console.error('북마크 삭제 실패:', error)
    throw error
  }
}

/**
 * 핸드 북마크 토글 (추가 또는 삭제)
 */
export async function toggleHandBookmark(
  handId: string,
  userId: string,
  folderName?: string,
  notes?: string
): Promise<boolean> {
  const bookmarkDocRef = doc(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId), handId)

  try {
    const bookmarkDoc = await getDoc(bookmarkDocRef)

    // 북마크가 있으면 삭제, 없으면 추가
    if (bookmarkDoc.exists()) {
      await removeHandBookmark(handId, userId)
      return false // 삭제됨
    } else {
      await addHandBookmark(handId, userId, folderName, notes)
      return true // 추가됨
    }
  } catch (error) {
    console.error('북마크 토글 실패:', error)
    throw error
  }
}

/**
 * 사용자가 특정 핸드를 북마크했는지 확인
 */
export async function isHandBookmarked(handId: string, userId?: string): Promise<boolean> {
  if (!userId) return false

  const bookmarkDocRef = doc(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId), handId)

  try {
    const bookmarkDoc = await getDoc(bookmarkDocRef)
    return bookmarkDoc.exists() && bookmarkDoc.data()?.type === 'hand'
  } catch (error) {
    console.error('북마크 상태 확인 실패:', error)
    return false
  }
}

/**
 * 사용자의 모든 북마크 조회
 */
export async function getUserBookmarks(userId: string): Promise<HandBookmarkWithDetails[]> {
  const bookmarksRef = collection(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId))

  try {
    const q = query(
      bookmarksRef,
      where('type', '==', 'hand'),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)

    const bookmarks: HandBookmarkWithDetails[] = []
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirestoreBookmark
      bookmarks.push(convertToLegacyFormat(docSnap.id, userId, data))
    })

    return bookmarks
  } catch (error) {
    console.error('북마크 목록 조회 실패:', error)
    throw error
  }
}

/**
 * 사용자의 북마크를 폴더별로 조회
 */
export async function getUserBookmarksByFolder(
  userId: string
): Promise<Map<string, HandBookmarkWithDetails[]>> {
  const bookmarks = await getUserBookmarks(userId)
  const folderMap = new Map<string, HandBookmarkWithDetails[]>()

  bookmarks.forEach((bookmark) => {
    const folderName = bookmark.folder_name || '기본'
    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, [])
    }
    folderMap.get(folderName)!.push(bookmark)
  })

  return folderMap
}

/**
 * 사용자의 북마크 폴더 목록 조회
 */
export async function getUserBookmarkFolders(userId: string): Promise<string[]> {
  const bookmarksRef = collection(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId))

  try {
    const q = query(bookmarksRef, where('type', '==', 'hand'))
    const snapshot = await getDocs(q)

    const folders = new Set<string>()
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirestoreBookmark
      if (data.folder_name) {
        folders.add(data.folder_name)
      }
    })

    return Array.from(folders).sort()
  } catch (error) {
    console.error('폴더 목록 조회 실패:', error)
    return []
  }
}

/**
 * 북마크 메모 업데이트
 */
export async function updateBookmarkNotes(
  handId: string,
  userId: string,
  notes: string
): Promise<void> {
  const bookmarkDocRef = doc(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId), handId)

  try {
    await updateDoc(bookmarkDocRef, { notes })
  } catch (error) {
    console.error('북마크 메모 업데이트 실패:', error)
    throw error
  }
}

/**
 * 북마크 폴더 변경
 */
export async function updateBookmarkFolder(
  handId: string,
  userId: string,
  folderName: string | null
): Promise<void> {
  const bookmarkDocRef = doc(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId), handId)

  try {
    await updateDoc(bookmarkDocRef, { folder_name: folderName || null })
  } catch (error) {
    console.error('북마크 폴더 변경 실패:', error)
    throw error
  }
}

/**
 * 여러 핸드의 북마크 상태를 한 번에 조회 (리스트용)
 */
export async function getBatchHandBookmarkStatus(
  handIds: string[],
  userId?: string
): Promise<Set<string>> {
  if (!userId || handIds.length === 0) return new Set()

  const bookmarkedIds = new Set<string>()

  try {
    // Firestore는 in 쿼리에 최대 30개 제한이 있으므로 배치 처리
    const batchSize = 30
    for (let i = 0; i < handIds.length; i += batchSize) {
      const batchIds = handIds.slice(i, i + batchSize)

      // 각 핸드 ID에 대해 직접 문서 조회 (더 효율적)
      const promises = batchIds.map(async (handId) => {
        const bookmarkDocRef = doc(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId), handId)
        const bookmarkDoc = await getDoc(bookmarkDocRef)
        if (bookmarkDoc.exists() && bookmarkDoc.data()?.type === 'hand') {
          bookmarkedIds.add(handId)
        }
      })

      await Promise.all(promises)
    }

    return bookmarkedIds
  } catch (error) {
    console.error('북마크 상태 일괄 조회 실패:', error)
    return new Set()
  }
}
