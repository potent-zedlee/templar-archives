import { NextRequest, NextResponse } from 'next/server'
import { haeAnalyzeSegments, HaeSegment } from '@/lib/ai/gemini'

/**
 * HAE 분석 API 엔드포인트
 *
 * Vercel 배포 시: Python 함수 (/api/hae/analyze.py) 자동 라우팅
 * 로컬 개발 시: TypeScript 구현 사용
 */
export async function POST(req: NextRequest) {
  try {
    // 요청 body 파싱
    const body = await req.json()
    const { youtubeUrl, segments, platform = 'ept' } = body

    // Validation
    if (!youtubeUrl) {
      return NextResponse.json(
        { success: false, error: 'youtubeUrl is required' },
        { status: 400 }
      )
    }

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'segments array is required' },
        { status: 400 }
      )
    }

    // TypeScript 버전 사용 (로컬 개발용)
    console.log(`Analyzing ${segments.length} segments from ${youtubeUrl} (${platform})`)

    const haeSegments: HaeSegment[] = segments.map((s: any) => ({
      start: s.start,
      end: s.end,
      label: s.label || 'Gameplay',
    }))

    const results = await haeAnalyzeSegments(
      youtubeUrl,
      haeSegments,
      platform as 'ept' | 'triton'
    )

    // 응답 형식 변환 (Python API와 동일하게)
    const response = {
      success: true,
      results: results.map((r) => ({
        hands: r.hands,
        rawResponse: r.rawResponse,
        error: r.error,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('HAE analyze error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Health check 엔드포인트
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'HAE Analysis API (TypeScript)',
    version: '1.0.0',
    runtime: process.env.VERCEL ? 'vercel' : 'local',
  })
}
