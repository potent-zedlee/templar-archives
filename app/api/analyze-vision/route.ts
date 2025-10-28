/**
 * Claude Vision Analysis API
 *
 * 크롭된 프레임을 Claude Vision Batch API로 분석
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractFrames, timeStringToSeconds } from '@/lib/frame-extractor'
import { cropFrames } from '@/lib/frame-cropper'
import { getVideoStreamUrl } from '@/lib/youtube-downloader'
import { createAllBatchRequests, submitBatchRequest, createBatchJsonl } from '@/lib/vision-batch'
import { isOcrRegions } from '@/lib/types/ocr'

// Supabase 클라이언트 생성
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

export const runtime = 'nodejs' // Node.js runtime
export const maxDuration = 60 // Vercel Pro plan: 60초 타임아웃

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await request.json()
    const { submissionId } = body

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // stream 처리
    const stream = Array.isArray(submission.stream) ? submission.stream[0] : submission.stream

    // 검증
    if (!stream?.video_url) {
      return NextResponse.json({ error: 'No video URL found' }, { status: 400 })
    }

    if (stream.video_source !== 'youtube') {
      return NextResponse.json({ error: 'Only YouTube videos are supported' }, { status: 400 })
    }

    if (!submission.ocr_regions) {
      return NextResponse.json(
        { error: 'OCR regions not set. Please set OCR regions first.' },
        { status: 400 }
      )
    }

    if (!isOcrRegions(submission.ocr_regions)) {
      return NextResponse.json({ error: 'Invalid OCR regions format' }, { status: 400 })
    }

    // 시간 변환
    const startTime = timeStringToSeconds(submission.start_time)
    const endTime = submission.end_time ? timeStringToSeconds(submission.end_time) : undefined

    // 비디오 길이 체크 (최대 3분 = 90프레임)
    const duration = endTime ? endTime - startTime : 180
    if (duration > 180) {
      return NextResponse.json(
        { error: 'Video duration too long. Maximum 3 minutes (90 frames) supported.' },
        { status: 400 }
      )
    }

    console.log(`[analyze-vision] Starting vision analysis for submission ${submissionId}`)
    console.log(`[analyze-vision] Start: ${startTime}s, End: ${endTime}s, Duration: ${duration}s`)

    // 1. YouTube 비디오 스트림 URL 가져오기
    const { streamUrl, videoInfo } = await getVideoStreamUrl(stream.video_url)
    console.log(`[analyze-vision] Video: ${videoInfo.title} (${videoInfo.duration}s)`)

    // 2. 프레임 추출 (2초 간격)
    console.log(`[analyze-vision] Extracting frames...`)
    const frames = await extractFrames(streamUrl, {
      startTime,
      endTime,
      interval: 2,
      width: 1280,
      height: 720,
    })
    console.log(`[analyze-vision] Extracted ${frames.length} frames`)

    // 3. OCR 영역으로 크롭 (player 영역만 사용)
    console.log(`[analyze-vision] Cropping frames...`)
    const { playerFrames } = await cropFrames(frames, submission.ocr_regions)
    console.log(`[analyze-vision] Cropped ${playerFrames.length} frames`)

    // 4. Batch 요청 생성
    console.log(`[analyze-vision] Creating batch requests...`)
    const batchRequests = createAllBatchRequests(playerFrames)
    const batchCount = batchRequests.length
    console.log(`[analyze-vision] Created ${batchCount} batch requests`)

    // 5. JSONL 생성
    const jsonlContent = createBatchJsonl(batchRequests)

    // 6. Batch API 제출
    console.log(`[analyze-vision] Submitting batch to Claude API...`)
    const batchId = await submitBatchRequest(jsonlContent)
    console.log(`[analyze-vision] Batch submitted: ${batchId}`)

    // 7. Supabase에 batch ID 저장
    const { error: updateError } = await supabase
      .from('timecode_submissions')
      .update({
        status: 'ai_processing',
        ai_extracted_data: {
          vision_batch_id: batchId,
          vision_batch_count: batchCount,
          frame_count: frames.length,
          submitted_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateError) {
      console.error('[analyze-vision] Failed to update submission:', updateError)
    }

    // Response
    return NextResponse.json({
      success: true,
      submissionId,
      batchId,
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
      vision: {
        batchId,
        batchCount,
        estimatedCompletionTime: '24 hours',
        status: 'processing',
      },
      message: 'Vision analysis batch submitted successfully. Results will be available in ~24 hours.',
    })
  } catch (error) {
    console.error('[analyze-vision] Error:', error)

    return NextResponse.json(
      {
        error: 'Vision analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
