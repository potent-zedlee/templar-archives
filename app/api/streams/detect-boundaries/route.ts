/**
 * Automatic Hand Boundary Detection API
 *
 * POST /api/streams/detect-boundaries
 * 영상에서 자동으로 핸드 경계를 감지합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { detectHandBoundaries, boundariesToTimecodes } from '@/lib/scene-change-detector'
import { logError, createErrorResponse } from '@/lib/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/rate-limit'

// Node.js runtime for FFmpeg support
export const runtime = 'nodejs'
export const maxDuration = 300 // 5분 타임아웃

interface DetectBoundariesRequest {
  streamId: string
  method?: 'scene_detection' | 'claude_vision' | 'hybrid'
  config?: {
    sampleInterval?: number
    threshold?: number
    minHandDuration?: number
    maxHandDuration?: number
    maxFrames?: number
    concurrency?: number
  }
  useRealAnalysis?: boolean // true = Claude Vision, false = Placeholder
}

/**
 * 자동 핸드 경계 감지
 * POST /api/streams/detect-boundaries
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Rate Limiting (5회/분)
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.parseApi)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Supabase 클라이언트 생성
    const supabase = await createServerSupabaseClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 유저 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, nickname, role, banned_at')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // Banned 체크
    if (userData.banned_at) {
      return NextResponse.json({ error: '정지된 사용자입니다' }, { status: 403 })
    }

    // 요청 본문 파싱
    const body: DetectBoundariesRequest = await request.json()
    const {
      streamId,
      method = 'claude_vision',
      config = {},
      useRealAnalysis = true,
    } = body

    if (!streamId) {
      return NextResponse.json({ error: 'streamId가 필요합니다' }, { status: 400 })
    }

    // Stream 정보 조회
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, name, source_type, file_url, youtube_url, duration')
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      return NextResponse.json({ error: '스트림을 찾을 수 없습니다' }, { status: 404 })
    }

    // 비디오 URL 결정
    let videoUrl: string | null = null
    if (stream.source_type === 'youtube' && stream.youtube_url) {
      videoUrl = stream.youtube_url
    } else if (stream.source_type === 'upload' && stream.file_url) {
      videoUrl = stream.file_url
    } else if (stream.source_type === 'nas' && stream.file_url) {
      videoUrl = stream.file_url
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: '비디오 URL을 찾을 수 없습니다' },
        { status: 400 }
      )
    }

    // Duration 확인
    if (!stream.duration || stream.duration <= 0) {
      return NextResponse.json(
        { error: '영상 길이 정보가 없습니다' },
        { status: 400 }
      )
    }

    console.log('[Detect Boundaries] Starting detection...', {
      streamId,
      streamName: stream.name,
      duration: stream.duration,
      method,
      useRealAnalysis,
      userId: userData.id,
    })

    // 감지 메서드에 따른 처리
    let detectedTimecodes

    if (method === 'claude_vision' || method === 'scene_detection') {
      // Claude Vision API 기반 실제 분석
      console.log(`[Detect Boundaries] Using ${useRealAnalysis ? 'real' : 'placeholder'} analysis`)

      const boundaries = await detectHandBoundaries(
        videoUrl,
        stream.duration,
        {
          ...config,
          // 실제 분석 시 더 세밀한 간격 사용
          sampleInterval: useRealAnalysis ? (config.sampleInterval || 10) : 120,
        }
      )
      detectedTimecodes = boundariesToTimecodes(boundaries)
    } else if (method === 'hybrid') {
      // Hybrid 방식 (Phase 2에서 구현 예정)
      return NextResponse.json(
        { error: 'Hybrid 방식은 아직 지원되지 않습니다' },
        { status: 501 }
      )
    } else {
      return NextResponse.json(
        { error: '지원되지 않는 감지 방법입니다' },
        { status: 400 }
      )
    }

    const processingTime = (Date.now() - startTime) / 1000

    console.log('[Detect Boundaries] Detection complete', {
      streamId,
      totalDetected: detectedTimecodes.length,
      processingTime: `${processingTime.toFixed(2)}s`,
    })

    return NextResponse.json(
      {
        success: true,
        streamId,
        streamName: stream.name,
        detectedHands: detectedTimecodes,
        totalDetected: detectedTimecodes.length,
        processingTime: processingTime.toFixed(2),
        method,
      },
      { status: 200 }
    )
  } catch (error) {
    logError('Detect Boundaries API', error)
    const response = createErrorResponse(error, '핸드 경계 감지 중 오류가 발생했습니다')
    return NextResponse.json({ error: response.error }, { status: response.status })
  }
}
