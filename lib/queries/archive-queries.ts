/**
 * Archive React Query Hooks
 *
 * Archive 페이지의 데이터 페칭을 위한 React Query hooks
 * Phase 33: Comprehensive Sorting & Type Safety Enhancement
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { fetchTournamentsTree } from '@/lib/queries'
import { getUnsortedVideos } from '@/lib/unsorted-videos'
import type { Tournament, Hand, UnsortedVideo } from '@/lib/types/archive'
import type { ServerSortParams } from '@/lib/types/sorting'
import { getSupabaseRange } from '@/hooks/useServerSorting'

const supabase = createClientSupabaseClient()

// ==================== Query Keys ====================

export const archiveKeys = {
  all: ['archive'] as const,
  tournaments: (gameType?: 'tournament' | 'cash-game', sortParams?: Partial<ServerSortParams>) =>
    gameType
      ? [...archiveKeys.all, 'tournaments', gameType, sortParams] as const
      : [...archiveKeys.all, 'tournaments', sortParams] as const,
  hands: (dayId: string) => [...archiveKeys.all, 'hands', dayId] as const,
  handsInfinite: (dayId: string) => [...archiveKeys.all, 'hands-infinite', dayId] as const,
  unsortedVideos: (sortParams?: Partial<ServerSortParams>) =>
    [...archiveKeys.all, 'unsorted-videos', sortParams] as const,
}

// ==================== Tournaments Query ====================

/**
 * Fetch tournaments with sub_events and days
 * Optimized: Increased staleTime as tournament hierarchy changes infrequently
 * Phase 33: Added server-side sorting support
 */
export function useTournamentsQuery(
  gameType?: 'tournament' | 'cash-game',
  sortParams?: Partial<ServerSortParams>
) {
  return useQuery({
    queryKey: archiveKeys.tournaments(gameType, sortParams),
    queryFn: async () => {
      const tournamentsData = await fetchTournamentsTree(gameType)

      // Add UI state (expanded, selected)
      const tournamentsWithUIState = tournamentsData.map((tournament: any) => ({
        ...tournament,
        sub_events: tournament.sub_events?.map((subEvent: any) => ({
          ...subEvent,
          // 하위 호환성: streams와 days 모두 제공
          streams: subEvent.streams?.map((stream: any) => ({ ...stream, selected: false })),
          days: subEvent.streams?.map((stream: any) => ({ ...stream, selected: false })),
          expanded: false,
        })),
        expanded: true,
      }))

      return tournamentsWithUIState as Tournament[]
    },
    // Client-side sorting via select option
    select: (data) => {
      if (!sortParams?.sortField || !sortParams?.sortDirection) return data

      // Apply client-side sorting
      const sorted = [...data].sort((a, b) => {
        let aValue: any
        let bValue: any

        // Map sortField to actual data field
        switch (sortParams.sortField) {
          case 'name':
            aValue = a.name
            bValue = b.name
            break
          case 'category':
            aValue = a.category
            bValue = b.category
            break
          case 'date':
            aValue = new Date(a.created_at || 0).getTime()
            bValue = new Date(b.created_at || 0).getTime()
            break
          case 'location':
            aValue = a.location || ''
            bValue = b.location || ''
            break
          default:
            return 0
        }

        // Null-safe comparison
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return 1
        if (bValue == null) return -1

        // Compare
        let result = 0
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          result = aValue.localeCompare(bValue, 'ko-KR', { sensitivity: 'base' })
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          result = aValue - bValue
        }

        return sortParams.sortDirection === 'asc' ? result : -result
      })

      return sorted
    },
    staleTime: 10 * 60 * 1000, // 10분 (토너먼트 계층 구조는 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분 (메모리에 더 오래 유지)
  })
}

// ==================== Hands Query ====================

/**
 * Fetch hands for a specific day (regular query)
 * Optimized: Increased staleTime as hand data changes infrequently
 */
export function useHandsQuery(dayId: string | null) {
  return useQuery({
    queryKey: archiveKeys.hands(dayId || ''),
    queryFn: async () => {
      if (!dayId) return []

      const { data, error } = await supabase
        .from('hands')
        .select(`
          *,
          hand_players(
            position,
            cards,
            player:players(name)
          )
        `)
        .eq('day_id', dayId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data || []).map((hand) => ({ ...hand, checked: false })) as Hand[]
    },
    enabled: !!dayId,
    staleTime: 5 * 60 * 1000, // 5분 (핸드 데이터는 자주 변경되지 않음)
    gcTime: 15 * 60 * 1000, // 15분 (메모리에 더 오래 유지)
  })
}

/**
 * Fetch hands with infinite scroll
 * Optimized: Increased staleTime as hand data changes infrequently
 */
const HANDS_PER_PAGE = 50

export function useHandsInfiniteQuery(dayId: string | null) {
  return useInfiniteQuery({
    queryKey: archiveKeys.handsInfinite(dayId || ''),
    queryFn: async ({ pageParam = 0 }) => {
      if (!dayId) return { hands: [], nextCursor: null }

      const from = pageParam * HANDS_PER_PAGE
      const to = from + HANDS_PER_PAGE - 1

      const { data, error, count } = await supabase
        .from('hands')
        .select(
          `
          *,
          hand_players(
            position,
            cards,
            player:players(name)
          )
        `,
          { count: 'exact' }
        )
        .eq('day_id', dayId)
        .order('created_at', { ascending: true })
        .range(from, to)

      if (error) throw error

      const hands = (data || []).map((hand) => ({ ...hand, checked: false })) as Hand[]
      const hasMore = count ? from + HANDS_PER_PAGE < count : false
      const nextCursor = hasMore ? pageParam + 1 : null

      return { hands, nextCursor }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!dayId,
    staleTime: 5 * 60 * 1000, // 5분 (무한 스크롤 데이터도 자주 변경되지 않음)
    gcTime: 15 * 60 * 1000, // 15분 (메모리에 더 오래 유지)
    initialPageParam: 0,
  })
}

// ==================== Unsorted Videos Query ====================

/**
 * Fetch unsorted videos
 * Optimized: Increased staleTime for better caching
 * Phase 33: Added server-side sorting support
 */
export function useUnsortedVideosQuery(sortParams?: Partial<ServerSortParams>) {
  return useQuery({
    queryKey: archiveKeys.unsortedVideos(sortParams),
    queryFn: async () => {
      const videos = await getUnsortedVideos()
      return videos as UnsortedVideo[]
    },
    // Client-side sorting via select option
    select: (data) => {
      if (!sortParams?.sortField || !sortParams?.sortDirection) return data

      // Apply client-side sorting
      const sorted = [...data].sort((a, b) => {
        let aValue: any
        let bValue: any

        // Map sortField to actual data field
        switch (sortParams.sortField) {
          case 'name':
            aValue = a.name
            bValue = b.name
            break
          case 'source':
            aValue = a.source
            bValue = b.source
            break
          case 'created':
            aValue = new Date(a.created_at || 0).getTime()
            bValue = new Date(b.created_at || 0).getTime()
            break
          case 'published':
            // Null-safe date handling
            aValue = a.published_at ? new Date(a.published_at).getTime() : null
            bValue = b.published_at ? new Date(b.published_at).getTime() : null
            break
          default:
            return 0
        }

        // Null-safe comparison
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return 1 // null 값은 마지막으로
        if (bValue == null) return -1

        // Compare
        let result = 0
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          result = aValue.localeCompare(bValue, 'ko-KR', { sensitivity: 'base' })
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          result = aValue - bValue
        }

        return sortParams.sortDirection === 'asc' ? result : -result
      })

      return sorted
    },
    staleTime: 3 * 60 * 1000, // 3분 (Unsorted 비디오 목록 변경 빈도 고려)
    gcTime: 10 * 60 * 1000, // 10분 (메모리에 더 오래 유지)
  })
}

// ==================== Mutations ====================

/**
 * Toggle hand favorite (Optimistic Update)
 */
export function useFavoriteHandMutation(dayId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ handId, favorite }: { handId: string; favorite: boolean }) => {
      const { error } = await supabase
        .from('hands')
        .update({ favorite })
        .eq('id', handId)

      if (error) throw error
    },
    onMutate: async ({ handId, favorite }) => {
      if (!dayId) return

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: archiveKeys.hands(dayId) })

      // Snapshot previous value
      const previousHands = queryClient.getQueryData(archiveKeys.hands(dayId))

      // Optimistically update
      queryClient.setQueryData(archiveKeys.hands(dayId), (old: Hand[] = []) =>
        old.map((h) => (h.id === handId ? { ...h, favorite } : h))
      )

      return { previousHands }
    },
    onError: (err, variables, context) => {
      if (dayId && context?.previousHands) {
        queryClient.setQueryData(archiveKeys.hands(dayId), context.previousHands)
      }
    },
    onSettled: () => {
      if (dayId) {
        queryClient.invalidateQueries({ queryKey: archiveKeys.hands(dayId) })
      }
    },
  })
}

/**
 * Toggle hand checked (local state only, no server update)
 */
export function useCheckHandMutation(dayId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ handId }: { handId: string }) => {
      // No server update needed for checked state
      return { handId }
    },
    onMutate: async ({ handId }) => {
      if (!dayId) return

      await queryClient.cancelQueries({ queryKey: archiveKeys.hands(dayId) })
      const previousHands = queryClient.getQueryData(archiveKeys.hands(dayId))

      queryClient.setQueryData(archiveKeys.hands(dayId), (old: Hand[] = []) =>
        old.map((h) => (h.id === handId ? { ...h, checked: !h.checked } : h))
      )

      return { previousHands }
    },
  })
}
