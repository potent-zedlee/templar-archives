'use server'

/**
 * GCS Analysis - Trigger.dev Integration (Firestore)
 *
 * GCS에 업로드된 영상을 Vertex AI Gemini로 직접 분석하는 Server Action
 */

import { adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import type { FirestoreStream, FirestoreHand, HandPlayerEmbedded, HandActionEmbedded } from '@/lib/firestore-types'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'
import type { GCSVideoAnalysisPayload } from '@/trigger/gcs-video-analysis'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'

export type KanPlatform = 'ept' | 'triton' | 'wsop'

export interface GcsAnalysisInput {
  streamId: string
  gcsUri: string
  segments: TimeSegment[]
  platform?: KanPlatform
  players?: string[]
}

export interface GcsAnalysisResult {
  success: boolean
  jobId?: string
  streamId?: string
  error?: string
}

/**
 * GCS 영상 분석 시작
 *
 * @param input 분석 입력 데이터
 * @returns 작업 ID 및 결과
 */
export async function startGcsAnalysis(
  input: GcsAnalysisInput
): Promise<GcsAnalysisResult> {
  try {
    const { streamId, gcsUri, segments, platform = 'ept', players = [] } = input

    console.log('[GCS-Analysis] Starting analysis with Trigger.dev')
    console.log(`[GCS-Analysis] GCS URI: ${gcsUri}`)
    console.log(`[GCS-Analysis] Segments: ${segments.length}`)
    console.log(`[GCS-Analysis] Platform: ${platform}`)
    console.log(`[GCS-Analysis] Players: ${players.length}`)

    // Stream ID 검증
    if (!streamId) {
      return {
        success: false,
        error: 'Stream ID가 필요합니다'
      }
    }

    // GCS URI 검증
    if (!gcsUri.startsWith('gs://')) {
      return {
        success: false,
        error: '올바른 GCS URI가 아닙니다 (gs://로 시작해야 함)'
      }
    }

    // Stream 존재 확인
    // streamId 형식: "tournamentId/eventId/streamId"
    const streamIdParts = streamId.split('/')
    if (streamIdParts.length !== 3) {
      return {
        success: false,
        error: 'Stream ID 형식이 올바르지 않습니다'
      }
    }

    const [tournamentId, eventId, streamDocId] = streamIdParts
    const streamPath = COLLECTION_PATHS.STREAMS(tournamentId, eventId)
    const streamRef = adminFirestore.collection(streamPath).doc(streamDocId)
    const streamDoc = await streamRef.get()

    if (!streamDoc.exists) {
      return {
        success: false,
        error: `Stream을 찾을 수 없습니다: ${streamId}`
      }
    }

    const stream = streamDoc.data() as FirestoreStream

    // 업로드 상태 확인
    if (stream.uploadStatus !== 'uploaded') {
      return {
        success: false,
        error: '영상이 업로드되지 않았습니다. 먼저 영상을 업로드해주세요.'
      }
    }

    if (stream.gcsUri !== gcsUri) {
      return {
        success: false,
        error: 'GCS URI가 일치하지 않습니다'
      }
    }

    // 세그먼트를 { start, end } 형식으로 변환
    const formattedSegments = segments.map(seg => ({
      start: seg.start,
      end: seg.end
    }))

    // Trigger.dev v4 작업 트리거
    const { tasks, configure } = await import("@trigger.dev/sdk")

    const secretKey = process.env.TRIGGER_SECRET_KEY
    console.log(`[GCS-Analysis] TRIGGER_SECRET_KEY exists: ${!!secretKey}`)

    if (!secretKey) {
      console.error('[GCS-Analysis] TRIGGER_SECRET_KEY is not set!')
      return {
        success: false,
        error: 'TRIGGER_SECRET_KEY가 설정되지 않았습니다'
      }
    }

    // Server Action에서 SDK 사용 시 configure 필요
    configure({
      secretKey: secretKey,
    })

    console.log('[GCS-Analysis] Triggering task: gcs-video-analysis')

    const payload: GCSVideoAnalysisPayload = {
      streamId,
      gcsUri,
      segments: formattedSegments,
      platform,
      players: players.length > 0 ? players : undefined,
    }

    console.log('[GCS-Analysis] Payload:', JSON.stringify(payload))

    const handle = await tasks.trigger("gcs-video-analysis", payload)

    console.log('[GCS-Analysis] Handle received:', JSON.stringify(handle))
    const jobId = handle.id

    console.log(`[GCS-Analysis] Job started: ${jobId}`)

    // Stream 상태 업데이트 (분석 중)
    await streamRef.update({
      status: 'analyzing',
      updatedAt: FieldValue.serverTimestamp()
    })

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      jobId,
      streamId
    }

  } catch (error) {
    console.error('[GCS-Analysis] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }
  }
}

/**
 * Trigger.dev 작업 상태 조회
 *
 * @param jobId 작업 ID
 * @returns 작업 상태 및 결과
 */
export async function getGcsAnalysisStatus(jobId: string) {
  try {
    const { runs, configure } = await import("@trigger.dev/sdk")

    configure({
      secretKey: process.env.TRIGGER_SECRET_KEY,
    })

    const run = await runs.retrieve(jobId)

    return {
      id: run.id,
      status: run.status,
      output: run.output,
      error: run.error,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.isCompleted ? new Date() : undefined
    }

  } catch (error) {
    console.error('[GCS-Analysis] Error getting job status:', error)
    throw error
  }
}

/**
 * Trigger.dev 작업 결과를 Firestore에 저장
 *
 * @param jobId 작업 ID
 * @returns 저장 결과
 */
export async function saveGcsAnalysisResults(jobId: string) {
  try {
    // 작업 상태 조회
    const jobStatus = await getGcsAnalysisStatus(jobId)

    if (jobStatus.status !== 'COMPLETED') {
      return {
        success: false,
        error: `작업이 완료되지 않았습니다: ${jobStatus.status}`
      }
    }

    // 결과 파싱
    const { streamId, hands } = jobStatus.output || {}

    if (!streamId || !hands || !Array.isArray(hands)) {
      return {
        success: false,
        error: '잘못된 작업 결과입니다'
      }
    }

    console.log(`[GCS-Analysis] Saving ${hands.length} hands to stream ${streamId}`)

    // Stream 존재 확인
    const streamIdParts = streamId.split('/')
    if (streamIdParts.length !== 3) {
      return {
        success: false,
        error: 'Stream ID 형식이 올바르지 않습니다'
      }
    }

    const [tournamentId, eventId, streamDocId] = streamIdParts
    const streamPath = COLLECTION_PATHS.STREAMS(tournamentId, eventId)
    const streamRef = adminFirestore.collection(streamPath).doc(streamDocId)
    const streamDoc = await streamRef.get()

    if (!streamDoc.exists) {
      return {
        success: false,
        error: `Stream을 찾을 수 없습니다: ${streamId}`
      }
    }

    let savedCount = 0
    let errorCount = 0

    // 각 핸드를 개별적으로 저장
    for (const hand of hands) {
      try {
        await saveHandToDatabase(streamId, tournamentId, eventId, hand)
        savedCount++
        console.log(`[GCS-Analysis] Saved hand ${hand.handNumber} (${savedCount}/${hands.length})`)
      } catch (error) {
        errorCount++
        console.error(`[GCS-Analysis] Error saving hand ${hand.handNumber}:`, error)
      }
    }

    console.log(`[GCS-Analysis] Save complete: ${savedCount} saved, ${errorCount} errors`)

    // Stream 상태 업데이트 (완료)
    await streamRef.update({
      status: 'completed',
      updatedAt: FieldValue.serverTimestamp()
    })

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      saved: savedCount,
      errors: errorCount,
      total: hands.length
    }

  } catch (error) {
    console.error('[GCS-Analysis] Error saving results:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }
  }
}

/**
 * 단일 핸드를 데이터베이스에 저장
 */
async function saveHandToDatabase(
  streamId: string,
  tournamentId: string,
  eventId: string,
  hand: any
) {
  // 1. Players 컬렉션에서 플레이어 확인/생성 및 HandPlayerEmbedded 생성
  const playersData: HandPlayerEmbedded[] = []
  const playerIdMap = new Map<string, string>() // normalizedName -> playerId

  for (const player of hand.players || []) {
    try {
      const normalizedName = player.name.toLowerCase().replace(/[^a-z0-9]/g, '')

      // 플레이어 검색 (normalizedName으로)
      const playersRef = adminFirestore.collection(COLLECTION_PATHS.PLAYERS)
      const playerQuery = await playersRef
        .where('normalizedName', '==', normalizedName)
        .limit(1)
        .get()

      let playerId: string

      if (playerQuery.empty) {
        // 플레이어 생성
        const newPlayerRef = await playersRef.add({
          name: player.name,
          normalizedName,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        })
        playerId = newPlayerRef.id
        console.log(`[GCS-Analysis] Created new player: ${player.name} (${playerId})`)
      } else {
        playerId = playerQuery.docs[0].id
      }

      playerIdMap.set(normalizedName, playerId)

      const isWinner = hand.winners?.some((w: any) =>
        w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
      ) || false

      playersData.push({
        playerId,
        name: player.name,
        position: player.position,
        seat: player.seat,
        cards: player.holeCards,
        startStack: player.stackSize || 0,
        endStack: player.stackSize || 0,
        isWinner
      })

    } catch (error) {
      console.error(`[GCS-Analysis] Error processing player ${player.name}:`, error)
    }
  }

  // 2. Hand Actions 생성
  const actionsData: HandActionEmbedded[] = []
  let sequence = 1

  for (const action of hand.actions || []) {
    try {
      const normalizedName = action.player.toLowerCase().replace(/[^a-z0-9]/g, '')
      const playerId = playerIdMap.get(normalizedName)

      if (!playerId) {
        console.warn(`[GCS-Analysis] Player not found for action: ${action.player}`)
        continue
      }

      actionsData.push({
        playerId,
        playerName: action.player,
        street: action.street,
        sequence: sequence++,
        actionType: action.action,
        amount: action.amount || 0
      })

    } catch (error) {
      console.error(`[GCS-Analysis] Error processing action:`, error)
    }
  }

  // 3. 보드 카드 파싱
  const boardFlop: string[] | undefined = hand.board?.flop || undefined
  const boardTurn: string | undefined = hand.board?.turn || undefined
  const boardRiver: string | undefined = hand.board?.river || undefined

  // 4. Hands 컬렉션에 저장 (플랫 구조)
  const handsRef = adminFirestore.collection(COLLECTION_PATHS.HANDS)

  const handData: Partial<FirestoreHand> = {
    streamId,
    eventId,
    tournamentId,
    number: String(hand.handNumber),
    description: generateHandDescription(hand),
    timestamp: '00:00',
    potSize: hand.pot || 0,
    boardFlop,
    boardTurn,
    boardRiver,
    smallBlind: parseBlindFromStakes(hand.stakes, 'sb'),
    bigBlind: parseBlindFromStakes(hand.stakes, 'bb'),
    ante: parseBlindFromStakes(hand.stakes, 'ante'),
    players: playersData,
    actions: actionsData,
    engagement: {
      likesCount: 0,
      bookmarksCount: 0
    },
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any
  }

  await handsRef.add(handData)
}

/**
 * 핸드 설명 생성
 */
function generateHandDescription(hand: any): string {
  const players = hand.players || []
  if (players.length === 0) return 'Hand'

  const descriptions = players
    .filter((p: any) => p.holeCards && p.holeCards.length > 0)
    .map((p: any) => `${p.name} ${p.holeCards.join('')}`)
    .join(' / ')

  return descriptions || 'Hand'
}

/**
 * Stakes 문자열에서 블라인드 파싱
 */
function parseBlindFromStakes(stakes: string | undefined, type: 'sb' | 'bb' | 'ante'): number {
  if (!stakes) return 0

  const parts = stakes.toLowerCase().split('/')

  if (type === 'sb' && parts[0]) {
    return parseChipAmount(parts[0])
  }

  if (type === 'bb' && parts[1]) {
    return parseChipAmount(parts[1])
  }

  if (type === 'ante' && parts[2]) {
    const anteStr = parts[2].replace('ante', '').trim()
    return parseChipAmount(anteStr)
  }

  return 0
}

/**
 * 칩 금액 파싱
 */
function parseChipAmount(str: string): number {
  const normalized = str.toLowerCase().trim()

  if (normalized.endsWith('k')) {
    return Math.floor(parseFloat(normalized) * 1000)
  }

  if (normalized.endsWith('m')) {
    return Math.floor(parseFloat(normalized) * 1000000)
  }

  return Math.floor(parseFloat(normalized) || 0)
}
