import { NextRequest, NextResponse } from 'next/server'
import { testGeminiConnection, testYouTubeAnalysis } from '@/lib/ai/gemini'

/**
 * GET - Test basic Gemini API connection
 */
export async function GET() {
  try {
    const isConnected = await testGeminiConnection()

    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Gemini API 연결 성공! 🎉',
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Gemini API 연결 실패',
          hint: 'API 키를 확인하세요',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Gemini API 테스트 중 에러 발생',
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: '.env.local 파일의 GOOGLE_AI_API_KEY를 확인하세요',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Test YouTube video analysis
 * Body: { youtubeUrl: string, startSeconds?: number, endSeconds?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { youtubeUrl, startSeconds = 0, endSeconds = 30 } = body

    if (!youtubeUrl) {
      return NextResponse.json(
        {
          success: false,
          message: 'YouTube URL이 필요합니다',
        },
        { status: 400 }
      )
    }

    const result = await testYouTubeAnalysis(youtubeUrl, startSeconds, endSeconds)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'YouTube 비디오 분석 테스트 성공! 🎉',
        youtubeUrl,
        segment: `${startSeconds}s - ${endSeconds}s`,
        response: result.response,
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'YouTube 비디오 분석 실패',
          error: result.error,
          hint: '비디오가 공개 상태인지, URL이 올바른지 확인하세요',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'YouTube 분석 테스트 중 에러 발생',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
