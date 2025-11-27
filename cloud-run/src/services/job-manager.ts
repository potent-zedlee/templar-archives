/**
 * Job Manager Service
 *
 * 분석 작업 상태를 메모리에서 관리 (Cloud Run 인스턴스 내)
 * 프로덕션에서는 Firestore나 Redis로 전환 권장
 */

import { v4 as uuidv4 } from 'uuid'

export type JobStatus = 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILURE'

export interface JobMetadata {
  status: string
  progress: number
  streamId: string
  totalSegments?: number
  processedSegments?: number
  extractedSegments?: number
  handsFound?: number
  currentSegment?: number
  currentSegmentRange?: string
  error?: string
  gcsUri?: string
  savedHands?: number
  saveError?: string
  completedAt?: string
}

export interface Job {
  id: string
  status: JobStatus
  metadata: JobMetadata
  output?: {
    success: boolean
    streamId: string
    handCount: number
    savedToDb: boolean
  }
  error?: string
  createdAt: Date
  updatedAt: Date
}

// 메모리 기반 작업 저장소 (Cloud Run 인스턴스별)
const jobs = new Map<string, Job>()

// 오래된 작업 정리 (1시간)
const JOB_TTL_MS = 60 * 60 * 1000

/**
 * 새 작업 생성
 */
export function createJob(streamId: string, gcsUri: string): Job {
  const jobId = uuidv4()

  const job: Job = {
    id: jobId,
    status: 'PENDING',
    metadata: {
      status: 'pending',
      progress: 0,
      streamId,
      gcsUri,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  jobs.set(jobId, job)

  // 오래된 작업 정리
  cleanupOldJobs()

  return job
}

/**
 * 작업 조회
 */
export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId)
}

/**
 * 작업 상태 업데이트
 */
export function updateJobStatus(
  jobId: string,
  status: JobStatus,
  metadata?: Partial<JobMetadata>
): Job | undefined {
  const job = jobs.get(jobId)
  if (!job) return undefined

  job.status = status
  if (metadata) {
    job.metadata = { ...job.metadata, ...metadata }
  }
  job.updatedAt = new Date()

  jobs.set(jobId, job)
  return job
}

/**
 * 작업 완료 처리
 */
export function completeJob(
  jobId: string,
  success: boolean,
  output?: Job['output'],
  error?: string
): Job | undefined {
  const job = jobs.get(jobId)
  if (!job) return undefined

  job.status = success ? 'SUCCESS' : 'FAILURE'
  job.metadata.status = success ? 'completed' : 'failed'
  job.metadata.progress = success ? 100 : job.metadata.progress
  job.metadata.completedAt = new Date().toISOString()

  if (output) {
    job.output = output
  }
  if (error) {
    job.error = error
    job.metadata.error = error
  }

  job.updatedAt = new Date()
  jobs.set(jobId, job)

  return job
}

/**
 * 작업 메타데이터 업데이트 (진행률 등)
 */
export function updateJobMetadata(
  jobId: string,
  metadata: Partial<JobMetadata>
): Job | undefined {
  const job = jobs.get(jobId)
  if (!job) return undefined

  job.metadata = { ...job.metadata, ...metadata }
  job.updatedAt = new Date()

  jobs.set(jobId, job)
  return job
}

/**
 * 오래된 작업 정리
 */
function cleanupOldJobs(): void {
  const now = Date.now()

  for (const [id, job] of jobs) {
    if (now - job.createdAt.getTime() > JOB_TTL_MS) {
      jobs.delete(id)
      console.log(`[JOB-MANAGER] Cleaned up old job: ${id}`)
    }
  }
}

/**
 * 전체 작업 목록 조회 (디버깅용)
 */
export function getAllJobs(): Job[] {
  return Array.from(jobs.values())
}
