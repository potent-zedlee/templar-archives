'use server'

/**
 * Cloud Run Analysis - Server Action
 *
 * Trigger.dev를 대체하는 Cloud Run 기반 분석 시스템
 *
 * 환경 변수:
 * - CLOUD_RUN_ORCHESTRATOR_URL: Cloud Run Orchestrator 서비스 URL
 * - USE_CLOUD_RUN: 'true'로 설정하면 Cloud Run 사용, 아니면 Trigger.dev 사용
 */

import { adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'

export type KanPlatform = 'ept' | 'triton' | 'wsop'

export interface CloudRunAnalysisInput {
  gcsUri: string
  segments: TimeSegment[]
  platform?: KanPlatform
  streamId: string
}

export interface CloudRunAnalysisResult {
  success: boolean
  jobId?: string
  streamId?: string
  error?: string
}

const ORCHESTRATOR_URL = process.env.CLOUD_RUN_ORCHESTRATOR_URL

/**
 * Cloud Run으로 분석 시작
 */
export async function startCloudRunAnalysis(
  input: CloudRunAnalysisInput
): Promise<CloudRunAnalysisResult> {
  try {
    const { gcsUri, segments, platform = 'ept', streamId } = input

    console.log('[CloudRun-Trigger] Starting analysis with Cloud Run')
    console.log(`[CloudRun-Trigger] GCS URI: ${gcsUri}`)
    console.log(`[CloudRun-Trigger] Segments: ${segments.length}`)
    console.log(`[CloudRun-Trigger] Platform: ${platform}`)

    if (!ORCHESTRATOR_URL) {
      return {
        success: false,
        error: 'CLOUD_RUN_ORCHESTRATOR_URL is not configured',
      }
    }

    if (!streamId) {
      return {
        success: false,
        error: 'Stream ID is required',
      }
    }

    // Stream 존재 확인
    const streamDoc = await adminFirestore
      .collection(COLLECTION_PATHS.STREAMS)
      .doc(streamId)
      .get()

    if (!streamDoc.exists) {
      return {
        success: false,
        error: `Stream not found: ${streamId}`,
      }
    }

    const stream = streamDoc.data()

    // GCS URI 확인 (파라미터 또는 DB에서)
    const videoGcsUri = gcsUri || stream?.gcsUri
    if (!videoGcsUri) {
      return {
        success: false,
        error: 'GCS URI is required',
      }
    }

    // 세그먼트 포맷팅
    const formattedSegments = segments.map((seg) => ({
      start: seg.start,
      end: seg.end,
    }))

    // Cloud Run Orchestrator 호출
    console.log(`[CloudRun-Trigger] Calling Orchestrator: ${ORCHESTRATOR_URL}/analyze`)

    const response = await fetch(`${ORCHESTRATOR_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId,
        gcsUri: videoGcsUri,
        segments: formattedSegments,
        platform,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[CloudRun-Trigger] Orchestrator error:', error)
      return {
        success: false,
        error: error.error || `Orchestrator returned ${response.status}`,
      }
    }

    const result = await response.json()
    const jobId = result.jobId

    console.log(`[CloudRun-Trigger] Job started: ${jobId}`)

    // Stream 상태 업데이트 (분석 중)
    await adminFirestore
      .collection(COLLECTION_PATHS.STREAMS)
      .doc(streamId)
      .update({
        status: 'analyzing',
        updatedAt: new Date(),
      })

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      jobId,
      streamId,
    }
  } catch (error) {
    console.error('[CloudRun-Trigger] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Cloud Run 작업 상태 조회
 */
export async function getCloudRunJobStatus(jobId: string) {
  try {
    if (!ORCHESTRATOR_URL) {
      throw new Error('CLOUD_RUN_ORCHESTRATOR_URL is not configured')
    }

    const response = await fetch(`${ORCHESTRATOR_URL}/status/${jobId}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Job not found: ${jobId}`)
      }
      const error = await response.json()
      throw new Error(error.error || `Status check failed: ${response.status}`)
    }

    const status = await response.json()

    return {
      id: status.id,
      status: status.status, // 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILURE'
      progress: status.progress,
      metadata: status.metadata,
      createdAt: status.createdAt,
      completedAt: status.completedAt,
      error: status.error,
    }
  } catch (error) {
    console.error('[CloudRun-Trigger] Error getting job status:', error)
    throw error
  }
}

/**
 * 통합 분석 시작 함수
 *
 * USE_CLOUD_RUN 환경 변수에 따라 Cloud Run 또는 Trigger.dev 사용
 */
export async function startAnalysis(input: {
  videoUrl?: string // YouTube URL (Trigger.dev용)
  gcsUri?: string // GCS URI (Cloud Run용)
  segments: TimeSegment[]
  platform?: KanPlatform
  streamId: string
}): Promise<CloudRunAnalysisResult> {
  const useCloudRun = process.env.USE_CLOUD_RUN === 'true'

  if (useCloudRun && input.gcsUri) {
    return startCloudRunAnalysis({
      gcsUri: input.gcsUri,
      segments: input.segments,
      platform: input.platform,
      streamId: input.streamId,
    })
  }

  // Trigger.dev fallback (기존 구현)
  const { startKanAnalysisWithTrigger } = await import('./kan-trigger')
  return startKanAnalysisWithTrigger({
    videoUrl: input.videoUrl || '',
    segments: input.segments,
    platform: input.platform,
    streamId: input.streamId,
  })
}
