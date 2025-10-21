'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  calculatePlayerStatistics,
  calculatePositionStats,
  classifyPlayStyle,
  getPlayStyleDescription,
  getPlayStyleColor,
  type PlayerStatistics,
  type PositionStats,
  type PlayStyle,
} from '@/lib/player-stats'

/**
 * 플레이어 통계 조회 훅
 */
export function usePlayerStatsQuery(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-stats', 'overall', playerId],
    queryFn: async () => {
      if (!playerId) {
        throw new Error('Player ID is required')
      }
      return await calculatePlayerStatistics(playerId)
    },
    enabled: !!playerId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    retry: 2,
  })
}

/**
 * 포지션별 통계 조회 훅
 */
export function usePositionalStatsQuery(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-stats', 'positional', playerId],
    queryFn: async () => {
      if (!playerId) {
        throw new Error('Player ID is required')
      }
      return await calculatePositionStats(playerId)
    },
    enabled: !!playerId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    retry: 2,
  })
}

/**
 * 플레이 스타일 정보 훅
 * 전체 통계를 기반으로 플레이 스타일 분류
 */
export function usePlayStyleQuery(playerId: string | undefined) {
  const statsQuery = usePlayerStatsQuery(playerId)

  return {
    ...statsQuery,
    data: statsQuery.data
      ? {
          style: classifyPlayStyle(
            statsQuery.data.vpip,
            statsQuery.data.pfr,
            statsQuery.data.totalHands
          ),
          description: getPlayStyleDescription(
            classifyPlayStyle(
              statsQuery.data.vpip,
              statsQuery.data.pfr,
              statsQuery.data.totalHands
            )
          ),
          color: getPlayStyleColor(
            classifyPlayStyle(
              statsQuery.data.vpip,
              statsQuery.data.pfr,
              statsQuery.data.totalHands
            )
          ),
          stats: statsQuery.data,
        }
      : undefined,
  }
}

/**
 * 통계 캐시 무효화 훅
 * 핸드 액션이 수정되었을 때 사용
 */
export function useInvalidatePlayerStats() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (playerId: string) => {
      // 실제 무효화만 수행 (별도의 API 호출 없음)
      await queryClient.invalidateQueries({
        queryKey: ['player-stats', 'overall', playerId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['player-stats', 'positional', playerId],
      })
    },
    onSuccess: () => {
      console.log('플레이어 통계 캐시 무효화 완료')
    },
  })
}

/**
 * 여러 플레이어의 통계를 한 번에 조회하는 훅
 */
export function useMultiplePlayersStatsQuery(playerIds: string[]) {
  return useQuery({
    queryKey: ['player-stats', 'multiple', playerIds.sort().join(',')],
    queryFn: async () => {
      const statsPromises = playerIds.map(id => calculatePlayerStatistics(id))
      const results = await Promise.all(statsPromises)

      return playerIds.map((id, index) => ({
        playerId: id,
        stats: results[index],
      }))
    },
    enabled: playerIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    retry: 2,
  })
}

/**
 * 통계 기본값 (Empty State)
 */
export const defaultPlayerStats: PlayerStatistics = {
  vpip: 0,
  pfr: 0,
  threeBet: 0,
  ats: 0,
  winRate: 0,
  avgPotSize: 0,
  showdownWinRate: 0,
  totalHands: 0,
  handsWon: 0,
}

/**
 * 통계가 비어있는지 확인
 */
export function isStatsEmpty(stats: PlayerStatistics | undefined): boolean {
  return !stats || stats.totalHands === 0
}

/**
 * 통계 포맷팅 유틸리티
 */
export function formatStatPercentage(value: number): string {
  return `${value}%`
}

export function formatStatNumber(value: number): string {
  return value.toLocaleString()
}

export function formatPotSize(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

/**
 * 통계 비교 유틸리티
 * 두 플레이어의 통계를 비교하여 더 나은 쪽을 표시
 */
export function compareStats(
  stat1: number,
  stat2: number,
  higherIsBetter = true
): 'better' | 'worse' | 'equal' {
  if (stat1 === stat2) return 'equal'
  if (higherIsBetter) {
    return stat1 > stat2 ? 'better' : 'worse'
  }
  return stat1 < stat2 ? 'better' : 'worse'
}

/**
 * 플레이어 통계 타입 재export
 */
export type { PlayerStatistics, PositionStats, PlayStyle }
