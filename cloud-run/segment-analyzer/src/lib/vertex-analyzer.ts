/**
 * Vertex AI Gemini 영상 분석기
 *
 * 기존 lib/video/vertex-analyzer.ts 포팅
 * Cloud Run 환경에 최적화
 */

import { GoogleGenAI } from '@google/genai'
import { EPT_PROMPT, TRITON_POKER_PROMPT, PHASE1_PROMPT, getPhase2PromptForPlatform } from './prompts'
import type { Phase1Result, Phase2Result, AIAnalysis, SemanticTag } from '@shared/types'

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
  private readonly PHASE1_MODEL = 'gemini-2.5-flash'
  private readonly PHASE2_MODEL = 'gemini-3.0-pro-preview'

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

  /**
   * Phase 1: 타임스탬프만 빠르게 추출
   * 모델: Gemini 2.5 Flash
   */
  async analyzePhase1(
    gcsUri: string,
    maxRetries: number = 3
  ): Promise<Phase1Result> {
    if (!gcsUri.startsWith('gs://')) {
      throw new Error(`잘못된 GCS URI 형식: ${gcsUri}`)
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[VertexAnalyzer] Phase 1 시도 ${attempt}/${maxRetries} - ${gcsUri}`)

        const response = await this.ai.models.generateContent({
          model: this.PHASE1_MODEL,
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
                  text: PHASE1_PROMPT,
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
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

        const result = this.parsePhase1Response(textPart.text)

        console.log(`[VertexAnalyzer] Phase 1 완료. 발견된 핸드: ${result.hands.length}개`)

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`[VertexAnalyzer] Phase 1 시도 ${attempt} 실패:`, lastError.message)

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.log(`[VertexAnalyzer] ${delayMs / 1000}초 후 재시도...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    throw new Error(`Phase 1: ${maxRetries}회 시도 후 분석 실패: ${lastError?.message}`)
  }

  /**
   * Phase 2: 상세 분석 + 시맨틱 태깅
   * 모델: Gemini 3.0 Pro Preview
   */
  async analyzePhase2(
    gcsUri: string,
    handTimestamp: { hand_number: number; start: string; end: string },
    platform: Platform,
    maxRetries: number = 3
  ): Promise<Phase2Result> {
    if (!gcsUri.startsWith('gs://')) {
      throw new Error(`잘못된 GCS URI 형식: ${gcsUri}`)
    }

    const prompt = getPhase2PromptForPlatform(platform)
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[VertexAnalyzer] Phase 2 시도 ${attempt}/${maxRetries} - Hand #${handTimestamp.hand_number}`
        )

        const response = await this.ai.models.generateContent({
          model: this.PHASE2_MODEL,
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
                  text: `${prompt}\n\nAnalyze the hand starting at ${handTimestamp.start} and ending at ${handTimestamp.end}.`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.2,
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

        const result = this.parsePhase2Response(textPart.text)

        console.log(
          `[VertexAnalyzer] Phase 2 완료. Hand #${handTimestamp.hand_number}, Tags: ${result.semantic_tags.join(', ')}`
        )

        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`[VertexAnalyzer] Phase 2 시도 ${attempt} 실패:`, lastError.message)

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000
          console.log(`[VertexAnalyzer] ${delayMs / 1000}초 후 재시도...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    throw new Error(`Phase 2: ${maxRetries}회 시도 후 분석 실패: ${lastError?.message}`)
  }

  private parsePhase1Response(text: string): Phase1Result {
    const cleanText = this.cleanJsonText(text)

    let parsed: Phase1Result
    try {
      parsed = JSON.parse(cleanText)
    } catch (jsonError) {
      console.error('[VertexAnalyzer] Phase 1 JSON 파싱 오류, 복구 시도 중...')
      const extractedJson = this.extractJson(cleanText)
      try {
        parsed = JSON.parse(extractedJson)
        console.log('[VertexAnalyzer] Phase 1 JSON 복구 성공')
      } catch {
        throw new Error(`Phase 1 잘못된 JSON 응답: ${jsonError}`)
      }
    }

    if (!parsed.hands || !Array.isArray(parsed.hands)) {
      console.warn('[VertexAnalyzer] Phase 1: hands 배열 누락, 빈 배열 반환')
      return { hands: [] }
    }

    // 타임스탬프 형식 검증 (MM:SS 또는 HH:MM:SS)
    const validHands = parsed.hands.filter(
      (
        hand: { hand_number: number; start: string; end: string },
        index: number
      ) => {
        const timePattern = /^(\d{1,2}:)?\d{1,2}:\d{2}$/
        if (!timePattern.test(hand.start) || !timePattern.test(hand.end)) {
          console.warn(
            `[VertexAnalyzer] Phase 1 핸드 ${index + 1}: 잘못된 타임스탬프 형식, 스킵`
          )
          return false
        }
        return true
      }
    )

    return { hands: validHands }
  }

  private parsePhase2Response(text: string): Phase2Result {
    const cleanText = this.cleanJsonText(text)

    let parsed: Phase2Result
    try {
      parsed = JSON.parse(cleanText)
    } catch (jsonError) {
      console.error('[VertexAnalyzer] Phase 2 JSON 파싱 오류, 복구 시도 중...')
      const extractedJson = this.extractJson(cleanText)
      try {
        parsed = JSON.parse(extractedJson)
        console.log('[VertexAnalyzer] Phase 2 JSON 복구 성공')
      } catch {
        throw new Error(`Phase 2 잘못된 JSON 응답: ${jsonError}`)
      }
    }

    // 필수 필드 검증
    if (!parsed.players || !Array.isArray(parsed.players)) {
      throw new Error('Phase 2: players 필드 누락')
    }
    if (!parsed.board) {
      throw new Error('Phase 2: board 필드 누락')
    }

    // 시맨틱 태그 검증 및 필터링
    const validTags: SemanticTag[] = [
      '#BadBeat',
      '#Cooler',
      '#HeroCall',
      '#Tilt',
      '#SoulRead',
      '#SuckOut',
      '#SlowPlay',
      '#Bluff',
      '#AllIn',
      '#BigPot',
      '#FinalTable',
      '#BubblePlay',
    ]

    parsed.semantic_tags = (parsed.semantic_tags || []).filter((tag: unknown) =>
      validTags.includes(tag as SemanticTag)
    ) as SemanticTag[]

    // AI 분석 검증
    if (!parsed.ai_analysis) {
      console.warn('[VertexAnalyzer] Phase 2: ai_analysis 누락, 기본값 설정')
      parsed.ai_analysis = {
        confidence: 0.5,
        reasoning: 'No analysis provided',
        player_states: {},
        hand_quality: 'routine',
      }
    }

    // confidence 범위 검증
    if (
      typeof parsed.ai_analysis.confidence !== 'number' ||
      parsed.ai_analysis.confidence < 0 ||
      parsed.ai_analysis.confidence > 1
    ) {
      console.warn('[VertexAnalyzer] Phase 2: 잘못된 confidence 값, 0.5로 설정')
      parsed.ai_analysis.confidence = 0.5
    }

    return parsed
  }

  private cleanJsonText(text: string): string {
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }
    return cleanText.trim()
  }

  private extractJson(text: string): string {
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1)
    }

    throw new Error('JSON 추출 실패')
  }

  private parseAndValidateResponse(text: string): ExtractedHand[] {
    const cleanText = this.cleanJsonText(text)

    let parsed: AnalysisResult
    try {
      parsed = JSON.parse(cleanText)
    } catch (jsonError) {
      console.error('[VertexAnalyzer] JSON 파싱 오류, 복구 시도 중...')
      const extractedJson = this.extractJson(cleanText)
      try {
        parsed = JSON.parse(extractedJson)
        console.log('[VertexAnalyzer] JSON 복구 성공')
      } catch {
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

  analyzePhase1: (
    ...args: Parameters<VertexAnalyzer['analyzePhase1']>
  ) => {
    return vertexAnalyzer.instance.analyzePhase1(...args)
  },

  analyzePhase2: (
    ...args: Parameters<VertexAnalyzer['analyzePhase2']>
  ) => {
    return vertexAnalyzer.instance.analyzePhase2(...args)
  },
}
