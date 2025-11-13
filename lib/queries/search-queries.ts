/**
 * Search React Query Hooks
 *
 * Search 페이지의 데이터 페칭을 위한 React Query hooks
 */

import { useQuery } from '@tanstack/react-query'
import { fetchHandsWithDetails, fetchTournamentsTree, fetchPlayersWithHandCount } from '@/lib/queries'
import type { Hand, Player } from '@/lib/supabase'

// ==================== Query Keys ====================

export const searchKeys = {
  all: ['search'] as const,
  hands: (filters?: any) => [...searchKeys.all, 'hands', filters] as const,
  tournaments: () => [...searchKeys.all, 'tournaments'] as const,
  players: () => [...searchKeys.all, 'players'] as const,
}

// ==================== Queries ====================

/**
 * Search hands with filters
 */
export function useSearchHandsQuery(options: {
  limit?: number
  offset?: number
  favoriteOnly?: boolean
  streamId?: string
  playerId?: string
  enabled?: boolean
}) {
  return useQuery({
    queryKey: searchKeys.hands(options),
    queryFn: async () => {
      const { hands, count } = await fetchHandsWithDetails(options)
      return { hands, count }
    },
    staleTime: 1 * 60 * 1000, // 1분 (검색 결과는 빠르게 변경될 수 있음)
    gcTime: 3 * 60 * 1000, // 3분
    enabled: options.enabled !== false, // 기본값은 true
  })
}

/**
 * Get tournaments list for filters
 */
export function useTournamentsQuery() {
  return useQuery({
    queryKey: searchKeys.tournaments(),
    queryFn: async () => {
      return await fetchTournamentsTree()
    },
    staleTime: 10 * 60 * 1000, // 10분 (토너먼트는 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분
  })
}

/**
 * Get players list for filters
 */
export function usePlayersQuery() {
  return useQuery({
    queryKey: searchKeys.players(),
    queryFn: async () => {
      return await fetchPlayersWithHandCount()
    },
    staleTime: 10 * 60 * 1000, // 10분 (플레이어는 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분
  })
}
