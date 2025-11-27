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
  limit,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { auth } from '@/lib/firebase'

// Firestore converter for News
const newsConverter = {
  toFirestore(news: Omit<News, 'id'>): DocumentData {
    return {
      ...news,
      created_at: news.created_at ? Timestamp.fromDate(new Date(news.created_at)) : serverTimestamp(),
      updated_at: news.updated_at ? Timestamp.fromDate(new Date(news.updated_at)) : serverTimestamp(),
      published_at: news.published_at ? Timestamp.fromDate(new Date(news.published_at)) : null,
    }
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): News {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      title: data.title,
      content: data.content,
      thumbnail_url: data.thumbnail_url,
      category: data.category,
      tags: data.tags || [],
      external_link: data.external_link,
      status: data.status,
      author_id: data.author_id,
      approved_by: data.approved_by,
      created_at: data.created_at?.toDate().toISOString() || new Date().toISOString(),
      updated_at: data.updated_at?.toDate().toISOString() || new Date().toISOString(),
      published_at: data.published_at?.toDate().toISOString(),
      author: data.author,
      approver: data.approver,
    } as News
  }
}

export type News = {
  id: string
  title: string
  content: string
  thumbnail_url?: string
  category: 'Tournament' | 'Player News' | 'Industry' | 'General' | 'Other'
  tags: string[]
  external_link?: string
  status: 'draft' | 'pending' | 'published'
  author_id: string
  approved_by?: string
  created_at: string
  updated_at: string
  published_at?: string
  author?: {
    nickname: string
    avatar_url?: string
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
        avatar_url: data.avatar_url
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
      if (news.author_id) {
        enriched.author = await fetchUserProfile(news.author_id) || undefined
      }

      // Fetch approver profile
      if (news.approved_by) {
        enriched.approver = await fetchUserProfile(news.approved_by) || undefined
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
        orderBy('published_at', 'desc')
      )

      if (options?.category) {
        q = query(
          newsRef,
          where('status', '==', 'published'),
          where('category', '==', options.category),
          orderBy('published_at', 'desc')
        )
      }

      const querySnapshot = await getDocs(q)
      const newsItems = querySnapshot.docs.map(doc => doc.data())

      // Enrich with author profiles
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

      if (news.author_id) {
        enriched.author = await fetchUserProfile(news.author_id) || undefined
      }

      if (news.approved_by) {
        enriched.approver = await fetchUserProfile(news.approved_by) || undefined
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
    queryFn: async () => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const newsRef = collection(db, 'news').withConverter(newsConverter)
      const q = query(
        newsRef,
        where('author_id', '==', user.uid),
        orderBy('created_at', 'desc')
      )

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => doc.data())
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
        orderBy('created_at', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const newsItems = querySnapshot.docs.map(doc => doc.data())

      // Enrich with author profiles
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
      thumbnail_url?: string
      category: News['category']
      tags?: string[]
      external_link?: string
      status: 'draft' | 'pending'
    }) => {
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const newsRef = collection(db, 'news')
      const newsData = {
        ...input,
        tags: input.tags || [],
        author_id: user.uid,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
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
      thumbnail_url?: string
      category?: News['category']
      tags?: string[]
      external_link?: string
      status?: 'draft' | 'pending'
    }) => {
      const { id, ...updates } = input

      const newsRef = doc(db, 'news', id)
      await updateDoc(newsRef, {
        ...updates,
        updated_at: serverTimestamp(),
      })

      const docSnap = await getDoc(newsRef.withConverter(newsConverter))

      if (!docSnap.exists()) {
        throw new Error('News not found')
      }

      return docSnap.data()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: newsKeys.my() })
      queryClient.invalidateQueries({ queryKey: newsKeys.detail(data.id) })
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
        approved_by: user.uid,
        published_at: serverTimestamp(),
        updated_at: serverTimestamp(),
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
        updated_at: serverTimestamp(),
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
