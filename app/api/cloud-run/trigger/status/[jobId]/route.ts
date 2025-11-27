import { NextRequest, NextResponse } from 'next/server'

/**
 * Cloud Run 작업 상태 조회 API
 *
 * GET /api/trigger/status/[jobId]
 */

// Cloud Run 서비스 URL
const CLOUD_RUN_URL = process.env.CLOUD_RUN_URL || 'https://video-analyzer-700566907563.asia-northeast3.run.app'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Cloud Run API 호출
    const response = await fetch(`${CLOUD_RUN_URL}/status/${jobId}`)

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }
      throw new Error(`Cloud Run API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Unknown error' },
        { status: 500 }
      )
    }

    const job = data.job
    const metadata = job.metadata

    // 프론트엔드에서 사용하는 형식으로 변환
    return NextResponse.json({
      id: job.id,
      status: job.status, // "PENDING" | "EXECUTING" | "SUCCESS" | "FAILURE"
      progress: metadata?.progress || 0,
      output: job.output,
      error: job.error || null,
      metadata: metadata || null,
      createdAt: job.createdAt,
      startedAt: job.createdAt,
      completedAt: job.status === 'SUCCESS' || job.status === 'FAILURE' ? job.updatedAt : null
    })

  } catch (error) {
    console.error('[Cloud Run Status API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
