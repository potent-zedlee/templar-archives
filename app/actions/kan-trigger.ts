'use server'

/**
 * KAN Analysis - Trigger.dev Integration
 *
 * Python 백엔드를 대체하는 Trigger.dev 기반 분석 시스템
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'

// Trigger.dev v3에서 작업을 트리거하는 방법
// TODO: @trigger.dev/sdk/v3에서 실제 클라이언트 import 필요
// import { tasks } from "@trigger.dev/sdk/v3";
// import { videoAnalysisTask } from "@/trigger/video-analysis";

export type KanPlatform = 'ept' | 'triton' | 'wsop'

export interface TriggerKanAnalysisInput {
  videoUrl: string
  segments: TimeSegment[]
  platform?: KanPlatform
  streamId?: string
}

export interface TriggerKanAnalysisResult {
  success: boolean
  jobId?: string
  streamId?: string
  error?: string
}

/**
 * Trigger.dev로 KAN 분석 시작
 *
 * @param input 분석 입력 데이터
 * @returns 작업 ID 및 결과
 */
export async function startKanAnalysisWithTrigger(
  input: TriggerKanAnalysisInput
): Promise<TriggerKanAnalysisResult> {
  try {
    const { videoUrl, segments, platform = 'ept', streamId } = input

    console.log('[KAN-Trigger] Starting analysis with Trigger.dev')
    console.log(`[KAN-Trigger] URL: ${videoUrl}`)
    console.log(`[KAN-Trigger] Segments: ${segments.length}`)
    console.log(`[KAN-Trigger] Platform: ${platform}`)

    // Stream ID 검증
    if (!streamId) {
      return {
        success: false,
        error: 'Stream ID is required'
      }
    }

    // Supabase 클라이언트 생성
    const supabase = await createServerSupabaseClient()

    // Stream 존재 확인
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, name, status')
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      return {
        success: false,
        error: `Stream not found: ${streamId}`
      }
    }

    // 세그먼트를 { start, end } 형식으로 변환
    const formattedSegments = segments.map(seg => ({
      start: seg.start,
      end: seg.end
    }))

    // TODO: Trigger.dev v3 작업 트리거
    // 현재는 Trigger.dev SDK의 정확한 사용법을 확인해야 함
    //
    // 예상되는 코드:
    // const handle = await tasks.trigger("kan-video-analysis", {
    //   youtubeUrl: videoUrl,
    //   segments: formattedSegments,
    //   platform,
    //   streamId
    // });
    //
    // const jobId = handle.id;

    // 임시: 작업 ID 생성 (실제로는 Trigger.dev에서 반환)
    const jobId = `trigger_${Date.now()}`

    console.log(`[KAN-Trigger] Job started: ${jobId}`)

    // Stream 상태 업데이트 (분석 중)
    await supabase
      .from('streams')
      .update({
        status: 'analyzing',
        updated_at: new Date().toISOString()
      })
      .eq('id', streamId)

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      jobId,
      streamId
    }

  } catch (error) {
    console.error('[KAN-Trigger] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Trigger.dev 작업 상태 조회
 *
 * @param jobId 작업 ID
 * @returns 작업 상태 및 결과
 */
export async function getTriggerJobStatus(jobId: string) {
  try {
    // TODO: Trigger.dev v3에서 작업 상태 조회
    // const run = await tasks.getRun(jobId);
    //
    // return {
    //   id: run.id,
    //   status: run.status, // "PENDING" | "EXECUTING" | "SUCCESS" | "FAILURE"
    //   output: run.output,
    //   error: run.error
    // };

    // 임시 응답
    return {
      id: jobId,
      status: 'PENDING',
      output: null,
      error: null
    }

  } catch (error) {
    console.error('[KAN-Trigger] Error getting job status:', error)
    throw error
  }
}

/**
 * Trigger.dev 작업 결과를 Supabase에 저장
 *
 * @param jobId 작업 ID
 * @returns 저장 결과
 */
export async function saveTriggerJobResults(jobId: string) {
  try {
    const supabase = await createServerSupabaseClient()

    // 작업 상태 조회
    const jobStatus = await getTriggerJobStatus(jobId)

    if (jobStatus.status !== 'SUCCESS') {
      return {
        success: false,
        error: `Job not completed: ${jobStatus.status}`
      }
    }

    // 결과 파싱
    const { streamId, hands, platform } = jobStatus.output || {}

    if (!streamId || !hands || !Array.isArray(hands)) {
      return {
        success: false,
        error: 'Invalid job output'
      }
    }

    console.log(`[KAN-Trigger] Saving ${hands.length} hands to stream ${streamId}`)

    // TODO: 핸드 데이터를 Supabase에 저장
    // hands.forEach(async (hand) => {
    //   await supabase.from('hands').insert({
    //     stream_id: streamId,
    //     hand_number: hand.handNumber,
    //     ...hand
    //   });
    // });

    // Stream 상태 업데이트 (완료)
    await supabase
      .from('streams')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', streamId)

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      saved: hands.length
    }

  } catch (error) {
    console.error('[KAN-Trigger] Error saving results:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
