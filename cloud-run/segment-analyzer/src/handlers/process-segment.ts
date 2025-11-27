/**
 * Process Segment Handler
 *
 * Cloud Tasks에서 받은 세그먼트 분석 요청 처리
 * 1. GCS에서 세그먼트 추출 (FFmpeg)
 * 2. Vertex AI Gemini로 분석
 * 3. DB에 핸드 저장
 * 4. Firestore 진행 상황 업데이트
 */

import type { Context } from 'hono'
import { Firestore } from '@google-cloud/firestore'
import { vertexAnalyzer } from '../lib/vertex-analyzer'
import { gcsSegmentExtractor } from '../lib/gcs-segment-extractor'
import { saveHandsToDatabase } from '../lib/hand-saver'
import type { ProcessSegmentRequest, AnalysisJob, SegmentInfo } from '../types'

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'

/**
 * MM:SS 또는 HH:MM:SS 형식의 타임스탬프를 초 단위로 변환
 */
function parseTimestampToSeconds(timestamp?: string): number | null {
  if (!timestamp) return null

  const parts = timestamp.split(':').map(Number)

  if (parts.some(isNaN)) return null

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }

  return null
}

export async function processSegmentHandler(c: Context) {
  const startTime = Date.now()

  try {
    const body = await c.req.json<ProcessSegmentRequest>()
    const { jobId, streamId, segmentIndex, gcsUri, segment, platform } = body

    console.log(`[SegmentAnalyzer] Processing segment ${segmentIndex} for job ${jobId}`)
    console.log(`[SegmentAnalyzer] GCS URI: ${gcsUri}, Range: ${segment.start}s-${segment.end}s`)

    // 1. Firestore에서 현재 작업 상태 확인
    const jobRef = firestore.collection(COLLECTION_NAME).doc(jobId)
    const jobDoc = await jobRef.get()

    if (!jobDoc.exists) {
      console.error(`[SegmentAnalyzer] Job ${jobId} not found`)
      return c.json({ error: 'Job not found' }, 404)
    }

    // 세그먼트 상태를 processing으로 업데이트
    await updateSegmentStatus(jobRef, segmentIndex, 'processing')

    // 2. FFmpeg로 세그먼트 추출
    console.log(`[SegmentAnalyzer] Extracting segment with FFmpeg...`)

    const extractionResult = await gcsSegmentExtractor.extractSegments({
      sourceGcsUri: gcsUri,
      segments: [segment],
      streamId: streamId,
      maxSegmentDuration: 1800, // 30분
    })

    const extractedSegments = extractionResult.extractedSegments

    if (extractedSegments.length === 0) {
      throw new Error('Segment extraction failed')
    }

    console.log(`[SegmentAnalyzer] Extracted ${extractedSegments.length} sub-segments`)

    // 3. 각 추출된 세그먼트를 Vertex AI로 분석
    const allHands = []

    for (let i = 0; i < extractedSegments.length; i++) {
      const seg = extractedSegments[i]

      console.log(`[SegmentAnalyzer] Analyzing sub-segment ${i + 1}/${extractedSegments.length}: ${seg.start}s-${seg.end}s`)

      const hands = await vertexAnalyzer.analyzeVideoFromGCS(seg.gcsUri, platform)

      console.log(`[SegmentAnalyzer] Extracted ${hands.length} hands from sub-segment ${i + 1}`)

      // 절대 타임코드 계산
      for (const hand of hands) {
        const startSeconds = parseTimestampToSeconds(hand.timestamp_start)
        const endSeconds = parseTimestampToSeconds(hand.timestamp_end)

        if (startSeconds !== null) {
          hand.absolute_timestamp_start = seg.start + startSeconds
        }
        if (endSeconds !== null) {
          hand.absolute_timestamp_end = seg.start + endSeconds
        }
      }

      allHands.push(...hands)
    }

    console.log(`[SegmentAnalyzer] Total hands extracted: ${allHands.length}`)

    // 4. DB에 핸드 저장
    console.log(`[SegmentAnalyzer] Saving ${allHands.length} hands to database...`)
    const saveResult = await saveHandsToDatabase(streamId, allHands)

    if (!saveResult.success) {
      console.error(`[SegmentAnalyzer] DB save failed: ${saveResult.error}`)
    } else {
      console.log(`[SegmentAnalyzer] Saved ${saveResult.saved} hands, ${saveResult.errors} errors`)
    }

    // 5. 임시 세그먼트 파일 정리
    console.log(`[SegmentAnalyzer] Cleaning up temporary segments...`)
    await gcsSegmentExtractor.cleanupSegments(extractedSegments)

    // 6. Firestore 진행 상황 업데이트
    await updateSegmentCompleted(jobRef, segmentIndex, allHands.length)

    // 7. 모든 세그먼트 완료 확인 및 최종화
    await checkAndFinalizeJob(jobRef, jobId, streamId)

    const duration = Date.now() - startTime

    console.log(`[SegmentAnalyzer] Segment ${segmentIndex} completed in ${(duration / 1000).toFixed(1)}s`)

    return c.json({
      success: true,
      segmentIndex,
      handsFound: allHands.length,
      duration,
    })

  } catch (error) {
    console.error('[SegmentAnalyzer] Error:', error)

    // 세그먼트 실패 상태 업데이트
    try {
      const body = await c.req.json<ProcessSegmentRequest>()
      const { jobId, segmentIndex } = body
      const jobRef = firestore.collection(COLLECTION_NAME).doc(jobId)

      await updateSegmentFailed(
        jobRef,
        segmentIndex,
        error instanceof Error ? error.message : 'Unknown error'
      )
    } catch {
      // 에러 업데이트 실패는 무시
    }

    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
}

/**
 * 세그먼트 상태 업데이트
 */
async function updateSegmentStatus(
  jobRef: FirebaseFirestore.DocumentReference,
  segmentIndex: number,
  status: SegmentInfo['status']
) {
  const jobDoc = await jobRef.get()
  const data = jobDoc.data()

  if (!data || !data.segments) return

  const segments = [...data.segments]
  if (segments[segmentIndex]) {
    segments[segmentIndex] = {
      ...segments[segmentIndex],
      status,
    }
  }

  await jobRef.update({ segments })
}

/**
 * 세그먼트 완료 업데이트
 */
async function updateSegmentCompleted(
  jobRef: FirebaseFirestore.DocumentReference,
  segmentIndex: number,
  handsFound: number
) {
  await firestore.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(jobRef)
    const data = jobDoc.data()

    if (!data) return

    const segments = [...data.segments]
    if (segments[segmentIndex]) {
      segments[segmentIndex] = {
        ...segments[segmentIndex],
        status: 'completed',
        handsFound,
      }
    }

    transaction.update(jobRef, {
      segments,
      completedSegments: (data.completedSegments || 0) + 1,
      handsFound: (data.handsFound || 0) + handsFound,
    })
  })
}

/**
 * 세그먼트 실패 업데이트
 */
async function updateSegmentFailed(
  jobRef: FirebaseFirestore.DocumentReference,
  segmentIndex: number,
  errorMessage: string
) {
  await firestore.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(jobRef)
    const data = jobDoc.data()

    if (!data) return

    const segments = [...data.segments]
    if (segments[segmentIndex]) {
      segments[segmentIndex] = {
        ...segments[segmentIndex],
        status: 'failed',
        errorMessage,
      }
    }

    transaction.update(jobRef, {
      segments,
      failedSegments: (data.failedSegments || 0) + 1,
    })
  })
}

/**
 * 모든 세그먼트 완료 확인 및 작업 최종화
 */
async function checkAndFinalizeJob(
  jobRef: FirebaseFirestore.DocumentReference,
  jobId: string,
  streamId: string
) {
  const jobDoc = await jobRef.get()
  const data = jobDoc.data() as AnalysisJob

  if (!data) return

  const { totalSegments, completedSegments, failedSegments } = data

  // 모든 세그먼트가 처리되었는지 확인
  if (completedSegments + failedSegments >= totalSegments) {
    console.log(`[SegmentAnalyzer] All segments processed for job ${jobId}`)

    // 최종 상태 결정
    const finalStatus = failedSegments > 0 && completedSegments === 0
      ? 'failed'
      : 'completed'

    await jobRef.update({
      status: finalStatus,
      completedAt: new Date(),
    })

    console.log(`[SegmentAnalyzer] Job ${jobId} finalized with status: ${finalStatus}`)

    // 스트림 상태 업데이트 (Supabase)
    const { updateStreamStatus } = await import('../lib/hand-saver')
    await updateStreamStatus(streamId, finalStatus)
  }
}
