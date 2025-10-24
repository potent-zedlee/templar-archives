import { z } from 'zod'

/**
 * Natural Search Filter Types
 *
 * Claude가 생성하는 JSON 필터 구조입니다.
 * SQL 대신 안전한 필터 객체를 반환합니다.
 */

// ==================== Zod Schemas ====================

/**
 * 자연어 검색 필터 스키마
 */
export const NaturalSearchFilterSchema = z.object({
  // 플레이어 필터
  players: z.array(z.string()).optional(),

  // 토너먼트 필터
  tournaments: z.array(z.string()).optional(),
  categories: z.array(
    z.enum(['WSOP', 'Triton', 'EPT', 'APT', 'APL', 'Hustler Casino Live', 'GGPOKER', 'WPT'])
  ).optional(),

  // 팟 크기 필터
  pot_min: z.number().min(0).optional(),
  pot_max: z.number().min(0).optional(),

  // 카드 필터
  hole_cards: z.array(z.string().regex(/^[AKQJT98765432]{1,2}[scdh]?$/)).optional(),
  board_cards: z.array(z.string().regex(/^[AKQJT98765432][scdh]$/)).optional(),

  // 텍스트 검색
  description_contains: z.string().optional(),

  // 날짜 필터
  date_from: z.string().optional(),
  date_to: z.string().optional(),

  // 정렬 및 제한
  order_by: z.enum(['pot_size', 'timestamp', 'created_at']).optional(),
  order_direction: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
})

export type NaturalSearchFilter = z.infer<typeof NaturalSearchFilterSchema>

// ==================== Filter Builder ====================

/**
 * 필터를 Supabase 쿼리로 변환
 *
 * @param filter - 자연어 검색 필터
 * @param supabase - Supabase 클라이언트
 * @returns Supabase 쿼리 빌더
 */
export async function buildQueryFromFilter(filter: NaturalSearchFilter, supabase: any) {
  // 기본 쿼리 시작
  let query = supabase
    .from('hands')
    .select(`
      id,
      number,
      description,
      timestamp,
      favorite,
      pot_size,
      board_cards,
      days (
        name,
        sub_events (
          name,
          tournaments (
            name,
            category
          )
        )
      )
    `)

  // 1. 플레이어 필터
  if (filter.players && filter.players.length > 0) {
    // 플레이어 ID 조회
    const { data: playerData } = await supabase
      .from('players')
      .select('id')
      .or(filter.players.map(name => `name.ilike.%${name}%`).join(','))

    if (playerData && playerData.length > 0) {
      const playerIds = playerData.map((p: any) => p.id)

      // hand_players로 핸드 필터링
      const { data: handPlayerData } = await supabase
        .from('hand_players')
        .select('hand_id')
        .in('player_id', playerIds)

      if (handPlayerData && handPlayerData.length > 0) {
        const handIds = handPlayerData.map((hp: any) => hp.hand_id)
        query = query.in('id', handIds)
      } else {
        // 일치하는 핸드 없음
        return null
      }
    } else {
      // 일치하는 플레이어 없음
      return null
    }
  }

  // 2. 토너먼트 필터
  if (filter.tournaments && filter.tournaments.length > 0) {
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('id')
      .or(filter.tournaments.map(name => `name.ilike.%${name}%`).join(','))

    if (tournamentData && tournamentData.length > 0) {
      const tournamentIds = tournamentData.map((t: any) => t.id)

      // sub_events를 통해 days 조회
      const { data: subEventData } = await supabase
        .from('sub_events')
        .select('id')
        .in('tournament_id', tournamentIds)

      if (subEventData && subEventData.length > 0) {
        const subEventIds = subEventData.map((se: any) => se.id)

        const { data: dayData } = await supabase
          .from('days')
          .select('id')
          .in('sub_event_id', subEventIds)

        if (dayData && dayData.length > 0) {
          const dayIds = dayData.map((d: any) => d.id)
          query = query.in('day_id', dayIds)
        } else {
          return null
        }
      } else {
        return null
      }
    } else {
      return null
    }
  }

  // 3. 카테고리 필터
  if (filter.categories && filter.categories.length > 0) {
    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('id')
      .in('category', filter.categories)

    if (tournamentData && tournamentData.length > 0) {
      const tournamentIds = tournamentData.map((t: any) => t.id)

      const { data: subEventData } = await supabase
        .from('sub_events')
        .select('id')
        .in('tournament_id', tournamentIds)

      if (subEventData && subEventData.length > 0) {
        const subEventIds = subEventData.map((se: any) => se.id)

        const { data: dayData } = await supabase
          .from('days')
          .select('id')
          .in('sub_event_id', subEventIds)

        if (dayData && dayData.length > 0) {
          const dayIds = dayData.map((d: any) => d.id)
          query = query.in('day_id', dayIds)
        } else {
          return null
        }
      } else {
        return null
      }
    } else {
      return null
    }
  }

  // 4. 팟 크기 필터
  if (filter.pot_min !== undefined) {
    query = query.gte('pot_size', filter.pot_min)
  }
  if (filter.pot_max !== undefined) {
    query = query.lte('pot_size', filter.pot_max)
  }

  // 5. 홀카드 필터 (description 텍스트 검색)
  if (filter.hole_cards && filter.hole_cards.length > 0) {
    const cardPatterns = filter.hole_cards.map(card => `%${card}%`)
    query = query.or(cardPatterns.map(pattern => `description.ilike.${pattern}`).join(','))
  }

  // 6. 보드 카드 필터 (board_cards 배열)
  if (filter.board_cards && filter.board_cards.length > 0) {
    // PostgreSQL array contains 연산자 사용
    query = query.contains('board_cards', filter.board_cards)
  }

  // 7. Description 텍스트 검색
  if (filter.description_contains) {
    query = query.ilike('description', `%${filter.description_contains}%`)
  }

  // 8. 날짜 필터 (timestamp 기준)
  if (filter.date_from) {
    query = query.gte('timestamp', filter.date_from)
  }
  if (filter.date_to) {
    query = query.lte('timestamp', filter.date_to)
  }

  // 9. 정렬
  const orderBy = filter.order_by || 'timestamp'
  const orderDirection = filter.order_direction || 'desc'
  query = query.order(orderBy, { ascending: orderDirection === 'asc' })

  // 10. 제한
  const limit = filter.limit || 50
  query = query.limit(limit)

  return query
}

// ==================== Prompt Template ====================

/**
 * Claude에게 JSON 필터를 생성하도록 요청하는 프롬프트
 */
export const NATURAL_SEARCH_PROMPT_TEMPLATE = `You are a poker hand search assistant. Convert the user's natural language query into a JSON filter object.

Available filter fields:
{
  "players": ["player name"],           // Array of player names (partial match ok)
  "tournaments": ["tournament name"],   // Array of tournament names (partial match ok)
  "categories": ["WSOP", "Triton", ...],// Tournament categories (exact match)
  "pot_min": number,                    // Minimum pot size
  "pot_max": number,                    // Maximum pot size
  "hole_cards": ["AA", "KK"],          // Hole cards (e.g., "AA", "AKs", "KQ")
  "board_cards": ["As", "Kh", "Qd"],   // Board cards with suits (e.g., "As" = Ace of spades)
  "description_contains": "text",       // Text to search in hand description
  "date_from": "2024-01-01",           // Start date (ISO format)
  "date_to": "2024-12-31",             // End date (ISO format)
  "order_by": "pot_size" | "timestamp" | "created_at",
  "order_direction": "asc" | "desc",
  "limit": 50                           // Max results (1-100)
}

Examples:
User: "Find hands with Daniel Negreanu"
JSON: {"players": ["Daniel Negreanu"], "limit": 50}

User: "Show me big pots from WSOP with pocket aces"
JSON: {"categories": ["WSOP"], "hole_cards": ["AA"], "pot_min": 100000, "order_by": "pot_size", "order_direction": "desc"}

User: "Find hands between Phil Hellmuth and Tom Dwan"
JSON: {"players": ["Phil Hellmuth", "Tom Dwan"], "limit": 50}

User: "Show me hands with AA vs KK"
JSON: {"description_contains": "AA vs KK", "limit": 50}

IMPORTANT:
1. Return ONLY valid JSON, no explanations or markdown
2. Use empty object {} if query is unclear
3. Card format: suits are "s"(spades), "h"(hearts), "d"(diamonds), "c"(clubs)
4. Partial names are ok (e.g., "Daniel" matches "Daniel Negreanu")

User query: "{QUERY}"

JSON:
`
