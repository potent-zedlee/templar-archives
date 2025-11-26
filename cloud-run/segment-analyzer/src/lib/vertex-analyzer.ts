/**
 * Vertex AI Gemini 영상 분석기
 *
 * 기존 lib/video/vertex-analyzer.ts 포팅
 * Cloud Run 환경에 최적화
 */

import { GoogleGenAI } from '@google/genai'
import { EPT_PROMPT, TRITON_POKER_PROMPT } from './prompts'

export interface ExtractedHand {
  handNumber: string | number
  stakes?: string
  pot: number
  board: {
    flop: string[] | null
    turn: string | null
    river: string | null
  }
  players: Array<{
    name: string
    position: string
    seat: number
    stackSize: number
    holeCards: string[] | null
  }>
  actions: Array<{
    player: string
    street: string
    action: string
    amount: number
  }>
  winners: Array<{
    name: string
    amount: number
    hand?: string
  }>
  timestamp_start?: string
  timestamp_end?: string
  absolute_timestamp_start?: number
  absolute_timestamp_end?: number
}

export interface AnalysisResult {
  hands: ExtractedHand[]
}

export type Platform = 'ept' | 'triton' | 'wsop'

export class VertexAnalyzer {
  private ai: GoogleGenAI
  private modelName = 'gemini-2.5-flash'

  constructor() {
    const projectId = process.env.GCS_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    const location = process.env.VERTEX_AI_LOCATION || 'global'
    const clientEmail = process.env.GCS_CLIENT_EMAIL
    const privateKey = process.env.GCS_PRIVATE_KEY

    if (!projectId) {
      throw new Error('GCS_PROJECT_ID 또는 GOOGLE_CLOUD_PROJECT 환경 변수가 필요합니다')
    }

    const aiOptions: {
      vertexai: boolean
      project: string
      location: string
      googleAuthOptions?: {
        credentials: {
          client_email: string
          private_key: string
        }
      }
    } = {
      vertexai: true,
      project: projectId,
      location,
    }

    // 서비스 계정 credentials
    if (clientEmail && privateKey) {
      aiOptions.googleAuthOptions = {
        credentials: {
          client_email: clientEmail,
          private_key: privateKey.replace(/\\n/g, '\n'),
        },
      }
      console.log(`[VertexAnalyzer] 서비스 계정 인증 사용: ${clientEmail}`)
    } else {
      console.log('[VertexAnalyzer] ADC(Application Default Credentials) 사용')
    }

    this.ai = new GoogleGenAI(aiOptions)

    console.log(
      `[VertexAnalyzer] 초기화 완료: ${projectId} / ${location} / ${this.modelName}`
    )
  }

  private getPrompt(platform: Platform): string {
    switch (platform) {
      case 'ept':
        return EPT_PROMPT
      case 'triton':
      case 'wsop':
        return TRITON_POKER_PROMPT
      default:
        return EPT_PROMPT
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  async analyzeVideoFromGCS(
    gcsUri: string,
    platform: Platform,
    maxRetries: number = 3
  ): Promise<ExtractedHand[]> {
    if (!gcsUri.startsWith('gs://')) {
      throw new Error(`잘못된 GCS URI 형식: ${gcsUri}`)
    }

    const prompt = this.getPrompt(platform)
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[VertexAnalyzer] 분석 시도 ${attempt}/${maxRetries} - ${gcsUri}`)

        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri: gcsUri,
                    mimeType: 'video/mp4',
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 65535,
            responseMimeType: 'application/json',
          },
        })

        if (!response?.candidates?.[0]?.content?.parts?.[0]) {
          throw new Error('Gemini 응답이 비어있습니다')
        }

        const textPart = response.candidates[0].content.parts.find(
          (part): part is { text: string } => 'text' in part && typeof part.text === 'string'
        )

        if (!textPart) {
          throw new Error('Gemini 응답에 텍스트가 없습니다')
        }

        const hands = this.parseAndValidateResponse(textPart.text)

        console.log(`[VertexAnalyzer] 분석 완료. 추출된 핸드: ${hands.length}개`)

        return hands
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`[VertexAnalyzer] 시도 ${attempt} 실패:`, lastError.message)

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.log(`[VertexAnalyzer] ${delayMs / 1000}초 후 재시도...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    throw new Error(`${maxRetries}회 시도 후 분석 실패: ${lastError?.message}`)
  }

  private parseAndValidateResponse(text: string): ExtractedHand[] {
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }
    cleanText = cleanText.trim()

    let parsed: AnalysisResult
    try {
      parsed = JSON.parse(cleanText)
    } catch (jsonError) {
      console.error('[VertexAnalyzer] JSON 파싱 오류, 복구 시도 중...')

      const firstBrace = cleanText.indexOf('{')
      const lastBrace = cleanText.lastIndexOf('}')

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extractedJson = cleanText.substring(firstBrace, lastBrace + 1)
        try {
          parsed = JSON.parse(extractedJson)
          console.log('[VertexAnalyzer] JSON 복구 성공')
        } catch {
          throw new Error(`잘못된 JSON 응답: ${jsonError}`)
        }
      } else {
        throw new Error(`잘못된 JSON 응답: ${jsonError}`)
      }
    }

    if (!parsed.hands || !Array.isArray(parsed.hands)) {
      console.warn('[VertexAnalyzer] hands 배열 누락, 빈 배열 반환')
      return []
    }

    const validHands = parsed.hands.filter((hand, index) => {
      if (!hand.players || !Array.isArray(hand.players)) {
        console.warn(`[VertexAnalyzer] 핸드 ${index + 1}: players 누락, 스킵`)
        return false
      }
      if (!hand.board) {
        console.warn(`[VertexAnalyzer] 핸드 ${index + 1}: board 누락, 스킵`)
        return false
      }
      return true
    })

    return validHands
  }
}

// 싱글톤
let _vertexAnalyzer: VertexAnalyzer | null = null

export const vertexAnalyzer = {
  get instance(): VertexAnalyzer {
    if (!_vertexAnalyzer) {
      _vertexAnalyzer = new VertexAnalyzer()
    }
    return _vertexAnalyzer
  },

  analyzeVideoFromGCS: (
    ...args: Parameters<VertexAnalyzer['analyzeVideoFromGCS']>
  ) => {
    return vertexAnalyzer.instance.analyzeVideoFromGCS(...args)
  },
}
