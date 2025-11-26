/**
 * Firestore 클라이언트 - 분석 작업 상태 관리
 */

import { Firestore } from '@google-cloud/firestore'
import type { AnalysisJob, SegmentInfo } from './types'

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'

let firestoreInstance: Firestore | null = null

function getFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    })
  }
  return firestoreInstance
}

/**
 * 새 분석 작업 생성
 */
export async function createJob(job: Omit<AnalysisJob, 'createdAt'>): Promise<AnalysisJob> {
  const db = getFirestore()
  const now = new Date()

  const jobData: AnalysisJob = {
    ...job,
    createdAt: now,
  }

  await db.collection(COLLECTION_NAME).doc(job.jobId).set({
    ...jobData,
    createdAt: now,
    startedAt: job.startedAt ?? null,
    completedAt: job.completedAt ?? null,
  })

  return jobData
}

/**
 * 작업 조회
 */
export async function getJob(jobId: string): Promise<AnalysisJob | null> {
  const db = getFirestore()
  const doc = await db.collection(COLLECTION_NAME).doc(jobId).get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()!
  return {
    ...data,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    startedAt: data.startedAt?.toDate(),
    completedAt: data.completedAt?.toDate(),
  } as AnalysisJob
}

/**
 * 작업 상태 업데이트
 */
export async function updateJobStatus(
  jobId: string,
  status: AnalysisJob['status'],
  additionalData?: Partial<AnalysisJob>
): Promise<void> {
  const db = getFirestore()

  const updateData: Record<string, unknown> = {
    status,
    ...additionalData,
  }

  if (status === 'analyzing' && !additionalData?.startedAt) {
    updateData.startedAt = new Date()
  }

  if (status === 'completed' || status === 'failed') {
    updateData.completedAt = new Date()
  }

  await db.collection(COLLECTION_NAME).doc(jobId).update(updateData)
}

/**
 * 세그먼트 상태 업데이트
 */
export async function updateSegmentStatus(
  jobId: string,
  segmentIndex: number,
  status: SegmentInfo['status'],
  additionalData?: Partial<SegmentInfo>
): Promise<void> {
  const db = getFirestore()
  const jobRef = db.collection(COLLECTION_NAME).doc(jobId)

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(jobRef)
    if (!doc.exists) {
      throw new Error(`Job not found: ${jobId}`)
    }

    const job = doc.data() as AnalysisJob
    const segments = [...job.segments]

    if (segmentIndex < 0 || segmentIndex >= segments.length) {
      throw new Error(`Invalid segment index: ${segmentIndex}`)
    }

    segments[segmentIndex] = {
      ...segments[segmentIndex],
      status,
      ...additionalData,
    }

    // 진행률 계산
    const completedSegments = segments.filter(s => s.status === 'completed').length
    const failedSegments = segments.filter(s => s.status === 'failed').length
    const handsFound = segments.reduce((sum, s) => sum + (s.handsFound || 0), 0)

    transaction.update(jobRef, {
      segments,
      completedSegments,
      failedSegments,
      handsFound,
    })
  })
}

/**
 * 세그먼트 처리 시작 표시
 */
export async function markSegmentProcessing(
  jobId: string,
  segmentIndex: number
): Promise<void> {
  await updateSegmentStatus(jobId, segmentIndex, 'processing')
}

/**
 * 세그먼트 완료 표시
 */
export async function markSegmentCompleted(
  jobId: string,
  segmentIndex: number,
  handsFound: number,
  gcsSegmentUri?: string
): Promise<void> {
  await updateSegmentStatus(jobId, segmentIndex, 'completed', {
    handsFound,
    gcsSegmentUri,
  })
}

/**
 * 세그먼트 실패 표시
 */
export async function markSegmentFailed(
  jobId: string,
  segmentIndex: number,
  errorMessage: string
): Promise<void> {
  await updateSegmentStatus(jobId, segmentIndex, 'failed', {
    errorMessage,
  })
}

/**
 * 모든 세그먼트 완료 여부 확인
 */
export async function checkAllSegmentsCompleted(jobId: string): Promise<boolean> {
  const job = await getJob(jobId)
  if (!job) return false

  return job.segments.every(s => s.status === 'completed' || s.status === 'failed')
}

/**
 * 작업 완료 처리
 */
export async function finalizeJob(jobId: string): Promise<void> {
  const job = await getJob(jobId)
  if (!job) {
    throw new Error(`Job not found: ${jobId}`)
  }

  const allCompleted = job.segments.every(s => s.status === 'completed')
  const anyFailed = job.segments.some(s => s.status === 'failed')

  if (anyFailed) {
    await updateJobStatus(jobId, 'failed', {
      errorMessage: `${job.failedSegments} segments failed`,
    })
  } else if (allCompleted) {
    await updateJobStatus(jobId, 'completed')
  }
}
