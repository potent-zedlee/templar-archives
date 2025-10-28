/**
 * Timecode Submission React Query Hooks
 *
 * React Query를 사용한 타임코드 제출 데이터 페칭 및 캐싱
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMySubmissions,
  getAllSubmissions,
  getSubmissionById,
  approveSubmission,
  rejectSubmission,
  deleteSubmission,
  getSubmissionStats,
  type TimecodeSubmission,
  type TimecodeSubmissionFilters,
} from '@/lib/timecode-submissions'
import { toast } from 'sonner'

// Query Keys
export const timecodeKeys = {
  all: ['timecodes'] as const,
  lists: () => [...timecodeKeys.all, 'list'] as const,
  list: (filters: TimecodeSubmissionFilters) => [...timecodeKeys.lists(), filters] as const,
  mySubmissions: (filters: TimecodeSubmissionFilters) =>
    [...timecodeKeys.all, 'my-submissions', filters] as const,
  allSubmissions: (filters: TimecodeSubmissionFilters) =>
    [...timecodeKeys.all, 'all-submissions', filters] as const,
  details: () => [...timecodeKeys.all, 'detail'] as const,
  detail: (id: string) => [...timecodeKeys.details(), id] as const,
  stats: () => [...timecodeKeys.all, 'stats'] as const,
}

/**
 * 내 타임코드 제출 내역 조회
 */
export function useMyTimecodeSubmissionsQuery(filters: TimecodeSubmissionFilters = {}) {
  return useQuery({
    queryKey: timecodeKeys.mySubmissions(filters),
    queryFn: async () => {
      const { data, error } = await getMySubmissions(filters)
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
  })
}

/**
 * 모든 타임코드 제출 내역 조회 (관리자)
 */
export function useAllTimecodeSubmissionsQuery(filters: TimecodeSubmissionFilters = {}) {
  return useQuery({
    queryKey: timecodeKeys.allSubmissions(filters),
    queryFn: async () => {
      const { data, error } = await getAllSubmissions(filters)
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 2, // 2분
    gcTime: 1000 * 60 * 15, // 15분
  })
}

/**
 * 특정 타임코드 제출 내역 조회
 */
export function useTimecodeSubmissionQuery(submissionId: string | null) {
  return useQuery({
    queryKey: timecodeKeys.detail(submissionId || ''),
    queryFn: async () => {
      if (!submissionId) return null
      const { data, error } = await getSubmissionById(submissionId)
      if (error) throw error
      return data
    },
    enabled: !!submissionId,
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 타임코드 제출 통계 조회 (관리자)
 */
export function useSubmissionStatsQuery() {
  return useQuery({
    queryKey: timecodeKeys.stats(),
    queryFn: async () => {
      const { data, error } = await getSubmissionStats()
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 5, // 5분
  })
}

/**
 * 타임코드 제출 승인 (관리자)
 */
export function useApproveTimecodeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { success, error } = await approveSubmission(submissionId)
      if (error) throw error
      return success
    },
    onMutate: async (submissionId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: timecodeKeys.all })

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData(timecodeKeys.detail(submissionId))

      // Optimistic 업데이트
      queryClient.setQueryData(timecodeKeys.detail(submissionId), (old: any) => {
        if (!old) return old
        return {
          ...old,
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        }
      })

      return { previousData }
    },
    onError: (error, submissionId, context) => {
      // 롤백
      if (context?.previousData) {
        queryClient.setQueryData(timecodeKeys.detail(submissionId), context.previousData)
      }
      toast.error('승인에 실패했습니다')
      console.error('Approve timecode error:', error)
    },
    onSuccess: () => {
      toast.success('타임코드가 승인되었습니다')
    },
    onSettled: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: timecodeKeys.all })
      queryClient.invalidateQueries({ queryKey: timecodeKeys.stats() })
    },
  })
}

/**
 * 타임코드 제출 거부 (관리자)
 */
export function useRejectTimecodeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ submissionId, adminComment }: { submissionId: string; adminComment: string }) => {
      const { success, error } = await rejectSubmission(submissionId, adminComment)
      if (error) throw error
      return success
    },
    onMutate: async ({ submissionId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: timecodeKeys.all })

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData(timecodeKeys.detail(submissionId))

      // Optimistic 업데이트
      queryClient.setQueryData(timecodeKeys.detail(submissionId), (old: any) => {
        if (!old) return old
        return {
          ...old,
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        }
      })

      return { previousData }
    },
    onError: (error, { submissionId }, context) => {
      // 롤백
      if (context?.previousData) {
        queryClient.setQueryData(timecodeKeys.detail(submissionId), context.previousData)
      }
      toast.error('거부 처리에 실패했습니다')
      console.error('Reject timecode error:', error)
    },
    onSuccess: () => {
      toast.success('타임코드가 거부되었습니다')
    },
    onSettled: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: timecodeKeys.all })
      queryClient.invalidateQueries({ queryKey: timecodeKeys.stats() })
    },
  })
}

/**
 * 타임코드 제출 삭제 (관리자)
 */
export function useDeleteTimecodeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { success, error } = await deleteSubmission(submissionId)
      if (error) throw error
      return success
    },
    onMutate: async (submissionId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: timecodeKeys.all })

      // 이전 데이터 백업
      const previousData = queryClient.getQueryData(timecodeKeys.detail(submissionId))

      // Optimistic 업데이트: 목록에서 제거
      queryClient.setQueriesData({ queryKey: timecodeKeys.all }, (old: any) => {
        if (!old) return old
        if (Array.isArray(old)) {
          return old.filter((item: TimecodeSubmission) => item.id !== submissionId)
        }
        return old
      })

      return { previousData }
    },
    onError: (error, submissionId, context) => {
      // 롤백
      if (context?.previousData) {
        queryClient.setQueryData(timecodeKeys.detail(submissionId), context.previousData)
      }
      toast.error('삭제에 실패했습니다')
      console.error('Delete timecode error:', error)
    },
    onSuccess: () => {
      toast.success('타임코드가 삭제되었습니다')
    },
    onSettled: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: timecodeKeys.all })
      queryClient.invalidateQueries({ queryKey: timecodeKeys.stats() })
    },
  })
}

/**
 * 타임코드 제출 (VideoPlayerDialog에서 사용)
 * Note: 제출 자체는 fetch API를 직접 호출하므로, 이 훅은 제출 후 캐시 무효화용
 */
export function useInvalidateTimecodeQueries() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: timecodeKeys.all })
    queryClient.invalidateQueries({ queryKey: timecodeKeys.stats() })
  }
}

/**
 * Batch 타임코드 제출 (High Templar 이상)
 */
export function useBatchSubmitTimecodeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      streamId: string
      timecodes: Array<{
        handNumber: string
        startTime: string
        endTime: string
        description?: string | null
      }>
    }) => {
      const response = await fetch('/api/timecodes/batch-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Batch 제출에 실패했습니다')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`${data.submittedCount}개 타임코드가 제출되었습니다`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Batch 제출에 실패했습니다')
      console.error('Batch submit error:', error)
    },
    onSettled: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: timecodeKeys.all })
      queryClient.invalidateQueries({ queryKey: timecodeKeys.stats() })
    },
  })
}
