/**
 * SemanticAnalyzer - 시맨틱 태그 검증 및 분석 결과 후처리
 */

import type {
  SemanticTag,
  EmotionalState,
  PlayStyle,
  HandQuality,
  AIAnalysis
} from '../types'

// 유효한 시맨틱 태그 목록
export const VALID_SEMANTIC_TAGS: SemanticTag[] = [
  '#BadBeat', '#Cooler', '#HeroCall', '#Tilt',
  '#SoulRead', '#SuckOut', '#SlowPlay', '#Bluff',
  '#AllIn', '#BigPot', '#FinalTable', '#BubblePlay'
]

// 유효한 감정 상태
export const VALID_EMOTIONAL_STATES: EmotionalState[] = [
  'tilting', 'confident', 'cautious', 'neutral'
]

// 유효한 플레이 스타일
export const VALID_PLAY_STYLES: PlayStyle[] = [
  'aggressive', 'passive', 'balanced'
]

// 유효한 핸드 품질
export const VALID_HAND_QUALITIES: HandQuality[] = [
  'routine', 'interesting', 'highlight', 'epic'
]

export class SemanticAnalyzer {
  /**
   * 시맨틱 태그 배열 검증 및 정규화
   */
  validateAndNormalizeTags(tags: unknown[]): SemanticTag[] {
    if (!Array.isArray(tags)) return []

    return tags
      .filter((tag): tag is SemanticTag =>
        typeof tag === 'string' && VALID_SEMANTIC_TAGS.includes(tag as SemanticTag)
      )
      .filter((tag, index, self) => self.indexOf(tag) === index) // 중복 제거
  }

  /**
   * AI 분석 결과 검증 및 정규화
   */
  validateAndNormalizeAnalysis(analysis: unknown): AIAnalysis {
    const defaultAnalysis: AIAnalysis = {
      confidence: 0.5,
      reasoning: '',
      player_states: {},
      hand_quality: 'routine'
    }

    if (!analysis || typeof analysis !== 'object') {
      return defaultAnalysis
    }

    const a = analysis as Record<string, unknown>

    return {
      confidence: this.normalizeConfidence(a.confidence),
      reasoning: typeof a.reasoning === 'string' ? a.reasoning : '',
      player_states: this.normalizePlayerStates(a.player_states),
      hand_quality: this.normalizeHandQuality(a.hand_quality)
    }
  }

  /**
   * 신뢰도 정규화 (0.0 - 1.0)
   */
  private normalizeConfidence(confidence: unknown): number {
    if (typeof confidence !== 'number') return 0.5
    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * 플레이어 상태 정규화
   */
  private normalizePlayerStates(
    states: unknown
  ): Record<string, { emotional_state: EmotionalState; play_style: PlayStyle }> {
    if (!states || typeof states !== 'object') return {}

    const normalized: Record<string, { emotional_state: EmotionalState; play_style: PlayStyle }> = {}

    for (const [playerId, state] of Object.entries(states)) {
      if (!state || typeof state !== 'object') continue

      const s = state as Record<string, unknown>

      normalized[playerId] = {
        emotional_state: VALID_EMOTIONAL_STATES.includes(s.emotional_state as EmotionalState)
          ? s.emotional_state as EmotionalState
          : 'neutral',
        play_style: VALID_PLAY_STYLES.includes(s.play_style as PlayStyle)
          ? s.play_style as PlayStyle
          : 'balanced'
      }
    }

    return normalized
  }

  /**
   * 핸드 품질 정규화
   */
  private normalizeHandQuality(quality: unknown): HandQuality {
    if (VALID_HAND_QUALITIES.includes(quality as HandQuality)) {
      return quality as HandQuality
    }
    return 'routine'
  }

  /**
   * 태그 기반 하이라이트 점수 계산 (0-100)
   */
  calculateHighlightScore(tags: SemanticTag[]): number {
    const tagScores: Record<SemanticTag, number> = {
      '#BadBeat': 90,
      '#Cooler': 85,
      '#HeroCall': 80,
      '#SoulRead': 75,
      '#SuckOut': 70,
      '#Bluff': 65,
      '#AllIn': 60,
      '#BigPot': 55,
      '#SlowPlay': 50,
      '#Tilt': 45,
      '#FinalTable': 40,
      '#BubblePlay': 35,
    }

    if (tags.length === 0) return 0

    const maxScore = Math.max(...tags.map(tag => tagScores[tag] || 0))
    const bonusForMultiple = Math.min(tags.length - 1, 3) * 5

    return Math.min(100, maxScore + bonusForMultiple)
  }

  /**
   * 핸드 품질을 점수 기반으로 자동 결정
   */
  determineHandQuality(
    tags: SemanticTag[],
    aiQuality: HandQuality | undefined
  ): HandQuality {
    // AI가 판단한 품질 우선
    if (aiQuality && aiQuality !== 'routine') {
      return aiQuality
    }

    // 태그 기반 자동 결정
    const score = this.calculateHighlightScore(tags)

    if (score >= 80) return 'epic'
    if (score >= 60) return 'highlight'
    if (score >= 40) return 'interesting'
    return 'routine'
  }
}

// 싱글톤 export
export const semanticAnalyzer = new SemanticAnalyzer()
