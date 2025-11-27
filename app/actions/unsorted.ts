'use server'

/**
 * Unsorted Videos 관리 Server Actions
 *
 * 관리자 전용 Unsorted 비디오 관리 기능
 * - CRUD 작업
 * - 배치 조직화
 * - 서버 사이드 권한 검증
 */

import { adminAuth, adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/firebase/constants'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { FieldValue } from 'firebase-admin/firestore'

// ==================== Helper Functions ====================

/**
 * 관리자 권한 검증 (Firebase Auth + Firestore role 기반)
 */
async function verifyAdmin(): Promise<{
  authorized: boolean
  error?: string
  userId?: string
}> {
  try {
    // 1. 세션 쿠키에서 토큰 가져오기
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return { authorized: false, error: 'Unauthorized - Please sign in' }
    }

    // 2. Firebase Admin SDK로 토큰 검증
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    const userId = decodedToken.uid

    // 3. Firestore에서 사용자 role 조회
    const userDoc = await adminFirestore
      .collection(COLLECTION_PATHS.USERS)
      .doc(userId)
      .get()

    if (!userDoc.exists) {
      return {
        authorized: false,
        error: 'User not found in database'
      }
    }

    const userData = userDoc.data()

    // 4. 밴 상태 확인
    if (userData?.bannedAt) {
      return {
        authorized: false,
        error: 'Account is banned'
      }
    }

    // 5. 관리자 역할 확인
    if (!['admin', 'high_templar'].includes(userData?.role || '')) {
      return {
        authorized: false,
        error: 'Forbidden - Admin access required'
      }
    }

    return { authorized: true, userId }
  } catch (error) {
    console.error('Error verifying admin:', error)
    return { authorized: false, error: 'Authentication failed' }
  }
}

/**
 * Normalize YouTube URL to standard format
 */
function normalizeYoutubeUrl(url: string): string {
  try {
    url = url.trim()

    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url
    }

    const urlObj = new URL(url)

    // Handle youtu.be short URLs
    if (urlObj.hostname === 'youtu.be' || urlObj.hostname === 'www.youtu.be') {
      const videoId = urlObj.pathname.slice(1)
      return `https://www.youtube.com/watch?v=${videoId}`
    }

    // Handle youtube.com URLs
    if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
      return url.replace(/^(https?:\/\/)youtube\.com/, '$1www.youtube.com')
    }

    return url
  } catch (error) {
    console.error('Error normalizing YouTube URL:', error)
    return url
  }
}

// ==================== Unsorted Video Actions ====================

/**
 * Create a new unsorted video
 */
export async function createUnsortedVideo(data: {
  name: string
  video_url?: string
  video_file?: string
  video_source?: 'youtube' | 'local' | 'nas'
  published_at?: string
}) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    // Normalize YouTube URL if provided
    let normalizedUrl = data.video_url || null
    if (normalizedUrl && data.video_source === 'youtube') {
      normalizedUrl = normalizeYoutubeUrl(normalizedUrl)
    }

    const now = new Date()
    const streamData = {
      name: data.name,
      videoUrl: normalizedUrl,
      videoFile: data.video_file || null,
      videoSource: data.video_source || 'youtube',
      subEventId: null,
      isOrganized: false,
      publishedAt: data.published_at ? new Date(data.published_at) : null,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await adminFirestore
      .collection(COLLECTION_PATHS.STREAMS)
      .add(streamData)

    revalidatePath('/admin/archive')
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error creating unsorted video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create video'
    }
  }
}

/**
 * Update an unsorted video
 */
export async function updateUnsortedVideo(
  id: string,
  data: {
    name?: string
    video_url?: string
    video_file?: string
    video_source?: 'youtube' | 'local' | 'nas'
    published_at?: string
  }
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    // Build update object
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.video_url !== undefined) {
      updateData.videoUrl = data.video_source === 'youtube' && data.video_url
        ? normalizeYoutubeUrl(data.video_url)
        : data.video_url
    }
    if (data.video_file !== undefined) updateData.videoFile = data.video_file
    if (data.video_source !== undefined) updateData.videoSource = data.video_source
    if (data.published_at !== undefined) {
      updateData.publishedAt = data.published_at ? new Date(data.published_at) : null
    }

    await adminFirestore
      .collection(COLLECTION_PATHS.STREAMS)
      .doc(id)
      .update(updateData)

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error updating unsorted video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update video'
    }
  }
}

/**
 * Delete an unsorted video
 */
export async function deleteUnsortedVideo(id: string) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    await adminFirestore
      .collection(COLLECTION_PATHS.STREAMS)
      .doc(id)
      .delete()

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error deleting unsorted video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete video'
    }
  }
}

/**
 * Delete multiple unsorted videos (batch)
 */
export async function deleteUnsortedVideosBatch(ids: string[]) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    const batch = adminFirestore.batch()
    const streamsRef = adminFirestore.collection(COLLECTION_PATHS.STREAMS)

    for (const id of ids) {
      batch.delete(streamsRef.doc(id))
    }

    await batch.commit()

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error deleting unsorted videos:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete videos'
    }
  }
}

/**
 * Organize a video by assigning it to a sub_event
 */
export async function organizeUnsortedVideo(
  videoId: string,
  subEventId: string
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    await adminFirestore
      .collection(COLLECTION_PATHS.STREAMS)
      .doc(videoId)
      .update({
        subEventId,
        isOrganized: true,
        organizedAt: new Date(),
        updatedAt: new Date(),
      })

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error organizing video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to organize video'
    }
  }
}

/**
 * Organize multiple videos at once (batch)
 */
export async function organizeUnsortedVideosBatch(
  videoIds: string[],
  subEventId: string
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    const batch = adminFirestore.batch()
    const streamsRef = adminFirestore.collection(COLLECTION_PATHS.STREAMS)
    const now = new Date()

    for (const videoId of videoIds) {
      batch.update(streamsRef.doc(videoId), {
        subEventId,
        isOrganized: true,
        organizedAt: now,
        updatedAt: now,
      })
    }

    await batch.commit()

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error organizing videos:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to organize videos'
    }
  }
}

/**
 * Get all unsorted videos (admin only)
 */
export async function getUnsortedVideos() {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error, data: [] }
  }

  try {
    const snapshot = await adminFirestore
      .collection(COLLECTION_PATHS.STREAMS)
      .where('subEventId', '==', null)
      .where('isOrganized', '==', false)
      .orderBy('createdAt', 'desc')
      .get()

    const data = snapshot.docs.map(doc => {
      const docData = doc.data()
      return {
        id: doc.id,
        name: docData.name,
        video_url: docData.videoUrl,
        video_file: docData.videoFile,
        video_source: docData.videoSource,
        created_at: docData.createdAt?.toDate().toISOString(),
        published_at: docData.publishedAt?.toDate().toISOString() || null,
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching unsorted videos:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch videos',
      data: []
    }
  }
}
