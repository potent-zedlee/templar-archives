import { NextRequest, NextResponse } from 'next/server'

/**
 * Cloud Run 작업 상태 조회 API
 *
 * GET /api/cloud-run/status/[jobId]
 *
 * Cloud Run Orchestrator에서 Firestore 작업 상태 조회
 */

const ORCHESTRATOR_URL = process.env.CLOUD_RUN_ORCHESTRATOR_URL

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

    if (!ORCHESTRATOR_URL) {
      return NextResponse.json(
        { error: 'Cloud Run Orchestrator URL is not configured' },
        { status: 500 }
      )
    }

    // Cloud Run Orchestrator에서 상태 조회
    const response = await fetch(`${ORCHESTRATOR_URL}/status/${jobId}`)

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      const error = await response.json()
      console.error('[Cloud Run Status API] Error:', error)
      return NextResponse.json(
        { error: error.error || 'Failed to get status' },
        { status: response.status }
      )
    }

    const status = await response.json()

    // 기존 Trigger.dev 응답 형식과 호환
    // Cloud Run Orchestrator가 이미 호환 형식으로 반환하므로 그대로 전달
    return NextResponse.json({
      id: status.id,
      status: status.status, // 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILURE'
      progress: status.progress,
      metadata: status.metadata,
      createdAt: status.createdAt,
      completedAt: status.completedAt,
      error: status.error,
    })

  } catch (error) {
    console.error('[Cloud Run Status API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
