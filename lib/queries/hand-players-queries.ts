/**
 * Hand Players React Query Hooks
 *
 * 핸드 플레이어 데이터 페칭을 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchHandPlayers,
  fetchAllPlayers,
  addPlayerToHand,
  removePlayerFromHand,
  updatePlayerInHand,
  searchPlayers,
} from '@/lib/hand-players'
import type { HandPlayer, Player } from '@/lib/hand-players'
import { toast } from 'sonner'

// ==================== Query Keys ====================

export const handPlayersKeys = {
  all: ['hand-players'] as const,
  byHand: (handId: string) => [...handPlayersKeys.all, 'hand', handId] as const,
  allPlayers: () => ['players', 'all'] as const,
  searchPlayers: (query: string) => ['players', 'search', query] as const,
}

// ==================== Queries ====================

/**
 * Get players for a specific hand
 */
export function useHandPlayersQuery(handId: string) {
  return useQuery({
    queryKey: handPlayersKeys.byHand(handId),
    queryFn: async () => {
      return await fetchHandPlayers(handId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!handId,
  })
}

/**
 * Get all players
 */
export function useAllPlayersQuery() {
  return useQuery({
    queryKey: handPlayersKeys.allPlayers(),
    queryFn: async () => {
      return await fetchAllPlayers()
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Search players by name
 */
export function useSearchPlayersQuery(query: string) {
  return useQuery({
    queryKey: handPlayersKeys.searchPlayers(query),
    queryFn: async () => {
      if (!query || query.length < 2) return []
      return await searchPlayers(query)
    },
    staleTime: 1 * 60 * 1000, // 1분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: query.length >= 2,
  })
}

// ==================== Mutations ====================

/**
 * Add player to hand
 */
export function useAddPlayerMutation(handId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      playerId,
      position,
      cards,
      startingStack,
    }: {
      playerId: string
      position?: string
      cards?: string
      startingStack?: number
    }) => {
      return await addPlayerToHand(handId, playerId, position, cards, startingStack)
    },
    onMutate: async ({ playerId, position, cards, startingStack }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: handPlayersKeys.byHand(handId) })

      // Snapshot previous value
      const previousPlayers = queryClient.getQueryData<HandPlayer[]>(handPlayersKeys.byHand(handId))

      // Optimistically update
      const newPlayer: HandPlayer = {
        id: 'temp-' + Date.now(),
        hand_id: handId,
        player_id: playerId,
        position: position || null,
        cards: cards || null,
        starting_stack: startingStack || 0,
        ending_stack: 0,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<HandPlayer[]>(
        handPlayersKeys.byHand(handId),
        (old) => [...(old || []), newPlayer]
      )

      return { previousPlayers }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousPlayers) {
        queryClient.setQueryData(handPlayersKeys.byHand(handId), context.previousPlayers)
      }
      console.error('플레이어 추가 실패:', error)
      toast.error('Failed to add player')
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || 'Failed to add player')
        return
      }
      toast.success('Player added')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: handPlayersKeys.byHand(handId) })
    },
  })
}

/**
 * Remove player from hand
 */
export function useRemovePlayerMutation(handId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ playerId }: { playerId: string }) => {
      return await removePlayerFromHand(handId, playerId)
    },
    onMutate: async ({ playerId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: handPlayersKeys.byHand(handId) })

      // Snapshot previous value
      const previousPlayers = queryClient.getQueryData<HandPlayer[]>(handPlayersKeys.byHand(handId))

      // Optimistically update (remove the player)
      queryClient.setQueryData<HandPlayer[]>(
        handPlayersKeys.byHand(handId),
        (old) => (old || []).filter(player => player.player_id !== playerId)
      )

      return { previousPlayers }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousPlayers) {
        queryClient.setQueryData(handPlayersKeys.byHand(handId), context.previousPlayers)
      }
      console.error('플레이어 제거 실패:', error)
      toast.error('Failed to remove player')
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || 'Failed to remove player')
        return
      }
      toast.success('Player removed')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: handPlayersKeys.byHand(handId) })
    },
  })
}

/**
 * Update player in hand
 */
export function useUpdatePlayerMutation(handId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      playerId,
      data,
    }: {
      playerId: string
      data: {
        position?: string
        cards?: string
        starting_stack?: number
        ending_stack?: number
      }
    }) => {
      return await updatePlayerInHand(handId, playerId, data)
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || 'Failed to update player')
        return
      }
      toast.success('Player updated')
      queryClient.invalidateQueries({ queryKey: handPlayersKeys.byHand(handId) })
    },
    onError: (error) => {
      console.error('플레이어 정보 수정 실패:', error)
      toast.error('Failed to update player')
    },
  })
}
