/**
 * News React Query Hooks
 *
 * 뉴스 데이터 페칭을 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientSupabaseClient } from '@/lib/supabase-client'

const supabase = createClientSupabaseClient()

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

// ==================== Public Queries ====================

/**
 * Fetch published news
 */
export function useNewsQuery(options?: { category?: string }) {
  return useQuery({
    queryKey: newsKeys.list({ status: 'published', category: options?.category }),
    queryFn: async () => {
      let query = supabase
        .from('news')
        .select(`
          *,
          author:author_id (nickname, avatar_url)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (options?.category) {
        query = query.eq('category', options.category)
      }

      const { data, error } = await query

      if (error) throw error
      return data as News[]
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
      const { data, error } = await supabase
        .from('news')
        .select(`
          *,
          author:author_id (nickname, avatar_url),
          approver:approved_by (nickname)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as News
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as News[]
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
      const { data, error } = await supabase
        .from('news')
        .select(`
          *,
          author:author_id (nickname, avatar_url)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as News[]
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('news')
        .insert({
          ...input,
          author_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as News
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

      const { data, error } = await supabase
        .from('news')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as News
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
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id)

      if (error) throw error
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('news')
        .update({
          status: 'published',
          approved_by: user.id,
          published_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as News
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
      const { data, error } = await supabase
        .from('news')
        .update({
          status: 'draft',
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as News
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: newsKeys.pending() })
    },
  })
}
