/**
 * Archive React Query Hooks
 *
 * Archive 페이지의 데이터 페칭을 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { fetchTournamentsTree } from '@/lib/queries'
import { getUnsortedVideos } from '@/lib/unsorted-videos'
import type { Tournament, Hand, UnsortedVideo } from '@/lib/types/archive'

const supabase = createClientSupabaseClient()

// ==================== Query Keys ====================

export const archiveKeys = {
  all: ['archive'] as const,
  tournaments: (gameType?: 'tournament' | 'cash-game') =>
    gameType ? [...archiveKeys.all, 'tournaments', gameType] as const : [...archiveKeys.all, 'tournaments'] as const,
  hands: (dayId: string) => [...archiveKeys.all, 'hands', dayId] as const,
  handsInfinite: (dayId: string) => [...archiveKeys.all, 'hands-infinite', dayId] as const,
  unsortedVideos: () => [...archiveKeys.all, 'unsorted-videos'] as const,
}

// ==================== Tournaments Query ====================

/**
 * Fetch tournaments with sub_events and days
 */
export function useTournamentsQuery(gameType?: 'tournament' | 'cash-game') {
  return useQuery({
    queryKey: archiveKeys.tournaments(gameType),
    queryFn: async () => {
      const tournamentsData = await fetchTournamentsTree(gameType)

      // Add UI state (expanded, selected)
      const tournamentsWithUIState = tournamentsData.map((tournament: any) => ({
        ...tournament,
        sub_events: tournament.sub_events?.map((subEvent: any) => ({
          ...subEvent,
          streams: subEvent.streams?.map((stream: any) => ({ ...stream, selected: false })),
          expanded: false,
        })),
        expanded: true,
      }))

      return tournamentsWithUIState as Tournament[]
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

// ==================== Hands Query ====================

/**
 * Fetch hands for a specific day (regular query)
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
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Fetch hands with infinite scroll
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
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    initialPageParam: 0,
  })
}

// ==================== Unsorted Videos Query ====================

/**
 * Fetch unsorted videos
 */
export function useUnsortedVideosQuery() {
  return useQuery({
    queryKey: archiveKeys.unsortedVideos(),
    queryFn: async () => {
      const videos = await getUnsortedVideos()
      return videos as UnsortedVideo[]
    },
    staleTime: 60 * 1000, // 1분
    gcTime: 5 * 60 * 1000, // 5분
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
