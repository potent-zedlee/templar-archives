/**
 * Live Reports React Query Hooks
 *
 * 라이브 리포팅 데이터 페칭을 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientSupabaseClient } from '@/lib/supabase-client'

const supabase = createClientSupabaseClient()

export type LiveReport = {
  id: string
  title: string
  content: string
  thumbnail_url?: string
  category: 'Tournament Update' | 'Chip Counts' | 'Breaking News' | 'Results' | 'Other'
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

export const liveReportsKeys = {
  all: ['live_reports'] as const,
  lists: () => [...liveReportsKeys.all, 'list'] as const,
  list: (filters?: { category?: string; status?: string }) => [...liveReportsKeys.lists(), filters] as const,
  details: () => [...liveReportsKeys.all, 'detail'] as const,
  detail: (id: string) => [...liveReportsKeys.details(), id] as const,
  my: () => [...liveReportsKeys.all, 'my'] as const,
  pending: () => [...liveReportsKeys.all, 'pending'] as const,
}

// ==================== Public Queries ====================

/**
 * Fetch published live reports
 */
export function useLiveReportsQuery(options?: { category?: string }) {
  return useQuery({
    queryKey: liveReportsKeys.list({ status: 'published', category: options?.category }),
    queryFn: async () => {
      let query = supabase
        .from('live_reports')
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
      return data as LiveReport[]
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
      const { data, error } = await supabase
        .from('live_reports')
        .select(`
          *,
          author:author_id (nickname, avatar_url),
          approver:approved_by (nickname)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as LiveReport
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('live_reports')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as LiveReport[]
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
      const { data, error } = await supabase
        .from('live_reports')
        .select(`
          *,
          author:author_id (nickname, avatar_url)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as LiveReport[]
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
      thumbnail_url?: string
      category: LiveReport['category']
      tags?: string[]
      external_link?: string
      status: 'draft' | 'pending'
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('live_reports')
        .insert({
          ...input,
          author_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as LiveReport
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
      thumbnail_url?: string
      category?: LiveReport['category']
      tags?: string[]
      external_link?: string
      status?: 'draft' | 'pending'
    }) => {
      const { id, ...updates } = input

      const { data, error } = await supabase
        .from('live_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as LiveReport
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
      const { error } = await supabase
        .from('live_reports')
        .delete()
        .eq('id', id)

      if (error) throw error
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('live_reports')
        .update({
          status: 'published',
          approved_by: user.id,
          published_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as LiveReport
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
      const { data, error } = await supabase
        .from('live_reports')
        .update({
          status: 'draft',
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as LiveReport
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: liveReportsKeys.pending() })
    },
  })
}
