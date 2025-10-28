/**
 * Frame Extraction API
 *
 * Timecode submission에서 프레임 추출
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractFrames, timeStringToSeconds } from '@/lib/frame-extractor'
import { cropFrames, getTotalFramesSize, getFrameSummary } from '@/lib/frame-cropper'
import { getVideoStreamUrl } from '@/lib/youtube-downloader'
import { isOcrRegions } from '@/lib/types/ocr'

// Supabase 클라이언트 생성
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

export const maxDuration = 60 // Vercel Pro plan: 60초 타임아웃

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await request.json()
    const { submissionId } = body

    if (!submissionId) {
      return NextResponse.json(
        { error: 'submissionId is required' },
        { status: 400 }
      )
    }

    // Supabase에서 submission 조회
    const supabase = createServerSupabaseClient()
    const { data: submission, error: submissionError } = await supabase
      .from('timecode_submissions')
      .select(
        `
        id,
        start_time,
        end_time,
        ocr_regions,
        stream:streams!timecode_submissions_stream_id_fkey (
          id,
          name,
          video_url,
          video_source
        )
      `
      )
      .eq('id', submissionId)
      .single() as any

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // stream은 배열일 수 있으므로 처리
    const stream = Array.isArray(submission.stream) ? submission.stream[0] : submission.stream

    // 검증
    if (!stream?.video_url) {
      return NextResponse.json(
        { error: 'No video URL found' },
        { status: 400 }
      )
    }

    if (stream.video_source !== 'youtube') {
      return NextResponse.json(
        { error: 'Only YouTube videos are supported' },
        { status: 400 }
      )
    }

    if (!submission.ocr_regions) {
      return NextResponse.json(
        { error: 'OCR regions not set. Please set OCR regions first.' },
        { status: 400 }
      )
    }

    if (!isOcrRegions(submission.ocr_regions)) {
      return NextResponse.json(
        { error: 'Invalid OCR regions format' },
        { status: 400 }
      )
    }

    // 시간 변환
    const startTime = timeStringToSeconds(submission.start_time)
    const endTime = submission.end_time ? timeStringToSeconds(submission.end_time) : undefined

    // 비디오 길이 체크 (최대 5분)
    const duration = endTime ? endTime - startTime : 300
    if (duration > 300) {
      return NextResponse.json(
        { error: 'Video duration too long. Maximum 5 minutes supported.' },
        { status: 400 }
      )
    }

    console.log(`[extract-frames] Starting extraction for submission ${submissionId}`)
    console.log(`[extract-frames] Start: ${startTime}s, End: ${endTime}s, Duration: ${duration}s`)

    // YouTube 비디오 스트림 URL 가져오기
    const { streamUrl, videoInfo } = await getVideoStreamUrl(stream.video_url)
    console.log(`[extract-frames] Video: ${videoInfo.title} (${videoInfo.duration}s)`)

    // 프레임 추출 (2초 간격)
    const frames = await extractFrames(streamUrl, {
      startTime,
      endTime,
      interval: 2,
      width: 1280,
      height: 720,
    })

    console.log(`[extract-frames] Extracted ${frames.length} frames`)

    // OCR 영역으로 크롭
    const { playerFrames, boardFrames } = await cropFrames(
      frames,
      submission.ocr_regions
    )

    console.log(`[extract-frames] Cropped ${playerFrames.length} player frames`)
    console.log(`[extract-frames] Cropped ${boardFrames.length} board frames`)

    // 크기 정보
    const playerSize = getTotalFramesSize(playerFrames)
    const boardSize = getTotalFramesSize(boardFrames)
    const totalSize = playerSize + boardSize

    console.log(`[extract-frames] Total size: ${totalSize.toFixed(2)} MB`)

    // 프레임 요약 (디버깅용)
    const frameSummaries = frames.map((frame) => ({
      number: frame.number,
      timestamp: frame.timestamp,
      timestampSeconds: frame.timestampSeconds,
    }))

    // Response
    return NextResponse.json({
      success: true,
      submissionId,
      videoInfo: {
        title: videoInfo.title,
        duration: videoInfo.duration,
        author: videoInfo.author,
      },
      extraction: {
        startTime,
        endTime,
        duration,
        interval: 2,
        frameCount: frames.length,
      },
      frames: frameSummaries,
      playerFrames: playerFrames.map(getFrameSummary),
      boardFrames: boardFrames.map(getFrameSummary),
      size: {
        player: `${playerSize.toFixed(2)} MB`,
        board: `${boardSize.toFixed(2)} MB`,
        total: `${totalSize.toFixed(2)} MB`,
      },
    })
  } catch (error) {
    console.error('[extract-frames] Error:', error)

    return NextResponse.json(
      {
        error: 'Frame extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
