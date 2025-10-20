/**
 * Hand Tags Types
 *
 * 핸드 태그 시스템을 위한 타입 정의
 */

/**
 * 허용된 핸드 태그 이름
 *
 * 카테고리:
 * - 플레이 유형: Bluff, Value Bet, Slow Play, Check Raise
 * - 결과: Bad Beat, Cooler, Suck Out
 * - 액션: Hero Call, Hero Fold, Big Pot
 */
export type HandTagName =
  // Play Types
  | 'Bluff'
  | 'Value Bet'
  | 'Slow Play'
  | 'Check Raise'
  // Results
  | 'Bad Beat'
  | 'Cooler'
  | 'Suck Out'
  // Actions
  | 'Hero Call'
  | 'Hero Fold'
  | 'Big Pot'

/**
 * 태그 카테고리
 */
export type HandTagCategory = 'Play Type' | 'Result' | 'Action'

/**
 * 핸드 태그
 */
export type HandTag = {
  id: string
  hand_id: string
  tag_name: HandTagName
  created_by: string
  created_at: string
}

/**
 * 태그별 통계
 */
export type HandTagStats = {
  tag_name: HandTagName
  count: number
  percentage: number
}

/**
 * 유저 태그 히스토리
 */
export type UserTagHistory = {
  hand_id: string
  tag_name: HandTagName
  created_at: string
  hand_number: string | null
  tournament_name: string | null
}

/**
 * 태그 카테고리별 그룹화
 */
export const TAG_CATEGORIES: Record<HandTagCategory, HandTagName[]> = {
  'Play Type': ['Bluff', 'Value Bet', 'Slow Play', 'Check Raise'],
  'Result': ['Bad Beat', 'Cooler', 'Suck Out'],
  'Action': ['Hero Call', 'Hero Fold', 'Big Pot'],
}

/**
 * 태그 색상 매핑
 */
export const TAG_COLORS: Record<HandTagCategory, string> = {
  'Play Type': 'blue',
  'Result': 'red',
  'Action': 'green',
}

/**
 * 태그 이름에서 카테고리 가져오기
 */
export function getTagCategory(tagName: HandTagName): HandTagCategory {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if (tags.includes(tagName)) {
      return category as HandTagCategory
    }
  }
  return 'Action' // 기본값
}

/**
 * 태그 색상 가져오기
 */
export function getTagColor(tagName: HandTagName): string {
  const category = getTagCategory(tagName)
  return TAG_COLORS[category]
}

/**
 * 모든 태그 이름 목록
 */
export const ALL_TAG_NAMES: HandTagName[] = [
  'Bluff',
  'Value Bet',
  'Slow Play',
  'Check Raise',
  'Bad Beat',
  'Cooler',
  'Suck Out',
  'Hero Call',
  'Hero Fold',
  'Big Pot',
]
