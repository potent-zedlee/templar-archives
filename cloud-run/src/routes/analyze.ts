/**
 * Analyze Route
 *
 * POST /analyze - 영상 분석 작업 시작
 */

import { Router, Request, Response } from 'express'
import { AnalysisInputSchema, runAnalysis } from '../services/video-analyzer.js'
import { createJob, getJob } from '../services/job-manager.js'

export const analyzeRouter = Router()

/**
 * POST /analyze
 *
 * Request Body:
 * {
 *   streamId: string (UUID),
 *   gcsUri: string (gs://bucket/path),
 *   segments: Array<{ start: number, end: number }>,
 *   platform: 'ept' | 'triton' | 'wsop',
 *   players?: string[]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   jobId: string,
 *   message: string
 * }
 */
analyzeRouter.post('/', async (req: Request, res: Response) => {
  try {
    // 입력 검증
    const parseResult = AnalysisInputSchema.safeParse(req.body)

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: parseResult.error.errors,
      })
      return
    }

    const input = parseResult.data

    // 작업 생성
    const job = createJob(input.streamId, input.gcsUri)

    console.log(`[ANALYZE] Created job ${job.id} for stream ${input.streamId}`)

    // 비동기로 분석 시작 (응답 즉시 반환)
    runAnalysis(job.id, input).catch((error) => {
      console.error(`[ANALYZE] Job ${job.id} failed:`, error)
    })

    res.status(202).json({
      success: true,
      jobId: job.id,
      message: 'Analysis started',
    })
  } catch (error) {
    console.error('[ANALYZE] Error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /analyze/:jobId
 *
 * 작업 상태 조회 (status 라우터와 중복되지만 편의를 위해 제공)
 */
analyzeRouter.get('/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params

  const job = getJob(jobId)

  if (!job) {
    res.status(404).json({
      success: false,
      error: 'Job not found',
    })
    return
  }

  res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      metadata: job.metadata,
      output: job.output,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
  })
})
