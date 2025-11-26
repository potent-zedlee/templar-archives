import { NextRequest, NextResponse } from 'next/server'

/**
 * Trigger.dev 작업 상태 조회 API
 *
 * GET /api/trigger/status/[jobId]
 */
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

    // Trigger.dev v3 SDK를 사용하여 실제 작업 상태 조회
    const { runs } = await import("@trigger.dev/sdk/v3");
    const run = await runs.retrieve(jobId);

    // 메타데이터에서 실제 진행률 읽기
    const metadata = run.metadata as Record<string, unknown> | undefined
    const progress = metadata?.progress
      ? Number(metadata.progress)
      : run.status === 'QUEUED' ? 0
      : run.status === 'COMPLETED' ? 100
      : 0;

    // 프론트엔드에서 사용하는 상태 값으로 변환
    const mappedStatus = run.status === 'COMPLETED' ? 'SUCCESS'
      : run.status === 'FAILED' || run.status === 'CRASHED' ? 'FAILURE'
      : run.status === 'QUEUED' ? 'PENDING'
      : run.status;

    const errorMessage =
      typeof run.error === 'string'
        ? run.error
        : run.error && typeof run.error === 'object'
          ? (run.error as { message?: string }).message ?? JSON.stringify(run.error)
          : null

    return NextResponse.json({
      id: run.id,
      status: mappedStatus,
      progress,
      output: run.output,
      error: errorMessage,
      errorDetail: run.error ?? null,
      metadata: metadata ?? null,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.finishedAt
    })

  } catch (error) {
    console.error('[Trigger Status API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
