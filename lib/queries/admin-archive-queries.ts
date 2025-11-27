/**
 * Admin Archive React Query Hooks
 *
 * Admin 전용 Archive 쿼리 (모든 상태 조회 가능)
 * Firestore 기반
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { firestore } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  CollectionReference,
  QueryConstraint
} from 'firebase/firestore'
import { publishStream, unpublishStream, bulkPublishStreams, bulkUnpublishStreams } from '@/app/actions/archive-status'
import type { Tournament, Event, Stream, ContentStatus } from '@/lib/types/archive'

// ==================== Query Keys ====================

export const adminArchiveKeys = {
  all: ['admin-archive'] as const,
  tournaments: (statusFilter?: ContentStatus | 'all') =>
    [...adminArchiveKeys.all, 'tournaments', statusFilter] as const,
  events: (tournamentId: string, statusFilter?: ContentStatus | 'all') =>
    [...adminArchiveKeys.all, 'events', tournamentId, statusFilter] as const,
  streams: (eventId: string, statusFilter?: ContentStatus | 'all') =>
    [...adminArchiveKeys.all, 'streams', eventId, statusFilter] as const,
}

// ==================== Admin Tournaments Query ====================

/**
 * Admin 전용 Tournaments 쿼리 (모든 상태 포함)
 */
export function useAdminTournamentsQuery(statusFilter: ContentStatus | 'all' = 'all') {
  return useQuery({
    queryKey: adminArchiveKeys.tournaments(statusFilter),
    queryFn: async () => {
      const tournamentsRef = collection(firestore, 'tournaments') as CollectionReference
      const constraints: QueryConstraint[] = [
        orderBy('end_date', 'desc')
      ]

      // Status 필터 적용
      if (statusFilter !== 'all') {
        constraints.unshift(where('status', '==', statusFilter))
      }

      const q = query(tournamentsRef, ...constraints)
      const snapshot = await getDocs(q)

      const tournaments: Tournament[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        tournaments.push({
          id: doc.id,
          ...data,
          // Timestamp를 string으로 변환
          start_date: data.start_date instanceof Timestamp
            ? data.start_date.toDate().toISOString()
            : data.start_date,
          end_date: data.end_date instanceof Timestamp
            ? data.end_date.toDate().toISOString()
            : data.end_date,
          created_at: data.created_at instanceof Timestamp
            ? data.created_at.toDate().toISOString()
            : data.created_at,
          updated_at: data.updated_at instanceof Timestamp
            ? data.updated_at.toDate().toISOString()
            : data.updated_at,
        } as Tournament)
      })

      return tournaments
    },
    staleTime: 2 * 60 * 1000, // 2분 (Admin은 자주 업데이트)
    gcTime: 10 * 60 * 1000, // 10분
  })
}

// ==================== Admin Events Query ====================

/**
 * Admin 전용 Events 쿼리 (모든 상태 포함)
 */
export function useAdminEventsQuery(
  tournamentId: string,
  statusFilter: ContentStatus | 'all' = 'all'
) {
  return useQuery({
    queryKey: adminArchiveKeys.events(tournamentId, statusFilter),
    queryFn: async () => {
      const eventsRef = collection(firestore, 'sub_events') as CollectionReference
      const constraints: QueryConstraint[] = [
        where('tournament_id', '==', tournamentId),
        orderBy('date', 'desc')
      ]

      // Status 필터 적용
      if (statusFilter !== 'all') {
        constraints.splice(1, 0, where('status', '==', statusFilter))
      }

      const q = query(eventsRef, ...constraints)
      const snapshot = await getDocs(q)

      const events: Event[] = []
      snapshot.forEach(doc => {
        const data = doc.data()
        events.push({
          id: doc.id,
          ...data,
          // Timestamp를 string으로 변환
          date: data.date instanceof Timestamp
            ? data.date.toDate().toISOString()
            : data.date,
          created_at: data.created_at instanceof Timestamp
            ? data.created_at.toDate().toISOString()
            : data.created_at,
          updated_at: data.updated_at instanceof Timestamp
            ? data.updated_at.toDate().toISOString()
            : data.updated_at,
        } as Event)
      })

      return events
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
  eventId: string,
  statusFilter: ContentStatus | 'all' = 'all'
) {
  return useQuery({
    queryKey: adminArchiveKeys.streams(eventId, statusFilter),
    queryFn: async () => {
      const streamsRef = collection(firestore, 'streams') as CollectionReference
      const constraints: QueryConstraint[] = [
        where('sub_event_id', '==', eventId),
        orderBy('published_at', 'desc')
      ]

      // Status 필터 적용
      if (statusFilter !== 'all') {
        constraints.splice(1, 0, where('status', '==', statusFilter))
      }

      const q = query(streamsRef, ...constraints)
      const snapshot = await getDocs(q)

      const streams: (Stream & { hand_count?: number })[] = []
      const streamIds: string[] = []

      snapshot.forEach(doc => {
        const data = doc.data()
        streamIds.push(doc.id)

        streams.push({
          id: doc.id,
          ...data,
          // Timestamp를 string으로 변환
          published_at: data.published_at instanceof Timestamp
            ? data.published_at.toDate().toISOString()
            : data.published_at,
          created_at: data.created_at instanceof Timestamp
            ? data.created_at.toDate().toISOString()
            : data.created_at,
          updated_at: data.updated_at instanceof Timestamp
            ? data.updated_at.toDate().toISOString()
            : data.updated_at,
          hand_count: 0, // 초기값
        } as Stream & { hand_count?: number })
      })

      // Hand count 조회
      if (streamIds.length > 0) {
        const handCounts: Record<string, number> = {}

        // Firestore 'in' 쿼리는 최대 30개까지만 가능하므로 청크로 나눔
        const chunkSize = 30
        for (let i = 0; i < streamIds.length; i += chunkSize) {
          const chunk = streamIds.slice(i, i + chunkSize)
          const handsRef = collection(firestore, 'hands')
          const handsQuery = query(handsRef, where('day_id', 'in', chunk))
          const handsSnapshot = await getDocs(handsQuery)

          handsSnapshot.forEach(doc => {
            const dayId = doc.data().day_id
            handCounts[dayId] = (handCounts[dayId] || 0) + 1
          })
        }

        // Hand count 병합
        streams.forEach(stream => {
          stream.hand_count = handCounts[stream.id] || 0
        })
      }

      return streams
    },
    enabled: !!eventId,
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
