/**
 * Status Route
 *
 * GET /status/:jobId - 작업 상태 조회
 * GET /status - 전체 작업 목록 (디버깅용)
 */

import { Router, Request, Response } from 'express'
import { getJob, getAllJobs } from '../services/job-manager.js'

export const statusRouter = Router()

/**
 * GET /status/:jobId
 *
 * 특정 작업의 상태 조회
 *
 * Response:
 * {
 *   success: true,
 *   job: {
 *     id: string,
 *     status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILURE',
 *     metadata: { progress, handsFound, ... },
 *     output?: { ... },
 *     error?: string
 *   }
 * }
 */
statusRouter.get('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params

  const job = getJob(jobId)

  if (!job) {
    res.status(404).json({
      success: false,
      error: 'Job not found',
      message: `No job found with ID: ${jobId}`,
    })
    return
  }

  // Trigger.dev 호환 응답 형식
  res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      metadata: job.metadata,
      output: job.output,
      error: job.error,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    },
  })
})

/**
 * GET /status
 *
 * 전체 작업 목록 조회 (디버깅용)
 */
statusRouter.get('/', (_req: Request, res: Response) => {
  const jobs = getAllJobs()

  res.json({
    success: true,
    count: jobs.length,
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      streamId: job.metadata.streamId,
      progress: job.metadata.progress,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    })),
  })
})
