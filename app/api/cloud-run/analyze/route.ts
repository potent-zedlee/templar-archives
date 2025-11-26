import { NextRequest, NextResponse } from 'next/server'

/**
 * Cloud Run 분석 시작 API
 *
 * POST /api/cloud-run/analyze
 *
 * Cloud Run Orchestrator 서비스를 호출하여 영상 분석 시작
 */

const ORCHESTRATOR_URL = process.env.CLOUD_RUN_ORCHESTRATOR_URL

export async function POST(request: NextRequest) {
  try {
    if (!ORCHESTRATOR_URL) {
      return NextResponse.json(
        { error: 'Cloud Run Orchestrator URL is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { streamId, gcsUri, segments, platform } = body

    // 요청 검증
    if (!streamId || !gcsUri || !segments || !platform) {
      return NextResponse.json(
        { error: 'Missing required fields: streamId, gcsUri, segments, platform' },
        { status: 400 }
      )
    }

    console.log(`[Cloud Run API] Starting analysis for stream ${streamId}`)
    console.log(`[Cloud Run API] GCS URI: ${gcsUri}`)
    console.log(`[Cloud Run API] Segments: ${segments.length}`)

    // Cloud Run Orchestrator 호출
    const response = await fetch(`${ORCHESTRATOR_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId,
        gcsUri,
        segments,
        platform,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Cloud Run API] Orchestrator error:', error)
      return NextResponse.json(
        { error: error.error || 'Failed to start analysis' },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log(`[Cloud Run API] Analysis started: ${result.jobId}`)

    return NextResponse.json(result)

  } catch (error) {
    console.error('[Cloud Run API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
