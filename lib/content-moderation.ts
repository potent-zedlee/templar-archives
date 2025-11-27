/**
 * Content Moderation Database Operations (Firestore)
 *
 * 콘텐츠 신고 및 모더레이션 관리
 *
 * @module lib/content-moderation
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
  limit,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import type { FirestoreContentReport, ReportReason, ReportStatus } from '@/lib/firestore-types'

export type { ReportReason, ReportStatus } from '@/lib/firestore-types'

export type Report = {
  id: string
  post_id: string | null
  comment_id: string | null
  reporter_id: string
  reporter_name: string
  reason: ReportReason
  description: string | null
  status: ReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_comment: string | null
  created_at: string
}

/**
 * Firestore 문서를 Report로 변환
 */
function toReport(id: string, data: FirestoreContentReport): Report {
  return {
    id,
    post_id: data.postId || null,
    comment_id: data.commentId || null,
    reporter_id: data.reporterId,
    reporter_name: data.reporterName,
    reason: data.reason,
    description: data.description || null,
    status: data.status,
    reviewed_by: data.reviewedBy || null,
    reviewed_at: data.reviewedAt?.toDate().toISOString() || null,
    admin_comment: data.adminComment || null,
    created_at: data.createdAt.toDate().toISOString(),
  }
}

/**
 * 신고 생성
 */
export async function createReport({
  postId,
  commentId,
  reporterId,
  reporterName,
  reason,
  description,
}: {
  postId?: string
  commentId?: string
  reporterId: string
  reporterName: string
  reason: ReportReason
  description?: string
}) {
  try {
    const reportData: FirestoreContentReport = {
      postId: postId || undefined,
      commentId: commentId || undefined,
      reporterId,
      reporterName,
      reason,
      description,
      status: 'pending',
      createdAt: Timestamp.now(),
    }

    const docRef = await addDoc(collection(firestore, COLLECTION_PATHS.CONTENT_REPORTS), reportData)

    return toReport(docRef.id, reportData)
  } catch (error) {
    console.error('createReport 실패:', error)
    throw error
  }
}

/**
 * 신고 목록 조회 (관리자)
 */
export async function fetchReports({
  status,
  limit: limitCount = 50,
}: {
  status?: ReportStatus
  limit?: number
} = {}) {
  try {
    let q = query(
      collection(firestore, COLLECTION_PATHS.CONTENT_REPORTS),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    if (status) {
      q = query(
        collection(firestore, COLLECTION_PATHS.CONTENT_REPORTS),
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    }

    const snapshot = await getDocs(q)

    // Post/Comment 정보를 별도로 조회해야 함
    const reports = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() as FirestoreContentReport
        const report = toReport(docSnap.id, data)

        // Post 정보 조회 (있는 경우)
        let post = null
        if (data.postId) {
          const postDoc = await getDoc(doc(firestore, COLLECTION_PATHS.POSTS, data.postId))
          if (postDoc.exists()) {
            const postData = postDoc.data()
            post = {
              id: postDoc.id,
              title: postData.title,
              author_name: postData.author?.name,
            }
          }
        }

        // Comment 정보 조회 (있는 경우 - 서브컬렉션이라 복잡함)
        // 일단 null로 처리
        const comment = null

        return {
          ...report,
          post,
          comment,
        }
      })
    )

    return reports
  } catch (error) {
    console.error('fetchReports 실패:', error)
    throw error
  }
}

/**
 * 신고 승인 (콘텐츠 숨김)
 */
export async function approveReport({
  reportId,
  adminId,
  adminComment,
}: {
  reportId: string
  adminId: string
  adminComment?: string
}) {
  try {
    // 1. Get report details
    const reportRef = doc(firestore, COLLECTION_PATHS.CONTENT_REPORTS, reportId)
    const reportSnap = await getDoc(reportRef)

    if (!reportSnap.exists()) {
      throw new Error('Report not found')
    }

    const reportData = reportSnap.data() as FirestoreContentReport

    // 2. Hide the content
    if (reportData.postId) {
      const postRef = doc(firestore, COLLECTION_PATHS.POSTS, reportData.postId)
      await updateDoc(postRef, { isHidden: true })
    }
    // Comment 숨김은 postId를 알아야 하므로 별도 처리 필요

    // 3. Update report status
    await updateDoc(reportRef, {
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: Timestamp.now(),
      adminComment: adminComment || null,
    })

    const updatedSnap = await getDoc(reportRef)
    return toReport(updatedSnap.id, updatedSnap.data() as FirestoreContentReport)
  } catch (error) {
    console.error('approveReport 실패:', error)
    throw error
  }
}

/**
 * 신고 거부
 */
export async function rejectReport({
  reportId,
  adminId,
  adminComment,
}: {
  reportId: string
  adminId: string
  adminComment?: string
}) {
  try {
    const reportRef = doc(firestore, COLLECTION_PATHS.CONTENT_REPORTS, reportId)

    await updateDoc(reportRef, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: Timestamp.now(),
      adminComment: adminComment || null,
    })

    const updatedSnap = await getDoc(reportRef)
    return toReport(updatedSnap.id, updatedSnap.data() as FirestoreContentReport)
  } catch (error) {
    console.error('rejectReport 실패:', error)
    throw error
  }
}

/**
 * 콘텐츠 숨김 (직접)
 */
export async function hideContent({
  postId,
  commentId,
}: {
  postId?: string
  commentId?: string
}) {
  try {
    if (postId) {
      const postRef = doc(firestore, COLLECTION_PATHS.POSTS, postId)
      await updateDoc(postRef, { isHidden: true })
    }
    // Comment 숨김은 postId를 알아야 함 - 현재 미지원
    if (commentId) {
      console.warn('hideContent for comment requires postId')
    }
  } catch (error) {
    console.error('hideContent 실패:', error)
    throw error
  }
}

/**
 * 콘텐츠 표시 (숨김 해제)
 */
export async function unhideContent({
  postId,
  commentId,
}: {
  postId?: string
  commentId?: string
}) {
  try {
    if (postId) {
      const postRef = doc(firestore, COLLECTION_PATHS.POSTS, postId)
      await updateDoc(postRef, { isHidden: false })
    }
    // Comment 표시는 postId를 알아야 함 - 현재 미지원
    if (commentId) {
      console.warn('unhideContent for comment requires postId')
    }
  } catch (error) {
    console.error('unhideContent 실패:', error)
    throw error
  }
}

/**
 * 콘텐츠 삭제 (관리자)
 */
export async function deleteContent({
  postId,
  commentId,
}: {
  postId?: string
  commentId?: string
}) {
  try {
    if (postId) {
      await deleteDoc(doc(firestore, COLLECTION_PATHS.POSTS, postId))
    }
    // Comment 삭제는 postId를 알아야 함 - 현재 미지원
    if (commentId) {
      console.warn('deleteContent for comment requires postId')
    }
  } catch (error) {
    console.error('deleteContent 실패:', error)
    throw error
  }
}

/**
 * 포스트 목록 조회 (관리자 - 숨김 포함)
 */
export async function fetchAllPosts({
  includeHidden = true,
  limit: limitCount = 50,
}: {
  includeHidden?: boolean
  limit?: number
} = {}) {
  try {
    let q = query(
      collection(firestore, COLLECTION_PATHS.POSTS),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    if (!includeHidden) {
      q = query(
        collection(firestore, COLLECTION_PATHS.POSTS),
        where('isHidden', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      )
    }

    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        content: data.content,
        author_name: data.author?.name,
        category: data.category,
        likes_count: data.stats?.likesCount || 0,
        comments_count: data.stats?.commentsCount || 0,
        is_hidden: data.isHidden || false,
        created_at: data.createdAt?.toDate().toISOString(),
      }
    })
  } catch (error) {
    console.error('fetchAllPosts 실패:', error)
    throw error
  }
}

/**
 * 댓글 목록 조회 (관리자 - 숨김 포함)
 * 참고: Firestore Collection Group Query 사용
 */
export async function fetchAllComments({
  includeHidden = true,
  limit: limitCount = 50,
}: {
  includeHidden?: boolean
  limit?: number
} = {}) {
  try {
    const { collectionGroup } = await import('firebase/firestore')

    let q = query(
      collectionGroup(firestore, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    // Firestore Collection Group Query는 복합 필터에 제한이 있음
    // includeHidden 필터는 클라이언트에서 처리

    const snapshot = await getDocs(q)

    let comments = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      const postId = docSnap.ref.parent.parent?.id

      return {
        id: docSnap.id,
        content: data.content,
        author_name: data.author?.name,
        post_id: postId,
        hand_id: data.handId,
        is_hidden: data.isHidden || false,
        created_at: data.createdAt?.toDate().toISOString(),
        post: postId
          ? {
              title: 'N/A', // 별도 조회 필요
            }
          : undefined,
      }
    })

    if (!includeHidden) {
      comments = comments.filter((c) => !c.is_hidden)
    }

    return comments
  } catch (error) {
    console.error('fetchAllComments 실패:', error)
    throw error
  }
}
