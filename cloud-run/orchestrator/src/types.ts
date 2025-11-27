/**
 * Cloud Run 영상 분석 서비스 공통 타입
 */

export interface AnalysisJob {
  jobId: string
  streamId: string
  gcsUri: string
  platform: 'ept' | 'triton' | 'wsop'
  status: 'pending' | 'analyzing' | 'completed' | 'failed'
  totalSegments: number
  completedSegments: number
  failedSegments: number
  handsFound: number
  segments: SegmentInfo[]
  errorMessage?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface SegmentInfo {
  index: number
  start: number  // 초 단위
  end: number    // 초 단위
  status: 'pending' | 'processing' | 'completed' | 'failed'
  handsFound?: number
  errorMessage?: string
  gcsSegmentUri?: string
}

export interface AnalyzeRequest {
  streamId: string
  gcsUri: string
  segments: { start: number; end: number }[]
  platform: 'ept' | 'triton' | 'wsop'
  players?: string[]
}

export interface ProcessSegmentRequest {
  jobId: string
  streamId: string
  segmentIndex: number
  gcsUri: string
  segment: { start: number; end: number }
  platform: 'ept' | 'triton' | 'wsop'
}

export interface FinalizeRequest {
  jobId: string
  streamId: string
}

// API 응답 형식 (기존 Trigger.dev 호환)
export interface JobStatusResponse {
  id: string
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILURE'
  progress: number
  metadata: {
    totalSegments: number
    completedSegments: number
    handsFound: number
  }
  createdAt: string
  completedAt: string | null
  error?: string
}

export function mapJobStatus(job: AnalysisJob): JobStatusResponse {
  const statusMap: Record<AnalysisJob['status'], JobStatusResponse['status']> = {
    pending: 'PENDING',
    analyzing: 'EXECUTING',
    completed: 'SUCCESS',
    failed: 'FAILURE',
  }

  const progress = job.totalSegments > 0
    ? Math.round((job.completedSegments / job.totalSegments) * 100)
    : 0

  return {
    id: job.jobId,
    status: statusMap[job.status],
    progress,
    metadata: {
      totalSegments: job.totalSegments,
      completedSegments: job.completedSegments,
      handsFound: job.handsFound,
    },
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    error: job.errorMessage,
  }
}
