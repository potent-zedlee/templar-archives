/**
 * Full Hand Extraction Pipeline API
 *
 * 전체 파이프라인을 하나의 API로 통합
 * 1. 프레임 추출
 * 2. OCR 텍스트 추출
 * 3. Vision Batch 제출
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractFrames, timeStringToSeconds } from '@/lib/frame-extractor'
import { cropFrames, getTotalFramesSize } from '@/lib/frame-cropper'
import { getVideoStreamUrl } from '@/lib/youtube-downloader'
import { extractOcrDataFromFrames, calculateOcrAccuracy } from '@/lib/ocr-extractor'
import { createAllBatchRequests, submitBatchRequest, createBatchJsonl } from '@/lib/vision-batch'
import { calculateVisionCost } from '@/lib/hand-history-builder'
import { isOcrRegions } from '@/lib/types/ocr'
import { withCleanup, cleanupOldTempFiles } from '@/lib/cleanup-utils'

// Supabase 클라이언트 생성
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel Pro: 60초

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  // 오래된 임시 파일 정리 (1시간 이상)
  await cleanupOldTempFiles(3600000)

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

    if (!submission.ocr_regions || !isOcrRegions(submission.ocr_regions)) {
      return NextResponse.json({ error: 'Invalid or missing OCR regions' }, { status: 400 })
    }

    // 시간 변환
    const videoStartTime = timeStringToSeconds(submission.start_time)
    const videoEndTime = submission.end_time ? timeStringToSeconds(submission.end_time) : undefined

    // 비디오 길이 체크 (최대 3분)
    const duration = videoEndTime ? videoEndTime - videoStartTime : 180
    if (duration > 180) {
      return NextResponse.json(
        { error: 'Video duration too long. Maximum 3 minutes supported.' },
        { status: 400 }
      )
    }

    console.log(`[extract-hand-full] Starting full extraction for submission ${submissionId}`)
    console.log(`[extract-hand-full] Duration: ${duration}s`)

    // 상태 업데이트: ai_processing
    await supabase
      .from('timecode_submissions')
      .update({
        status: 'ai_processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    // ========================================
    // Step 1: YouTube 비디오 스트림 URL
    // ========================================
    console.log(`[extract-hand-full] Step 1: Getting video stream URL...`)
    const { streamUrl, videoInfo } = await getVideoStreamUrl(stream.video_url)

    // ========================================
    // withCleanup으로 리소스 정리 보장
    // ========================================
    const result = await withCleanup(async (ctx) => {
      // Step 2: 프레임 추출
      console.log(`[extract-hand-full] Step 2: Extracting frames...`)
      const frames = await extractFrames(streamUrl, {
        startTime: videoStartTime,
        endTime: videoEndTime,
        interval: 2,
        width: 1280,
        height: 720,
        cleanupContext: ctx,
      })
      console.log(`[extract-hand-full] Extracted ${frames.length} frames`)

      // Step 3: OCR 영역 크롭
      console.log(`[extract-hand-full] Step 3: Cropping frames...`)
      const { playerFrames, boardFrames } = await cropFrames(frames, submission.ocr_regions)
      const totalSize = getTotalFramesSize([...playerFrames, ...boardFrames])
      console.log(`[extract-hand-full] Cropped frames size: ${totalSize.toFixed(2)} MB`)

      // Step 4: OCR 텍스트 추출
      console.log(`[extract-hand-full] Step 4: Running OCR...`)
      const ocrData = await extractOcrDataFromFrames(playerFrames, boardFrames, ctx)
      const ocrAccuracy = calculateOcrAccuracy(ocrData)
      console.log(`[extract-hand-full] OCR Accuracy: ${(ocrAccuracy * 100).toFixed(1)}%`)

      return { frames, playerFrames, ocrData, ocrAccuracy }
    })

    const { frames, playerFrames, ocrData, ocrAccuracy } = result

    // ========================================
    // Step 5: Vision Batch 요청 생성
    // ========================================
    console.log(`[extract-hand-full] Step 5: Creating vision batch requests...`)
    const batchRequests = createAllBatchRequests(playerFrames)
    const jsonlContent = createBatchJsonl(batchRequests)

    // ========================================
    // Step 6: Vision Batch 제출
    // ========================================
    console.log(`[extract-hand-full] Step 6: Submitting vision batch...`)
    const batchId = await submitBatchRequest(jsonlContent)
    console.log(`[extract-hand-full] Batch submitted: ${batchId}`)

    // ========================================
    // Step 7: Supabase에 결과 저장
    // ========================================
    const costInfo = calculateVisionCost(frames.length, batchRequests.length)
    const processingTime = Date.now() - startTime

    await supabase
      .from('timecode_submissions')
      .update({
        status: 'ai_processing',
        ai_extracted_data: {
          vision_batch_id: batchId,
          vision_batch_count: batchRequests.length,
          frame_count: frames.length,
          ocr_data: ocrData,
          ocr_accuracy: ocrAccuracy,
          processing_time_ms: processingTime,
          estimated_cost: costInfo.totalCost,
          submitted_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

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
        frameCount: frames.length,
        ocrAccuracy: `${(ocrAccuracy * 100).toFixed(1)}%`,
        processingTime: `${(processingTime / 1000).toFixed(1)}s`,
      },
      vision: {
        batchId,
        batchCount: batchRequests.length,
        estimatedCost: `$${costInfo.totalCost.toFixed(2)}`,
        estimatedCompletionTime: '24 hours',
      },
      message:
        'Hand extraction pipeline completed. Vision batch submitted. Results will be available in ~24 hours.',
    })
  } catch (error) {
    console.error('[extract-hand-full] Error:', error)

    // 에러 발생 시 상태 업데이트
    try {
      const body = await request.json()
      const { submissionId } = body

      if (submissionId) {
        const supabase = createServerSupabaseClient()
        await supabase
          .from('timecode_submissions')
          .update({
            status: 'rejected',
            ai_processing_error: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', submissionId)
      }
    } catch (updateError) {
      console.error('[extract-hand-full] Failed to update error status:', updateError)
    }

    return NextResponse.json(
      {
        error: 'Hand extraction pipeline failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
