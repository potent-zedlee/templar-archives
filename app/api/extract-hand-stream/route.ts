/**
 * Hand Extraction with SSE Progress Streaming
 *
 * Server-Sent Events로 실시간 진행 상황 전송
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractFrames, timeStringToSeconds } from '@/lib/frame-extractor'
import { cropFrames, getTotalFramesSize } from '@/lib/frame-cropper'
import { getVideoStreamUrl } from '@/lib/youtube-downloader'
import { extractOcrDataFromFrames, calculateOcrAccuracy } from '@/lib/ocr-extractor'
import { createAllBatchRequests, submitBatchRequest, createBatchJsonl } from '@/lib/vision-batch'
import { calculateVisionCost } from '@/lib/hand-history-builder'
import { isOcrRegions } from '@/lib/types/ocr'
import { CleanupContext, cleanupOldTempFiles } from '@/lib/cleanup-utils'
import { withFfmpegRetry, withOcrRetry, withClaudeRetry, withPipelineRollback } from '@/lib/retry-utils'
import {
  logError,
  logPipelineStep,
  logPipelineComplete,
  logPipelineFailure,
} from '@/lib/error-logger'

// Supabase 클라이언트 생성
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

export const runtime = 'nodejs'
export const maxDuration = 60

// SSE 이벤트 전송 헬퍼
function sendSSE(
  controller: ReadableStreamDefaultController,
  event: string,
  data: any
) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  controller.enqueue(new TextEncoder().encode(message))
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { submissionId } = body

  if (!submissionId) {
    return new Response('submissionId is required', { status: 400 })
  }

  // 오래된 임시 파일 정리 (1시간 이상)
  await cleanupOldTempFiles(3600000)

  // SSE 스트림 생성
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now()
      const ctx = new CleanupContext()

      try {
        logPipelineStep('start', submissionId)

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
          logError(submissionError || new Error('Submission not found'), {
            requestId: submissionId,
          })
          sendSSE(controller, 'error', { message: 'Submission not found' })
          controller.close()
          return
        }

        const stream = Array.isArray(submission.stream) ? submission.stream[0] : submission.stream

        // 검증
        if (!stream?.video_url) {
          sendSSE(controller, 'error', { message: 'No video URL found' })
          controller.close()
          return
        }

        if (!submission.ocr_regions || !isOcrRegions(submission.ocr_regions)) {
          sendSSE(controller, 'error', { message: 'Invalid or missing OCR regions' })
          controller.close()
          return
        }

        // 시간 변환
        const videoStartTime = timeStringToSeconds(submission.start_time)
        const videoEndTime = submission.end_time
          ? timeStringToSeconds(submission.end_time)
          : undefined
        const duration = videoEndTime ? videoEndTime - videoStartTime : 180

        if (duration > 180) {
          sendSSE(controller, 'error', { message: 'Video too long (max 3 minutes)' })
          controller.close()
          return
        }

        // 시작 이벤트
        sendSSE(controller, 'start', {
          submissionId,
          duration,
          estimatedTime: '60 seconds',
        })

        // 상태 업데이트
        await supabase
          .from('timecode_submissions')
          .update({ status: 'ai_processing', updated_at: new Date().toISOString() })
          .eq('id', submissionId)

        // Step 1: Video Stream URL
        sendSSE(controller, 'progress', {
          step: 1,
          total: 6,
          message: 'Getting video stream URL...',
        })
        const { streamUrl, videoInfo } = await getVideoStreamUrl(stream.video_url)
        sendSSE(controller, 'step_complete', {
          step: 1,
          message: `Video: ${videoInfo.title}`,
        })

        // Step 2: Frame Extraction (with retry)
        sendSSE(controller, 'progress', {
          step: 2,
          total: 6,
          message: 'Extracting frames (2s interval)...',
        })
        logPipelineStep('frame_extraction', submissionId, { videoStartTime, videoEndTime })

        const frames = await withFfmpegRetry(
          () =>
            extractFrames(streamUrl, {
              startTime: videoStartTime,
              endTime: videoEndTime,
              interval: 2,
              width: 1280,
              height: 720,
              cleanupContext: ctx,
            }),
          {
            onRetry: (error, attempt) => {
              sendSSE(controller, 'progress', {
                step: 2,
                total: 6,
                message: `Retrying frame extraction (attempt ${attempt})...`,
              })
            },
          }
        )
        sendSSE(controller, 'step_complete', {
          step: 2,
          message: `Extracted ${frames.length} frames`,
        })

        // Step 3: Frame Cropping
        sendSSE(controller, 'progress', {
          step: 3,
          total: 6,
          message: 'Cropping OCR regions...',
        })
        const { playerFrames, boardFrames } = await cropFrames(frames, submission.ocr_regions)
        const totalSize = getTotalFramesSize([...playerFrames, ...boardFrames])
        sendSSE(controller, 'step_complete', {
          step: 3,
          message: `Cropped ${playerFrames.length} frames (${totalSize.toFixed(2)} MB)`,
        })

        // Step 4: OCR (with retry)
        sendSSE(controller, 'progress', {
          step: 4,
          total: 6,
          message: 'Running OCR on frames...',
        })
        logPipelineStep('ocr_extraction', submissionId, { frameCount: playerFrames.length })

        const ocrData = await withOcrRetry(
          () => extractOcrDataFromFrames(playerFrames, boardFrames, ctx),
          {
            onRetry: (error, attempt) => {
              sendSSE(controller, 'progress', {
                step: 4,
                total: 6,
                message: `Retrying OCR extraction (attempt ${attempt})...`,
              })
            },
          }
        )
        const ocrAccuracy = calculateOcrAccuracy(ocrData)
        sendSSE(controller, 'step_complete', {
          step: 4,
          message: `OCR completed (${(ocrAccuracy * 100).toFixed(1)}% accuracy)`,
        })

        // Step 5: Create Batch Requests
        sendSSE(controller, 'progress', {
          step: 5,
          total: 6,
          message: 'Creating vision batch requests...',
        })
        const batchRequests = createAllBatchRequests(playerFrames)
        const jsonlContent = createBatchJsonl(batchRequests)
        sendSSE(controller, 'step_complete', {
          step: 5,
          message: `Created ${batchRequests.length} batch requests`,
        })

        // Step 6: Submit Batch (with retry)
        sendSSE(controller, 'progress', {
          step: 6,
          total: 6,
          message: 'Submitting to Claude Vision API...',
        })
        logPipelineStep('vision_batch_submit', submissionId, {
          batchCount: batchRequests.length,
        })

        const batchId = await withClaudeRetry(
          () => submitBatchRequest(jsonlContent),
          {
            onRetry: (error, attempt) => {
              sendSSE(controller, 'progress', {
                step: 6,
                total: 6,
                message: `Retrying batch submission (attempt ${attempt})...`,
              })
            },
          }
        )
        const costInfo = calculateVisionCost(frames.length, batchRequests.length)
        sendSSE(controller, 'step_complete', {
          step: 6,
          message: `Batch submitted: ${batchId}`,
        })

        // 최종 저장
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

        // 완료 이벤트
        logPipelineComplete(submissionId, processingTime, {
          batchId,
          frameCount: frames.length,
          ocrAccuracy,
          estimatedCost: costInfo.totalCost,
        })

        sendSSE(controller, 'complete', {
          submissionId,
          batchId,
          frameCount: frames.length,
          ocrAccuracy: `${(ocrAccuracy * 100).toFixed(1)}%`,
          estimatedCost: `$${costInfo.totalCost.toFixed(2)}`,
          processingTime: `${(processingTime / 1000).toFixed(1)}s`,
          message: 'Pipeline completed. Vision batch processing will take ~24 hours.',
        })

        controller.close()
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        const processingTime = Date.now() - startTime

        // 에러 로깅
        logPipelineFailure(submissionId, err, processingTime)

        sendSSE(controller, 'error', {
          message: err.message,
        })
        controller.close()

        // 에러 상태 업데이트 (롤백)
        try {
          const supabase = createServerSupabaseClient()
          await supabase
            .from('timecode_submissions')
            .update({
              status: 'rejected',
              ai_processing_error: err.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', submissionId)
        } catch (updateError) {
          logError(
            updateError instanceof Error ? updateError : new Error('Failed to update error status'),
            { requestId: submissionId }
          )
        }
      } finally {
        // 항상 리소스 정리
        await ctx.cleanup()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
