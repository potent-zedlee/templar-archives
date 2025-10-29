/**
 * Claude Vision API for Frame Analysis
 *
 * 포커 영상 프레임을 Claude Vision API로 분석하여 핸드 경계 감지
 */

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface HandBoundaryAnalysis {
  /** 핸드 전환 가능성 (0-1) */
  isHandBoundary: boolean
  /** 신뢰도 (0-1) */
  confidence: number
  /** 핸드 번호 (감지된 경우) */
  handNumber?: string
  /** 분석 이유 */
  reasoning: string
}

/**
 * Claude Vision으로 프레임을 분석하여 핸드 경계 여부 판단
 */
export async function analyzeFrameForHandBoundary(
  base64Image: string,
  previousAnalysis?: HandBoundaryAnalysis
): Promise<HandBoundaryAnalysis> {
  const prompt = `You are analyzing a poker tournament video frame to detect hand boundaries.

Your task:
1. Determine if this frame shows the START of a NEW hand (not mid-hand or end of hand)
2. Look for visual cues:
   - New cards being dealt (hole cards appearing)
   - Hand number displayed (e.g., "Hand #123", "핸드 #45")
   - Significant scene change (transition between hands)
   - Players' stacks reset or updated
   - Board is clear (no community cards yet)

${previousAnalysis ? `Previous frame analysis: ${previousAnalysis.reasoning}` : 'This is the first frame.'}

Respond in JSON format:
{
  "isHandBoundary": boolean,
  "confidence": number (0-1),
  "handNumber": string or null,
  "reasoning": "Brief explanation"
}

IMPORTANT: Only mark isHandBoundary=true if you're confident this is the START of a new hand.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    // Claude 응답 파싱
    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response')
    }

    // JSON 추출 (마크다운 코드 블록 제거)
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response')
    }

    const analysis: HandBoundaryAnalysis = JSON.parse(jsonMatch[0])

    console.log('[Claude Vision] Analysis result:', {
      isHandBoundary: analysis.isHandBoundary,
      confidence: analysis.confidence,
      handNumber: analysis.handNumber,
    })

    return analysis
  } catch (error) {
    console.error('[Claude Vision] Analysis failed:', error)
    throw error
  }
}

/**
 * 배치로 여러 프레임 분석 (병렬 처리)
 */
export async function analyzeBatchFrames(
  base64Images: string[],
  concurrency: number = 3
): Promise<HandBoundaryAnalysis[]> {
  const results: HandBoundaryAnalysis[] = []
  const chunks: string[][] = []

  // Concurrency 단위로 청크 분할
  for (let i = 0; i < base64Images.length; i += concurrency) {
    chunks.push(base64Images.slice(i, i + concurrency))
  }

  console.log(`[Claude Vision] Analyzing ${base64Images.length} frames in ${chunks.length} batches`)

  // 각 청크를 병렬로 처리
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    console.log(`[Claude Vision] Processing batch ${i + 1}/${chunks.length}`)

    const batchResults = await Promise.all(
      chunk.map((base64, idx) =>
        analyzeFrameForHandBoundary(
          base64,
          results.length > 0 ? results[results.length - 1] : undefined
        )
      )
    )

    results.push(...batchResults)
  }

  console.log(`[Claude Vision] Completed analysis of ${results.length} frames`)

  return results
}

/**
 * 핸드 경계 필터링 (신뢰도 임계값 적용)
 */
export function filterHandBoundaries(
  analyses: HandBoundaryAnalysis[],
  timestamps: number[],
  minConfidence: number = 0.7
): Array<{ timestamp: number; handNumber?: string; confidence: number }> {
  const boundaries: Array<{
    timestamp: number
    handNumber?: string
    confidence: number
  }> = []

  for (let i = 0; i < analyses.length; i++) {
    const analysis = analyses[i]
    if (analysis.isHandBoundary && analysis.confidence >= minConfidence) {
      boundaries.push({
        timestamp: timestamps[i],
        handNumber: analysis.handNumber || undefined,
        confidence: analysis.confidence,
      })
    }
  }

  return boundaries
}

/**
 * OCR 영역에서 핸드 번호 추출 (Claude Vision 사용)
 */
export async function extractHandNumber(base64Image: string): Promise<string | null> {
  const prompt = `Extract the hand number from this poker video frame.
Look for text like:
- "Hand #123"
- "핸드 #45"
- "#789"
- Any number that represents the current hand

Respond with ONLY the number, or "null" if no hand number is visible.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return null
    }

    const handNumber = textContent.text.trim()
    return handNumber === 'null' ? null : handNumber
  } catch (error) {
    console.error('[Claude Vision] Hand number extraction failed:', error)
    return null
  }
}
