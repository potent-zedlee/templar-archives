/**
 * Vision Batch Status API
 *
 * Claude Vision Batch 상태 확인 및 결과 다운로드
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBatchStatus, downloadBatchResults } from '@/lib/vision-batch'
import { buildHandHistory, calculateVisionCost } from '@/lib/hand-history-builder'

// Supabase 클라이언트 생성
function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseKey)
}

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const batchId = searchParams.get('batchId')
    const submissionId = searchParams.get('submissionId')

    if (!batchId && !submissionId) {
      return NextResponse.json(
        { error: 'batchId or submissionId is required' },
        { status: 400 }
      )
    }

    let actualBatchId = batchId

    // submissionId로부터 batchId 가져오기
    if (!actualBatchId && submissionId) {
      const supabase = createServerSupabaseClient()
      const { data: submission } = await supabase
        .from('timecode_submissions')
        .select('ai_extracted_data')
        .eq('id', submissionId)
        .single()

      if (submission?.ai_extracted_data?.vision_batch_id) {
        actualBatchId = submission.ai_extracted_data.vision_batch_id
      } else {
        return NextResponse.json({ error: 'Batch ID not found' }, { status: 404 })
      }
    }

    console.log(`[vision-batch-status] Checking status for batch ${actualBatchId}`)

    // Batch 상태 확인
    const { status, requestCounts } = await getBatchStatus(actualBatchId!)

    console.log(`[vision-batch-status] Status: ${status}`)
    console.log(`[vision-batch-status] Request counts:`, requestCounts)

    // Response
    return NextResponse.json({
      batchId: actualBatchId,
      status,
      requestCounts,
      isComplete: status === 'ended',
      isFailed: status === 'errored' || status === 'canceled',
    })
  } catch (error) {
    console.error('[vision-batch-status] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to get batch status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await request.json()
    const { submissionId, batchId } = body

    if (!submissionId && !batchId) {
      return NextResponse.json(
        { error: 'submissionId or batchId is required' },
        { status: 400 }
      )
    }

    let actualBatchId = batchId
    const supabase = createServerSupabaseClient()

    // submissionId로부터 batchId 가져오기
    if (!actualBatchId && submissionId) {
      const { data: submission } = await supabase
        .from('timecode_submissions')
        .select('ai_extracted_data')
        .eq('id', submissionId)
        .single()

      if (submission?.ai_extracted_data?.vision_batch_id) {
        actualBatchId = submission.ai_extracted_data.vision_batch_id
      } else {
        return NextResponse.json({ error: 'Batch ID not found' }, { status: 404 })
      }
    }

    console.log(`[vision-batch-status] Downloading results for batch ${actualBatchId}`)

    // Batch 상태 확인
    const { status } = await getBatchStatus(actualBatchId!)

    if (status !== 'ended') {
      return NextResponse.json(
        {
          error: 'Batch not completed yet',
          status,
          message: 'Please wait for the batch to complete before downloading results.',
        },
        { status: 400 }
      )
    }

    // 결과 다운로드
    console.log(`[vision-batch-status] Downloading batch results...`)
    const batchResults = await downloadBatchResults(actualBatchId!)
    console.log(`[vision-batch-status] Downloaded ${batchResults.length} batch results`)

    // HandHistory 생성
    console.log(`[vision-batch-status] Building hand history...`)
    const frameCount = batchResults.reduce(
      (sum, batch) => sum + (batch.actions.length || 0),
      0
    )
    const visionBatches = batchResults.length

    const costInfo = calculateVisionCost(frameCount, visionBatches)

    const handHistory = buildHandHistory(batchResults, {
      frameCount,
      ocrAccuracy: 0, // OCR 데이터가 있으면 가져오기
      visionBatches,
      extractionDuration: 0, // 실제 측정 필요
      totalCost: costInfo.totalCost,
    })

    console.log(`[vision-batch-status] Hand history built successfully`)

    // Supabase에 저장
    if (submissionId) {
      const { error: updateError } = await supabase
        .from('timecode_submissions')
        .update({
          status: 'review',
          ai_extracted_data: {
            ...handHistory,
            vision_batch_id: actualBatchId,
            downloaded_at: new Date().toISOString(),
          },
          ai_processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)

      if (updateError) {
        console.error('[vision-batch-status] Failed to update submission:', updateError)
      }
    }

    // Response
    return NextResponse.json({
      success: true,
      batchId: actualBatchId,
      handHistory,
      batchResults: batchResults.length,
      cost: {
        inputTokens: costInfo.inputTokens,
        outputTokens: costInfo.outputTokens,
        totalCost: `$${costInfo.totalCost.toFixed(2)}`,
        costPerFrame: `$${costInfo.costPerFrame.toFixed(4)}`,
      },
    })
  } catch (error) {
    console.error('[vision-batch-status] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to download batch results',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
