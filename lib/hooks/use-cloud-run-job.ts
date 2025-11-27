import { useQuery } from '@tanstack/react-query'

/**
 * Cloud Run 작업 메타데이터 타입
 */
export interface CloudRunJobMetadata {
  status?: string
  progress?: number
  totalSegments?: number
  processedSegments?: number
  currentSegment?: number
  currentSegmentRange?: string
  handsFound?: number
  streamId?: string
  gcsUri?: string
}

export interface CloudRunJobStatus {
  id: string
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILURE'
  progress?: number
  output?: any
  error?: string | null
  metadata?: CloudRunJobMetadata | null
  createdAt: string
  startedAt?: string | null
  completedAt?: string | null
}

/**
 * Cloud Run 작업 상태를 폴링하는 React Hook
 *
 * @param jobId 작업 ID
 * @param options 옵션
 * @returns 작업 상태 및 쿼리 상태
 */
export function useCloudRunJob(
  jobId: string | null | undefined,
  options?: {
    refetchInterval?: number // 폴링 간격 (ms)
    enabled?: boolean // 쿼리 활성화 여부
  }
) {
  const { refetchInterval = 2000, enabled = true } = options || {}

  return useQuery({
    queryKey: ['cloud-run-job', jobId],
    queryFn: async (): Promise<CloudRunJobStatus> => {
      if (!jobId) {
        throw new Error('Job ID is required')
      }

      const response = await fetch(`/api/cloud-run/status/${jobId}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.statusText}`)
      }

      return response.json()
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      // 작업이 완료되면 폴링 중지
      const data = query.state.data
      if (data?.status === 'SUCCESS' || data?.status === 'FAILURE') {
        return false
      }
      return refetchInterval
    },
    staleTime: 0, // 항상 최신 데이터 조회
  })
}

/**
 * 진행률 계산 헬퍼
 */
export function calculateProgress(status: CloudRunJobStatus): number {
  if (status.progress !== undefined) {
    return status.progress
  }

  // status 기반 기본 진행률
  switch (status.status) {
    case 'PENDING':
      return 0
    case 'EXECUTING':
      return 50
    case 'SUCCESS':
      return 100
    case 'FAILURE':
      return 0
    default:
      return 0
  }
}

/**
 * 상태 표시 텍스트
 */
export function getStatusText(status: CloudRunJobStatus['status']): string {
  switch (status) {
    case 'PENDING':
      return '대기 중...'
    case 'EXECUTING':
      return '분석 중...'
    case 'SUCCESS':
      return '완료'
    case 'FAILURE':
      return '실패'
    default:
      return '알 수 없음'
  }
}

/**
 * 상태별 색상
 */
export function getStatusColor(status: CloudRunJobStatus['status']): string {
  switch (status) {
    case 'PENDING':
      return 'text-gray-500'
    case 'EXECUTING':
      return 'text-blue-500'
    case 'SUCCESS':
      return 'text-green-500'
    case 'FAILURE':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}
