/**
 * Admin Archive React Query Hooks
 *
 * Admin 전용 Archive 쿼리 (모든 상태 조회 가능)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { publishStream, unpublishStream, bulkPublishStreams, bulkUnpublishStreams } from '@/app/actions/archive-status'
import type { Tournament, SubEvent, Stream, ContentStatus } from '@/lib/types/archive'

const supabase = createClientSupabaseClient()

// ==================== Query Keys ====================

export const adminArchiveKeys = {
  all: ['admin-archive'] as const,
  tournaments: (statusFilter?: ContentStatus | 'all') =>
    [...adminArchiveKeys.all, 'tournaments', statusFilter] as const,
  subEvents: (tournamentId: string, statusFilter?: ContentStatus | 'all') =>
    [...adminArchiveKeys.all, 'sub-events', tournamentId, statusFilter] as const,
  streams: (subEventId: string, statusFilter?: ContentStatus | 'all') =>
    [...adminArchiveKeys.all, 'streams', subEventId, statusFilter] as const,
}

// ==================== Admin Tournaments Query ====================

/**
 * Admin 전용 Tournaments 쿼리 (모든 상태 포함)
 */
export function useAdminTournamentsQuery(statusFilter: ContentStatus | 'all' = 'all') {
  return useQuery({
    queryKey: adminArchiveKeys.tournaments(statusFilter),
    queryFn: async () => {
      let query = supabase
        .from('tournaments')
        .select('*')
        .order('end_date', { ascending: false })

      // Status 필터 적용
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as Tournament[]
    },
    staleTime: 2 * 60 * 1000, // 2분 (Admin은 자주 업데이트)
    gcTime: 10 * 60 * 1000, // 10분
  })
}

// ==================== Admin SubEvents Query ====================

/**
 * Admin 전용 SubEvents 쿼리 (모든 상태 포함)
 */
export function useAdminSubEventsQuery(
  tournamentId: string,
  statusFilter: ContentStatus | 'all' = 'all'
) {
  return useQuery({
    queryKey: adminArchiveKeys.subEvents(tournamentId, statusFilter),
    queryFn: async () => {
      let query = supabase
        .from('sub_events')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('date', { ascending: false })

      // Status 필터 적용
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return (data || []) as SubEvent[]
    },
    enabled: !!tournamentId,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

// ==================== Admin Streams Query ====================

/**
 * Admin 전용 Streams 쿼리 (모든 상태 포함)
 */
export function useAdminStreamsQuery(
  subEventId: string,
  statusFilter: ContentStatus | 'all' = 'all'
) {
  return useQuery({
    queryKey: adminArchiveKeys.streams(subEventId, statusFilter),
    queryFn: async () => {
      let query = supabase
        .from('streams')
        .select('*')
        .eq('sub_event_id', subEventId)
        .order('published_at', { ascending: false })

      // Status 필터 적용
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data: streamsData, error } = await query

      if (error) throw error

      // Hand count 조회
      const streamIds = (streamsData || []).map(s => s.id)
      let handCounts: Record<string, number> = {}

      if (streamIds.length > 0) {
        const { data: handCountData } = await supabase
          .from('hands')
          .select('day_id')
          .in('day_id', streamIds)

        if (handCountData) {
          handCounts = handCountData.reduce((acc, h) => {
            acc[h.day_id] = (acc[h.day_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        }
      }

      // Hand count 병합
      const streamsWithCounts = (streamsData || []).map(stream => ({
        ...stream,
        hand_count: handCounts[stream.id] || 0
      }))

      return streamsWithCounts as (Stream & { hand_count?: number })[]
    },
    enabled: !!subEventId,
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

// ==================== Publish Mutations ====================

/**
 * Publish Stream Mutation
 */
export function usePublishStreamMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (streamId: string) => {
      const result = await publishStream(streamId)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      // 모든 admin archive 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: adminArchiveKeys.all })
    },
  })
}

/**
 * Unpublish Stream Mutation
 */
export function useUnpublishStreamMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (streamId: string) => {
      const result = await unpublishStream(streamId)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      // 모든 admin archive 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: adminArchiveKeys.all })
    },
  })
}

/**
 * Bulk Publish Streams Mutation
 */
export function useBulkPublishMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (streamIds: string[]) => {
      const result = await bulkPublishStreams(streamIds)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      // 모든 admin archive 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: adminArchiveKeys.all })
    },
  })
}

/**
 * Bulk Unpublish Streams Mutation
 */
export function useBulkUnpublishMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (streamIds: string[]) => {
      const result = await bulkUnpublishStreams(streamIds)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      // 모든 admin archive 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: adminArchiveKeys.all })
    },
  })
}
