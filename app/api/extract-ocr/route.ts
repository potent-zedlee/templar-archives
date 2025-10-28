/**
 * OCR Extraction API
 *
 * 프레임 추출 + OCR 텍스트 추출 통합 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractFrames, timeStringToSeconds } from '@/lib/frame-extractor'
import { cropFrames } from '@/lib/frame-cropper'
import { getVideoStreamUrl } from '@/lib/youtube-downloader'
import { extractOcrDataFromFrames, calculateOcrAccuracy } from '@/lib/ocr-extractor'
import { isOcrRegions } from '@/lib/types/ocr'

// Supabase 클라이언트 생성
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

export const runtime = 'nodejs' // Node.js runtime (FFmpeg, Tesseract 바이너리 사용)
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

    // 비디오 길이 체크 (최대 5분)
    const duration = endTime ? endTime - startTime : 300
    if (duration > 300) {
      return NextResponse.json(
        { error: 'Video duration too long. Maximum 5 minutes supported.' },
        { status: 400 }
      )
    }

    console.log(`[extract-ocr] Starting OCR extraction for submission ${submissionId}`)
    console.log(`[extract-ocr] Start: ${startTime}s, End: ${endTime}s, Duration: ${duration}s`)

    // 1. YouTube 비디오 스트림 URL 가져오기
    const { streamUrl, videoInfo } = await getVideoStreamUrl(stream.video_url)
    console.log(`[extract-ocr] Video: ${videoInfo.title} (${videoInfo.duration}s)`)

    // 2. 프레임 추출 (2초 간격)
    console.log(`[extract-ocr] Extracting frames...`)
    const frames = await extractFrames(streamUrl, {
      startTime,
      endTime,
      interval: 2,
      width: 1280,
      height: 720,
    })
    console.log(`[extract-ocr] Extracted ${frames.length} frames`)

    // 3. OCR 영역으로 크롭
    console.log(`[extract-ocr] Cropping frames...`)
    const { playerFrames, boardFrames } = await cropFrames(frames, submission.ocr_regions)
    console.log(`[extract-ocr] Cropped ${playerFrames.length} player frames`)
    console.log(`[extract-ocr] Cropped ${boardFrames.length} board frames`)

    // 4. OCR 텍스트 추출 및 파싱
    console.log(`[extract-ocr] Running OCR...`)
    const ocrData = await extractOcrDataFromFrames(playerFrames, boardFrames)
    console.log(`[extract-ocr] OCR completed for ${ocrData.length} frames`)

    // 5. OCR 정확도 계산
    const accuracy = calculateOcrAccuracy(ocrData)
    console.log(`[extract-ocr] OCR Accuracy: ${(accuracy * 100).toFixed(1)}%`)

    // 6. Supabase에 임시 저장 (ai_extracted_data에 OCR 데이터 저장)
    const { error: updateError } = await supabase
      .from('timecode_submissions')
      .update({
        status: 'ai_processing',
        ai_extracted_data: {
          ocr_data: ocrData,
          ocr_accuracy: accuracy,
          extracted_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (updateError) {
      console.error('[extract-ocr] Failed to update submission:', updateError)
    }

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
      ocr: {
        dataCount: ocrData.length,
        accuracy: `${(accuracy * 100).toFixed(1)}%`,
      },
      // OCR 데이터 샘플 (처음 3개만)
      sampleData: ocrData.slice(0, 3),
    })
  } catch (error) {
    console.error('[extract-ocr] Error:', error)

    return NextResponse.json(
      {
        error: 'OCR extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
