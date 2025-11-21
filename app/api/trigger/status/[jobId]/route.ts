import { NextRequest, NextResponse } from 'next/server'

/**
 * Trigger.dev 작업 상태 조회 API
 *
 * GET /api/trigger/status/[jobId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Trigger.dev v3 SDK를 사용하여 실제 작업 상태 조회
    const { runs } = await import("@trigger.dev/sdk/v3");
    const run = await runs.retrieve(jobId);

    return NextResponse.json({
      id: run.id,
      status: run.status,
      progress: run.status === 'PENDING' ? 0 : run.status === 'EXECUTING' ? 50 : run.status === 'SUCCESS' ? 100 : 0,
      output: run.output,
      error: run.error,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.completedAt
    })

  } catch (error) {
    console.error('[Trigger Status API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
