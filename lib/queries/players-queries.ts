/**
 * Players React Query Hooks
 *
 * Players 페이지의 데이터 페칭을 위한 React Query hooks
 */

import { useQuery } from '@tanstack/react-query'
import {
  fetchPlayersWithHandCount,
  fetchPlayerHandsGrouped,
  fetchPlayerPrizeHistory,
} from '@/lib/queries'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { calculatePlayerStatistics } from '@/lib/player-stats'
import { getPlayerClaimInfo, checkUserPlayerClaim } from '@/lib/player-claims'
import type { Player } from '@/lib/supabase'

// ==================== Query Keys ====================

export const playersKeys = {
  all: ['players'] as const,
  lists: () => [...playersKeys.all, 'list'] as const,
  list: (filters?: any) => [...playersKeys.lists(), filters] as const,
  details: () => [...playersKeys.all, 'detail'] as const,
  detail: (playerId: string) => [...playersKeys.details(), playerId] as const,
  hands: (playerId: string) => [...playersKeys.detail(playerId), 'hands'] as const,
  stats: (playerId: string) => [...playersKeys.detail(playerId), 'stats'] as const,
  prizes: (playerId: string) => [...playersKeys.detail(playerId), 'prizes'] as const,
  claim: (playerId: string, userId?: string) => [...playersKeys.detail(playerId), 'claim', userId] as const,
}

// ==================== Queries ====================

/**
 * Get players list with hand counts
 */
export function usePlayersQuery(filters?: {
  search?: string
  country?: string
  minWinnings?: number
  maxWinnings?: number
  sortBy?: string
}) {
  return useQuery({
    queryKey: playersKeys.list(filters),
    queryFn: async () => {
      return await fetchPlayersWithHandCount()
    },
    staleTime: 5 * 60 * 1000, // 5분 (플레이어 목록은 자주 변경되지 않음)
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Get single player detail
 */
export function usePlayerQuery(playerId: string) {
  return useQuery({
    queryKey: playersKeys.detail(playerId),
    queryFn: async () => {
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      if (error) throw error
      return data as Player
    },
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    enabled: !!playerId,
  })
}

/**
 * Get player hands (grouped by tournament)
 */
export function usePlayerHandsQuery(playerId: string) {
  return useQuery({
    queryKey: playersKeys.hands(playerId),
    queryFn: async () => {
      return await fetchPlayerHandsGrouped(playerId)
    },
    staleTime: 3 * 60 * 1000, // 3분
    gcTime: 10 * 60 * 1000, // 10분
    enabled: !!playerId,
  })
}

/**
 * Get player statistics
 */
export function usePlayerStatsQuery(playerId: string) {
  return useQuery({
    queryKey: playersKeys.stats(playerId),
    queryFn: async () => {
      // Get player hands first
      const hands = await fetchPlayerHandsGrouped(playerId)

      // Calculate statistics from hands
      // Note: This is a simplified version. You may need to fetch more detailed hand data
      const stats = calculatePlayerStatistics(playerId, hands)

      return stats
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    enabled: !!playerId,
  })
}

/**
 * Get player prize history
 */
export function usePlayerPrizesQuery(playerId: string) {
  return useQuery({
    queryKey: playersKeys.prizes(playerId),
    queryFn: async () => {
      return await fetchPlayerPrizeHistory(playerId)
    },
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    enabled: !!playerId,
  })
}

/**
 * Get player claim information
 */
export function usePlayerClaimQuery(playerId: string, userId?: string) {
  return useQuery({
    queryKey: playersKeys.claim(playerId, userId),
    queryFn: async () => {
      // Get claim info for the player
      const claimInfo = await getPlayerClaimInfo(playerId)

      // If userId provided, check if this user has claimed this player
      let userClaim = null
      if (userId) {
        const userClaimResult = await checkUserPlayerClaim(playerId, userId)
        if (userClaimResult.data) {
          userClaim = userClaimResult.data
        }
      }

      return {
        claimInfo,
        userClaim,
      }
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!playerId,
  })
}
