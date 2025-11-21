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

    // TODO: Trigger.dev v3 SDK를 사용하여 실제 작업 상태 조회
    // import { tasks } from "@trigger.dev/sdk/v3";
    // const run = await tasks.getRun(jobId);
    //
    // return NextResponse.json({
    //   id: run.id,
    //   status: run.status,
    //   output: run.output,
    //   createdAt: run.createdAt,
    //   startedAt: run.startedAt,
    //   completedAt: run.completedAt
    // });

    // 임시 응답 (개발용)
    return NextResponse.json({
      id: jobId,
      status: 'PENDING', // PENDING | EXECUTING | SUCCESS | FAILURE
      progress: 0,
      output: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    })

  } catch (error) {
    console.error('[Trigger Status API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
