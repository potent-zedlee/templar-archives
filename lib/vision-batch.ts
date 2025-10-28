/**
 * Claude Vision Batch API Utility
 *
 * Claude Batch API를 사용하여 프레임 분석 (50% 할인)
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  BatchRequest,
  VisionBatchResult,
} from '@/lib/types/ocr'
import type { CroppedFrame } from '@/lib/frame-cropper'
import { encodeFrameToBase64 } from '@/lib/frame-cropper'

// Anthropic 클라이언트 초기화
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Vision 분석 프롬프트 생성
 */
export function createVisionPrompt(): string {
  return `You are a professional poker hand analyzer. Analyze the poker game frames and extract the following information:

1. **Actions**: All player actions (fold, check, call, bet, raise, all-in) with amounts
2. **Board Cards**: Community cards on flop, turn, and river
3. **Hole Cards**: Player hole cards when revealed
4. **Winner**: Final pot winner and amount

For each action, provide:
- frameNumber: Frame number where action occurred
- playerName: Player name
- street: "preflop", "flop", "turn", or "river"
- actionType: "fold", "check", "call", "bet", "raise", or "all-in"
- amount: Bet/raise amount (if applicable)
- timestamp: Timestamp of the frame
- confidence: Confidence score (0-1)

For board cards, provide:
- flop: { cards: ["Ah", "Kh", "Qh"], frameNumber, timestamp }
- turn: { cards: ["Ah", "Kh", "Qh", "Jh"], frameNumber, timestamp }
- river: { cards: ["Ah", "Kh", "Qh", "Jh", "Th"], frameNumber, timestamp }

For hole cards, provide:
- playerName: Player name
- cards: ["As", "Ad"]
- frameNumber: Frame number
- showdownFrame: true if shown at showdown

For winner, provide:
- playerName: Winner name
- winAmount: Amount won
- frameNumber: Frame number

Return your analysis in the following JSON format:
{
  "actions": [...],
  "boardCards": { "flop": ..., "turn": ..., "river": ... },
  "holeCards": [...],
  "winner": { ... },
  "observations": "Any additional observations"
}`
}

/**
 * 프레임을 배치로 분할 (18프레임/배치)
 */
export function splitFramesIntoBatches(
  frames: CroppedFrame[],
  batchSize: number = 18
): CroppedFrame[][] {
  const batches: CroppedFrame[][] = []

  for (let i = 0; i < frames.length; i += batchSize) {
    batches.push(frames.slice(i, i + batchSize))
  }

  return batches
}

/**
 * 단일 배치 요청 생성
 */
export function createBatchRequest(
  batchNumber: number,
  frames: CroppedFrame[]
): BatchRequest {
  const prompt = createVisionPrompt()

  // 프레임을 Base64로 인코딩
  const imageBlocks = frames.map((frame) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: encodeFrameToBase64(frame),
    },
  }))

  // 메타데이터 텍스트
  const metadataText = `Batch ${batchNumber + 1}
Total frames: ${frames.length}
Frame range: ${frames[0].frameNumber} - ${frames[frames.length - 1].frameNumber}
Timestamp range: ${frames[0].timestamp} - ${frames[frames.length - 1].timestamp}

Analyze these ${frames.length} frames and extract poker hand information.`

  return {
    custom_id: `batch_${batchNumber}`,
    params: {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: metadataText,
            },
            ...imageBlocks,
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    },
  }
}

/**
 * 모든 배치 요청 생성
 */
export function createAllBatchRequests(frames: CroppedFrame[]): BatchRequest[] {
  const batches = splitFramesIntoBatches(frames, 18)
  return batches.map((batch, index) => createBatchRequest(index, batch))
}

/**
 * JSONL 파일 생성 (Batch API 형식)
 */
export function createBatchJsonl(requests: BatchRequest[]): string {
  return requests.map((req) => JSON.stringify(req)).join('\n')
}

/**
 * Batch API에 요청 제출
 */
export async function submitBatchRequest(jsonlContent: string): Promise<string> {
  try {
    // Message Batch 생성 (beta API 사용)
    const messageBatch = await (anthropic as any).beta.messages.batches.create({
      requests: jsonlContent.split('\n').map((line) => JSON.parse(line)),
    })

    console.log(`[vision-batch] Batch created: ${messageBatch.id}`)
    console.log(`[vision-batch] Status: ${messageBatch.processing_status}`)

    return messageBatch.id
  } catch (error) {
    console.error('[vision-batch] Failed to submit batch:', error)
    throw new Error('Failed to submit batch: ' + (error as Error).message)
  }
}

/**
 * Batch 상태 확인
 */
export async function getBatchStatus(batchId: string): Promise<{
  status: string
  requestCounts: {
    processing: number
    succeeded: number
    errored: number
    canceled: number
    expired: number
  }
}> {
  try {
    const batch = await (anthropic as any).beta.messages.batches.retrieve(batchId)

    return {
      status: batch.processing_status,
      requestCounts: {
        processing: batch.request_counts.processing,
        succeeded: batch.request_counts.succeeded,
        errored: batch.request_counts.errored,
        canceled: batch.request_counts.canceled,
        expired: batch.request_counts.expired,
      },
    }
  } catch (error) {
    console.error('[vision-batch] Failed to get batch status:', error)
    throw new Error('Failed to get batch status: ' + (error as Error).message)
  }
}

/**
 * Batch 결과 다운로드
 */
export async function downloadBatchResults(batchId: string): Promise<VisionBatchResult[]> {
  try {
    // Batch 결과 가져오기
    const results = await (anthropic as any).beta.messages.batches.results(batchId)

    const batchResults: VisionBatchResult[] = []

    // 각 결과 파싱
    for await (const result of results) {
      if (result.result.type === 'succeeded') {
        const message = result.result.message
        const content = message.content[0]

        if (content.type === 'text') {
          try {
            // JSON 파싱
            const parsed = JSON.parse(content.text)

            // Batch 번호 추출 (custom_id에서)
            const batchNumber = parseInt(result.custom_id.split('_')[1])

            batchResults.push({
              batchNumber,
              actions: parsed.actions || [],
              boardCards: parsed.boardCards || { flop: null, turn: null, river: null },
              holeCards: parsed.holeCards || [],
              winner: parsed.winner || null,
              observations: parsed.observations || '',
            })
          } catch (parseError) {
            console.error(`[vision-batch] Failed to parse result for ${result.custom_id}:`, parseError)
          }
        }
      } else if (result.result.type === 'errored') {
        console.error(`[vision-batch] Error in ${result.custom_id}:`, result.result.error)
      }
    }

    return batchResults.sort((a, b) => a.batchNumber - b.batchNumber)
  } catch (error) {
    console.error('[vision-batch] Failed to download batch results:', error)
    throw new Error('Failed to download batch results: ' + (error as Error).message)
  }
}

/**
 * Batch 취소
 */
export async function cancelBatch(batchId: string): Promise<void> {
  try {
    await (anthropic as any).beta.messages.batches.cancel(batchId)
    console.log(`[vision-batch] Batch ${batchId} cancelled`)
  } catch (error) {
    console.error('[vision-batch] Failed to cancel batch:', error)
    throw new Error('Failed to cancel batch: ' + (error as Error).message)
  }
}

/**
 * Batch 처리 대기 (폴링)
 */
export async function waitForBatchCompletion(
  batchId: string,
  pollInterval: number = 30000 // 30초
): Promise<void> {
  console.log(`[vision-batch] Waiting for batch ${batchId} to complete...`)

  while (true) {
    const { status, requestCounts } = await getBatchStatus(batchId)

    console.log(`[vision-batch] Status: ${status}`)
    console.log(`[vision-batch] Counts:`, requestCounts)

    if (status === 'ended') {
      console.log(`[vision-batch] Batch completed!`)
      break
    } else if (status === 'canceled' || status === 'errored') {
      throw new Error(`Batch ${status}`)
    }

    // 대기
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }
}
