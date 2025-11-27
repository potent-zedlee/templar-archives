/**
 * Live Reports React Query Hooks
 *
 * 라이브 리포팅 데이터 페칭을 위한 React Query hooks (Firestore)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { firestore, auth } from '@/lib/firebase'
import {
  type FirestoreLiveReport,
  type LiveReportCategory,
  type LiveReportStatus,
  type AuthorInfo,
  COLLECTION_PATHS,
} from '@/lib/firestore-types'

/**
 * LiveReport 문서 타입 (ID 포함, 날짜 필드는 ISO string으로 변환됨)
 */
export interface LiveReport {
  id: string
  title: string
  content: string
  thumbnailUrl?: string
  category: LiveReportCategory
  tags: string[]
  externalLink?: string
  status: LiveReportStatus
  author: AuthorInfo
  approver?: AuthorInfo
  createdAt: string // ISO string
  updatedAt: string // ISO string
  publishedAt?: string // ISO string
}

/**
 * Firestore 문서 → LiveReport 변환
 */
function docToLiveReport(docSnap: QueryDocumentSnapshot<DocumentData>): LiveReport {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    title: data.title,
    content: data.content,
    thumbnailUrl: data.thumbnailUrl,
    category: data.category,
    tags: data.tags || [],
    externalLink: data.externalLink,
    status: data.status,
    author: data.author,
    approver: data.approver,
    createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
    publishedAt: data.publishedAt?.toDate().toISOString(),
  }
}

// ==================== Query Keys ====================

export const liveReportsKeys = {
  all: ['live_reports'] as const,
  lists: () => [...liveReportsKeys.all, 'list'] as const,
  list: (filters?: { category?: string; status?: string }) =>
    [...liveReportsKeys.lists(), filters] as const,
  details: () => [...liveReportsKeys.all, 'detail'] as const,
  detail: (id: string) => [...liveReportsKeys.details(), id] as const,
  my: () => [...liveReportsKeys.all, 'my'] as const,
  pending: () => [...liveReportsKeys.all, 'pending'] as const,
}

// ==================== Public Queries ====================

/**
 * Fetch published live reports
 */
export function useLiveReportsQuery(options?: { category?: LiveReportCategory }) {
  return useQuery({
    queryKey: liveReportsKeys.list({ status: 'published', category: options?.category }),
    queryFn: async () => {
      const reportsRef = collection(firestore, COLLECTION_PATHS.LIVE_REPORTS)

      // 쿼리 구성
      const constraints = [
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
      ]

      if (options?.category) {
        constraints.unshift(where('category', '==', options.category))
      }

      const q = query(reportsRef, ...constraints)
      const snapshot = await getDocs(q)

      return snapshot.docs.map(docToLiveReport)
    },
    staleTime: 2 * 60 * 1000, // 2분 (더 자주 갱신)
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch live report detail
 */
export function useLiveReportDetailQuery(id: string) {
  return useQuery({
    queryKey: liveReportsKeys.detail(id),
    queryFn: async () => {
      const docRef = doc(firestore, COLLECTION_PATHS.LIVE_REPORTS, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        throw new Error('Live report not found')
      }

      return docToLiveReport(docSnap as QueryDocumentSnapshot<DocumentData>)
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

// ==================== Reporter Queries ====================

/**
 * Fetch my live reports (reporter only)
 */
export function useMyLiveReportsQuery() {
  return useQuery({
    queryKey: liveReportsKeys.my(),
    queryFn: async () => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const reportsRef = collection(firestore, COLLECTION_PATHS.LIVE_REPORTS)
      const q = query(
        reportsRef,
        where('author.id', '==', user.uid),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(docToLiveReport)
    },
    staleTime: 1 * 60 * 1000, // 1분
    gcTime: 5 * 60 * 1000,
  })
}

// ==================== Admin Queries ====================

/**
 * Fetch pending live reports (admin only)
 */
export function usePendingLiveReportsQuery() {
  return useQuery({
    queryKey: liveReportsKeys.pending(),
    queryFn: async () => {
      const reportsRef = collection(firestore, COLLECTION_PATHS.LIVE_REPORTS)
      const q = query(
        reportsRef,
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(q)
      return snapshot.docs.map(docToLiveReport)
    },
    staleTime: 1 * 60 * 1000, // 1분
    gcTime: 5 * 60 * 1000,
  })
}

// ==================== Mutations ====================

/**
 * Create live report (reporter)
 */
export function useCreateLiveReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      title: string
      content: string
      thumbnailUrl?: string
      category: LiveReportCategory
      tags?: string[]
      externalLink?: string
      status: 'draft' | 'pending'
    }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      // 사용자 정보 가져오기 (임베딩용)
      const userDocRef = doc(firestore, COLLECTION_PATHS.USERS, user.uid)
      const userSnap = await getDoc(userDocRef)

      if (!userSnap.exists()) {
        throw new Error('User profile not found')
      }

      const userData = userSnap.data()
      const author: AuthorInfo = {
        id: user.uid,
        name: userData.nickname || user.displayName || 'Anonymous',
        avatarUrl: userData.avatarUrl || user.photoURL || undefined,
      }

      const reportsRef = collection(firestore, COLLECTION_PATHS.LIVE_REPORTS)
      const newReport: Omit<FirestoreLiveReport, 'createdAt' | 'updatedAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>
        updatedAt: ReturnType<typeof serverTimestamp>
      } = {
        title: input.title,
        content: input.content,
        thumbnailUrl: input.thumbnailUrl,
        category: input.category,
        tags: input.tags || [],
        externalLink: input.externalLink,
        status: input.status,
        author,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(reportsRef, newReport)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        throw new Error('Failed to create report')
      }

      return docToLiveReport(docSnap as QueryDocumentSnapshot<DocumentData>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.my() })
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.pending() })
    },
  })
}

/**
 * Update live report (reporter)
 */
export function useUpdateLiveReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      title?: string
      content?: string
      thumbnailUrl?: string
      category?: LiveReportCategory
      tags?: string[]
      externalLink?: string
      status?: 'draft' | 'pending'
    }) => {
      const { id, ...updates } = input

      const docRef = doc(firestore, COLLECTION_PATHS.LIVE_REPORTS, id)

      // updatedAt 자동 추가
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      }

      await updateDoc(docRef, updateData)

      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        throw new Error('Report not found after update')
      }

      return docToLiveReport(docSnap as QueryDocumentSnapshot<DocumentData>)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.my() })
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.pending() })
    },
  })
}

/**
 * Delete live report (reporter or admin)
 */
export function useDeleteLiveReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(firestore, COLLECTION_PATHS.LIVE_REPORTS, id)
      await deleteDoc(docRef)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.my() })
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.pending() })
    },
  })
}

/**
 * Approve live report (admin only)
 */
export function useApproveLiveReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      // 승인자 정보 가져오기
      const userDocRef = doc(firestore, COLLECTION_PATHS.USERS, user.uid)
      const userSnap = await getDoc(userDocRef)

      if (!userSnap.exists()) {
        throw new Error('User profile not found')
      }

      const userData = userSnap.data()
      const approver: AuthorInfo = {
        id: user.uid,
        name: userData.nickname || user.displayName || 'Admin',
        avatarUrl: userData.avatarUrl || user.photoURL || undefined,
      }

      const docRef = doc(firestore, COLLECTION_PATHS.LIVE_REPORTS, id)
      await updateDoc(docRef, {
        status: 'published',
        approver,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        throw new Error('Report not found after approval')
      }

      return docToLiveReport(docSnap as QueryDocumentSnapshot<DocumentData>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.pending() })
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.lists() })
    },
  })
}

/**
 * Reject live report (admin only)
 */
export function useRejectLiveReportMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const docRef = doc(firestore, COLLECTION_PATHS.LIVE_REPORTS, id)
      await updateDoc(docRef, {
        status: 'draft',
        updatedAt: serverTimestamp(),
      })

      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) {
        throw new Error('Report not found after rejection')
      }

      return docToLiveReport(docSnap as QueryDocumentSnapshot<DocumentData>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.pending() })
    },
  })
}
