/**
 * Admin Archive React Query Hooks
 *
 * Admin 전용 Archive 쿼리 (모든 상태 조회 가능)
 * 파이프라인 상태별 스트림 조회 및 통계
 *
 * Firestore 기반
 *
 * @module lib/queries/admin-archive-queries
 */

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { firestore } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  Timestamp,
  CollectionReference,
  QueryConstraint,
  getCountFromServer,
} from 'firebase/firestore'
import { toast } from 'sonner'
import { publishStream, unpublishStream, bulkPublishStreams, bulkUnpublishStreams } from '@/app/actions/admin/archive-admin'
import type { Tournament, Event, Stream, ContentStatus, PipelineStatus, Hand } from '@/lib/types/archive'

// ============================================
// Pipeline Types
// ============================================

/**
 * 파이프라인 스트림 (비정규화된 관계 데이터 포함)
 */
export interface PipelineStream {
  id: string
  name: string
  description?: string
  videoUrl?: string
  gcsUri?: string

  // 파이프라인 상태
  pipelineStatus: PipelineStatus
  pipelineProgress: number
  pipelineError?: string
  pipelineUpdatedAt?: Date

  // 분석 관련
  currentJobId?: string
  lastAnalysisAt?: Date
  analysisAttempts: number
  handCount: number

  // 참조 정보 (비정규화)
  eventId?: string
  eventName?: string
  tournamentId?: string
  tournamentName?: string

  createdAt: Date
  updatedAt: Date
}

/**
 * 파이프라인 상태별 카운트
 */
export interface PipelineStatusCounts {
  all: number
  pending: number
  needs_classify: number
  analyzing: number
  completed: number
  needs_review: number
  published: number
  failed: number
}

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

/**
 * Admin Archive Pipeline Query Keys
 */
export const adminArchiveQueryKeys = {
  all: ['admin', 'archive'] as const,
  streams: () => [...adminArchiveQueryKeys.all, 'streams'] as const,
  streamsByStatus: (status: PipelineStatus | 'all') =>
    [...adminArchiveQueryKeys.streams(), 'status', status] as const,
  stream: (id: string) => [...adminArchiveQueryKeys.streams(), id] as const,
  statusCounts: () => [...adminArchiveQueryKeys.all, 'counts'] as const,
  hands: (streamId: string) => [...adminArchiveQueryKeys.all, 'hands', streamId] as const,
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
          name: data.name,
          category: data.category,
          category_id: data.category_id,
          category_logo: data.category_logo,
          category_logo_url: data.category_logo_url,
          location: data.location,
          city: data.city,
          country: data.country,
          game_type: data.game_type,
          total_prize: data.total_prize,
          status: data.status,
          published_by: data.published_by,
          published_at: data.published_at,
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
        })
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
        where('tournamentId', '==', tournamentId),
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
          tournament_id: data.tournamentId,
          name: data.name,
          event_number: data.eventNumber,
          total_prize: data.totalPrize,
          winner: data.winner,
          buy_in: data.buyIn,
          entry_count: data.entryCount,
          blind_structure: data.blindStructure,
          level_duration: data.levelDuration,
          starting_stack: data.startingStack,
          notes: data.notes,
          status: data.status,
          published_by: data.publishedBy,
          published_at: data.publishedAt,
          // Timestamp를 string으로 변환
          date: data.date instanceof Timestamp
            ? data.date.toDate().toISOString()
            : data.date,
          created_at: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        })
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
        where('subEventId', '==', eventId),
        orderBy('publishedAt', 'desc')
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
          event_id: data.subEventId || data.eventId,
          name: data.name,
          description: data.description,
          video_url: data.videoUrl,
          video_file: data.videoFile,
          video_nas_path: data.videoNasPath,
          video_source: data.videoSource,
          is_organized: data.isOrganized,
          organized_at: data.organizedAt,
          player_count: data.playerCount,
          status: data.status,
          published_by: data.publishedBy,
          gcs_path: data.gcsPath,
          gcs_uri: data.gcsUri,
          gcs_file_size: data.gcsFileSize,
          gcs_uploaded_at: data.gcsUploadedAt,
          upload_status: data.uploadStatus,
          video_duration: data.videoDuration,
          // Timestamp를 string으로 변환
          published_at: data.publishedAt instanceof Timestamp
            ? data.publishedAt.toDate().toISOString()
            : data.publishedAt,
          created_at: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
          hand_count: 0, // 초기값
        })
      })

      // Hand count 조회
      if (streamIds.length > 0) {
        const handCounts: Record<string, number> = {}

        // Firestore 'in' 쿼리는 최대 30개까지만 가능하므로 청크로 나눔
        const chunkSize = 30
        for (let i = 0; i < streamIds.length; i += chunkSize) {
          const chunk = streamIds.slice(i, i + chunkSize)
          const handsRef = collection(firestore, 'hands')
          const handsQuery = query(handsRef, where('streamId', 'in', chunk))
          const handsSnapshot = await getDocs(handsQuery)

          handsSnapshot.forEach(doc => {
            const streamId = doc.data().streamId
            handCounts[streamId] = (handCounts[streamId] || 0) + 1
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
    mutationFn: async ({ tournamentId, eventId, streamId }: { tournamentId: string, eventId: string, streamId: string }) => {
      const result = await publishStream(tournamentId, eventId, streamId)
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
    mutationFn: async ({ tournamentId, eventId, streamId }: { tournamentId: string, eventId: string, streamId: string }) => {
      const result = await unpublishStream(tournamentId, eventId, streamId)
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
    mutationFn: async ({ tournamentId, eventId, streamIds }: { tournamentId: string, eventId: string, streamIds: string[] }) => {
      const result = await bulkPublishStreams(tournamentId, eventId, streamIds)
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
    mutationFn: async ({ tournamentId, eventId, streamIds }: { tournamentId: string, eventId: string, streamIds: string[] }) => {
      const result = await bulkUnpublishStreams(tournamentId, eventId, streamIds)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      // 모든 admin archive 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: adminArchiveKeys.all })
    },
  })
}

// ============================================
// Pipeline Query Functions
// ============================================

/**
 * 파이프라인 상태별 스트림 조회
 */
async function getStreamsByPipelineStatus(
  status: PipelineStatus | 'all',
  pageLimit = 50
): Promise<PipelineStream[]> {
  try {
    const streamsRef = collection(firestore, 'streams')

    let q
    if (status === 'all') {
      q = query(
        streamsRef,
        orderBy('pipelineUpdatedAt', 'desc'),
        limit(pageLimit)
      )
    } else {
      q = query(
        streamsRef,
        where('pipelineStatus', '==', status),
        orderBy('pipelineUpdatedAt', 'desc'),
        limit(pageLimit)
      )
    }

    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data()
      return {
        id: docSnapshot.id,
        name: data.name || '',
        description: data.description,
        videoUrl: data.videoUrl,
        gcsUri: data.gcsUri,
        pipelineStatus: data.pipelineStatus || 'pending',
        pipelineProgress: data.pipelineProgress || 0,
        pipelineError: data.pipelineError,
        pipelineUpdatedAt: data.pipelineUpdatedAt?.toDate(),
        currentJobId: data.currentJobId,
        lastAnalysisAt: data.lastAnalysisAt?.toDate(),
        analysisAttempts: data.analysisAttempts || 0,
        handCount: data.handCount || 0,
        eventId: data.subEventId || data.eventId,
        eventName: data.eventName,
        tournamentId: data.tournamentId,
        tournamentName: data.tournamentName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      }
    })
  } catch (error) {
    console.error('[getStreamsByPipelineStatus] Error:', error)
    throw error
  }
}

/**
 * 파이프라인 상태별 카운트 조회
 */
async function getPipelineStatusCounts(): Promise<PipelineStatusCounts> {
  try {
    const streamsRef = collection(firestore, 'streams')

    const statuses: PipelineStatus[] = [
      'pending', 'needs_classify', 'analyzing',
      'completed', 'needs_review', 'published', 'failed'
    ]

    const countPromises = statuses.map(async (status) => {
      const q = query(streamsRef, where('pipelineStatus', '==', status))
      const snapshot = await getCountFromServer(q)
      return { status, count: snapshot.data().count }
    })

    const results = await Promise.all(countPromises)

    const counts: PipelineStatusCounts = {
      all: 0,
      pending: 0,
      needs_classify: 0,
      analyzing: 0,
      completed: 0,
      needs_review: 0,
      published: 0,
      failed: 0,
    }

    results.forEach(({ status, count }) => {
      counts[status] = count
      counts.all += count
    })

    return counts
  } catch (error) {
    console.error('[getPipelineStatusCounts] Error:', error)
    throw error
  }
}

// ============================================
// Pipeline React Query Hooks
// ============================================

/**
 * 파이프라인 상태별 스트림 목록 훅
 */
export function useStreamsByPipelineStatus(
  status: PipelineStatus | 'all',
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: adminArchiveQueryKeys.streamsByStatus(status),
    queryFn: () => getStreamsByPipelineStatus(status),
    enabled: options?.enabled !== false,
    refetchInterval: status === 'analyzing' ? 3000 : false, // 분석 중일 때 3초마다 갱신
  })
}

/**
 * 파이프라인 상태 카운트 훅
 */
export function usePipelineStatusCounts() {
  return useQuery({
    queryKey: adminArchiveQueryKeys.statusCounts(),
    queryFn: getPipelineStatusCounts,
    refetchInterval: 10000, // 10초마다 갱신
  })
}

/**
 * 스트림 파이프라인 상태 업데이트 뮤테이션
 */
export function useUpdatePipelineStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      streamId,
      status,
      error
    }: {
      streamId: string
      status: PipelineStatus
      error?: string
    }) => {
      const streamRef = doc(firestore, 'streams', streamId)

      const updateData: Record<string, unknown> = {
        pipelineStatus: status,
        pipelineUpdatedAt: Timestamp.now(),
      }

      if (error) {
        updateData.pipelineError = error
      }

      if (status === 'analyzing') {
        updateData.pipelineProgress = 0
      }

      await updateDoc(streamRef, updateData)
      return { streamId, status }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminArchiveQueryKeys.all })
      toast.success('상태가 업데이트되었습니다')
    },
    onError: (error) => {
      console.error('[useUpdatePipelineStatus] Error:', error)
      toast.error('상태 업데이트 실패')
    },
  })
}

/**
 * 분석 재시도 뮤테이션
 */
export function useRetryAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (streamId: string) => {
      const streamRef = doc(firestore, 'streams', streamId)
      const streamDoc = await getDoc(streamRef)

      if (!streamDoc.exists()) {
        throw new Error('스트림을 찾을 수 없습니다')
      }

      const currentAttempts = streamDoc.data().analysisAttempts || 0

      await updateDoc(streamRef, {
        pipelineStatus: 'pending',
        pipelineProgress: 0,
        pipelineError: null,
        pipelineUpdatedAt: Timestamp.now(),
        analysisAttempts: currentAttempts + 1,
      })

      return { streamId, attempts: currentAttempts + 1 }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminArchiveQueryKeys.all })
      toast.success(`분석을 재시작합니다 (시도 #${data.attempts})`)
    },
    onError: (error) => {
      console.error('[useRetryAnalysis] Error:', error)
      toast.error('분석 재시도 실패')
    },
  })
}

/**
 * 스트림 분류 뮤테이션
 */
export function useClassifyStream() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      streamId,
      tournamentId,
      eventId,
    }: {
      streamId: string
      tournamentId: string
      eventId: string
    }) => {
      // 토너먼트와 이벤트 정보 조회
      const tournamentRef = doc(firestore, 'tournaments', tournamentId)
      const eventRef = doc(firestore, 'sub_events', eventId)

      const [tournamentDoc, eventDoc] = await Promise.all([
        getDoc(tournamentRef),
        getDoc(eventRef),
      ])

      if (!tournamentDoc.exists()) {
        throw new Error('토너먼트를 찾을 수 없습니다')
      }

      if (!eventDoc.exists()) {
        throw new Error('이벤트를 찾을 수 없습니다')
      }

      const tournamentData = tournamentDoc.data()
      const eventData = eventDoc.data()

      // 스트림 업데이트
      const streamRef = doc(firestore, 'streams', streamId)
      await updateDoc(streamRef, {
        subEventId: eventId,
        tournamentId: tournamentId,
        tournamentName: tournamentData.name,
        eventId: eventId,
        eventName: eventData.name,
        pipelineStatus: 'pending' as PipelineStatus,
        pipelineUpdatedAt: Timestamp.now(),
      })

      return {
        streamId,
        tournamentId,
        tournamentName: tournamentData.name,
        eventId,
        eventName: eventData.name,
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminArchiveQueryKeys.all })
      queryClient.invalidateQueries({ queryKey: adminArchiveKeys.all })
      toast.success(`스트림이 분류되었습니다: ${data.tournamentName} > ${data.eventName}`)
    },
    onError: (error) => {
      console.error('[useClassifyStream] Error:', error)
      toast.error('스트림 분류 실패')
    },
  })
}

// ============================================
// Stream Hands Query
// ============================================

/**
 * 스트림별 핸드 목록 조회
 */
export function useStreamHands(streamId: string) {
  return useQuery({
    queryKey: adminArchiveQueryKeys.hands(streamId),
    queryFn: async () => {
      const handsRef = collection(firestore, 'hands')
      const q = query(
        handsRef,
        where('streamId', '==', streamId),
        orderBy('number', 'asc')
      )
      const snapshot = await getDocs(q)

      const hands: Hand[] = []
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        hands.push({
          id: docSnapshot.id,
          stream_id: data.streamId,
          number: data.number,
          description: data.description,
          ai_summary: data.aiSummary,
          confidence: data.confidence,
          timestamp: data.timestamp,
          board_flop: data.boardFlop,
          board_turn: data.boardTurn,
          board_river: data.boardRiver,
          board_cards: data.boardCards,
          pot_size: data.potSize,
          stakes: data.stakes,
          small_blind: data.smallBlind,
          big_blind: data.bigBlind,
          ante: data.ante,
          pot_preflop: data.potPreflop,
          pot_flop: data.potFlop,
          pot_turn: data.potTurn,
          pot_river: data.potRiver,
          video_timestamp_start: data.videoTimestampStart,
          video_timestamp_end: data.videoTimestampEnd,
          job_id: data.jobId,
          raw_data: data.rawData,
          pokerkit_format: data.pokerkitFormat,
          hand_history_format: data.handHistoryFormat,
          favorite: data.favorite,
          thumbnail_url: data.thumbnailUrl,
          likes_count: data.likesCount,
          dislikes_count: data.dislikesCount,
          bookmarks_count: data.bookmarksCount,
          created_at: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
          hand_players: data.handPlayers || [],
        })
      })

      return hands
    },
    enabled: !!streamId,
    staleTime: 1 * 60 * 1000, // 1분
  })
}
