/**
 * Status Handler - 작업 상태 조회
 *
 * Firestore에서 작업 상태를 조회하여 반환
 * 기존 Trigger.dev 응답 형식과 호환
 */

import type { Context } from 'hono'
import { Firestore } from '@google-cloud/firestore'
import type { AnalysisJob, JobStatusResponse } from '../types'

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'

export async function statusHandler(c: Context) {
  try {
    const jobId = c.req.param('jobId')

    if (!jobId) {
      return c.json({ error: 'Job ID is required' }, 400)
    }

    const doc = await firestore.collection(COLLECTION_NAME).doc(jobId).get()

    if (!doc.exists) {
      return c.json({ error: 'Job not found' }, 404)
    }

    const data = doc.data()!
    const job: AnalysisJob = {
      ...data,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as AnalysisJob

    // 기존 Trigger.dev 응답 형식으로 변환
    const statusMap: Record<AnalysisJob['status'], JobStatusResponse['status']> = {
      pending: 'PENDING',
      analyzing: 'EXECUTING',
      completed: 'SUCCESS',
      failed: 'FAILURE',
    }

    const progress = job.totalSegments > 0
      ? Math.round((job.completedSegments / job.totalSegments) * 100)
      : 0

    const response: JobStatusResponse = {
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

    return c.json(response)

  } catch (error) {
    console.error('[Orchestrator] Status error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
}
