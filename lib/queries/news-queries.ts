/**
 * News React Query Hooks
 *
 * 뉴스 데이터 페칭을 위한 React Query hooks (Firestore)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { firestore as db, auth } from '@/lib/firebase'

// Firestore converter for News
const newsConverter = {
  toFirestore(news: Omit<News, 'id'>): DocumentData {
    return {
      ...news,
      createdAt: news.createdAt ? Timestamp.fromDate(new Date(news.createdAt)) : serverTimestamp(),
      updatedAt: news.updatedAt ? Timestamp.fromDate(new Date(news.updatedAt)) : serverTimestamp(),
      publishedAt: news.publishedAt ? Timestamp.fromDate(new Date(news.publishedAt)) : null,
    }
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): News {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      title: data.title,
      content: data.content,
      thumbnailUrl: data.thumbnailUrl ?? data.thumbnail_url,
      category: data.category,
      tags: data.tags || [],
      externalLink: data.externalLink ?? data.external_link,
      status: data.status,
      authorId: data.authorId ?? data.author_id,
      approvedBy: data.approvedBy ?? data.approved_by,
      createdAt: (data.createdAt ?? data.created_at)?.toDate().toISOString() || new Date().toISOString(),
      updatedAt: (data.updatedAt ?? data.updated_at)?.toDate().toISOString() || new Date().toISOString(),
      publishedAt: (data.publishedAt ?? data.published_at)?.toDate().toISOString(),
      author: data.author,
      approver: data.approver,
    } as News
  }
}

export type News = {
  id: string
  title: string
  content: string
  thumbnailUrl?: string
  category: 'Tournament' | 'Player News' | 'Industry' | 'General' | 'Other'
  tags: string[]
  externalLink?: string
  status: 'draft' | 'pending' | 'published'
  authorId: string
  approvedBy?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
  author?: {
    nickname: string
    avatarUrl?: string
  }
  approver?: {
    nickname: string
  }
}

// ==================== Query Keys ====================

export const newsKeys = {
  all: ['news'] as const,
  lists: () => [...newsKeys.all, 'list'] as const,
  list: (filters?: { category?: string; status?: string }) => [...newsKeys.lists(), filters] as const,
  details: () => [...newsKeys.all, 'detail'] as const,
  detail: (id: string) => [...newsKeys.details(), id] as const,
  my: () => [...newsKeys.all, 'my'] as const,
  pending: () => [...newsKeys.all, 'pending'] as const,
}

// ==================== Helper Functions ====================

/**
 * Fetch user profile from profiles collection
 */
async function fetchUserProfile(userId: string) {
  try {
    const profileDoc = await getDoc(doc(db, 'profiles', userId))
    if (profileDoc.exists()) {
      const data = profileDoc.data()
      return {
        nickname: data.nickname || 'Unknown',
        avatarUrl: data.avatarUrl ?? data.avatar_url
      }
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
  }
  return null
}

/**
 * Enrich news with author and approver data
 */
async function enrichNewsWithProfiles(newsItems: News[]): Promise<News[]> {
  const enrichedNews = await Promise.all(
    newsItems.map(async (news) => {
      const enriched = { ...news }

      // Fetch author profile
      if (news.authorId) {
        enriched.author = await fetchUserProfile(news.authorId) || undefined
      }

      // Fetch approver profile
      if (news.approvedBy) {
        enriched.approver = await fetchUserProfile(news.approvedBy) || undefined
      }

      return enriched
    })
  )

  return enrichedNews
}

// ==================== Public Queries ====================

/**
 * Fetch published news
 */
export function useNewsQuery(options?: { category?: string }) {
  return useQuery({
    queryKey: newsKeys.list({ status: 'published', category: options?.category }),
    queryFn: async () => {
      const newsRef = collection(db, 'news').withConverter(newsConverter)

      let q = query(
        newsRef,
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc')
      )

      if (options?.category) {
        q = query(
          newsRef,
          where('status', '==', 'published'),
          where('category', '==', options.category),
          orderBy('publishedAt', 'desc')
        )
      }

      const querySnapshot = await getDocs(q)
      const newsItems = querySnapshot.docs.map(doc => doc.data()) as News[]

      return await enrichNewsWithProfiles(newsItems)
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Fetch news detail
 */
export function useNewsDetailQuery(id: string) {
  return useQuery({
    queryKey: newsKeys.detail(id),
    queryFn: async () => {
      const newsRef = doc(db, 'news', id).withConverter(newsConverter)
      const docSnap = await getDoc(newsRef)

      if (!docSnap.exists()) {
        throw new Error('News not found')
      }

      const news = docSnap.data()

      // Enrich with author and approver profiles
      const enriched = { ...news }

      if (news.authorId) {
        enriched.author = await fetchUserProfile(news.authorId) || undefined
      }

      if (news.approvedBy) {
        enriched.approver = await fetchUserProfile(news.approvedBy) || undefined
      }

      return enriched
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

// ==================== Reporter Queries ====================

/**
 * Fetch my news (reporter only)
 */
export function useMyNewsQuery() {
  return useQuery({
    queryKey: newsKeys.my(),
    queryFn: async (): Promise<News[]> => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const newsRef = collection(db, 'news').withConverter(newsConverter)
      const q = query(
        newsRef,
        where('authorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => doc.data() as News)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000,
  })
}

// ==================== Admin Queries ====================

/**
 * Fetch pending news (admin only)
 */
export function usePendingNewsQuery() {
  return useQuery({
    queryKey: newsKeys.pending(),
    queryFn: async () => {
      const newsRef = collection(db, 'news').withConverter(newsConverter)
      const q = query(
        newsRef,
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const newsItems = querySnapshot.docs.map(doc => doc.data()) as News[]

      return await enrichNewsWithProfiles(newsItems)
    },
    staleTime: 1 * 60 * 1000, // 1분
    gcTime: 5 * 60 * 1000,
  })
}

// ==================== Mutations ====================

/**
 * Create news (reporter)
 */
export function useCreateNewsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      title: string
      content: string
      thumbnailUrl?: string
      category: News['category']
      tags?: string[]
      externalLink?: string
      status: 'draft' | 'pending'
    }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const newsRef = collection(db, 'news')
      const newsData = {
        ...input,
        tags: input.tags || [],
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(newsRef, newsData)
      const docSnap = await getDoc(docRef.withConverter(newsConverter))

      if (!docSnap.exists()) {
        throw new Error('Failed to create news')
      }

      return docSnap.data()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newsKeys.my() })
      queryClient.invalidateQueries({ queryKey: newsKeys.pending() })
    },
  })
}

/**
 * Update news (reporter)
 */
export function useUpdateNewsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      title?: string
      content?: string
      thumbnailUrl?: string
      category?: News['category']
      tags?: string[]
      externalLink?: string
      status?: 'draft' | 'pending'
    }) => {
      const { id, ...updates } = input

      const newsRef = doc(db, 'news', id)
      await updateDoc(newsRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      })

      const docSnap = await getDoc(newsRef.withConverter(newsConverter))

      if (!docSnap.exists()) {
        throw new Error('News not found')
      }

      return docSnap.data()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.my() })
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: newsKeys.detail(data.id) })
      }
      queryClient.invalidateQueries({ queryKey: newsKeys.pending() })
    },
  })
}

/**
 * Delete news (reporter or admin)
 */
export function useDeleteNewsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const newsRef = doc(db, 'news', id)
      await deleteDoc(newsRef)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newsKeys.my() })
      queryClient.invalidateQueries({ queryKey: newsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: newsKeys.pending() })
    },
  })
}

/**
 * Approve news (admin only)
 */
export function useApproveNewsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const newsRef = doc(db, 'news', id)
      await updateDoc(newsRef, {
        status: 'published',
        approvedBy: user.uid,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const docSnap = await getDoc(newsRef.withConverter(newsConverter))

      if (!docSnap.exists()) {
        throw new Error('News not found')
      }

      return docSnap.data()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newsKeys.pending() })
      queryClient.invalidateQueries({ queryKey: newsKeys.lists() })
    },
  })
}

/**
 * Reject news (admin only)
 */
export function useRejectNewsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const newsRef = doc(db, 'news', id)
      await updateDoc(newsRef, {
        status: 'draft',
        updatedAt: serverTimestamp(),
      })

      const docSnap = await getDoc(newsRef.withConverter(newsConverter))

      if (!docSnap.exists()) {
        throw new Error('News not found')
      }

      return docSnap.data()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newsKeys.pending() })
    },
  })
}
