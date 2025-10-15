import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sanitizeErrorMessage, logError } from '@/lib/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Apply rate limiting (5 requests per minute)
  const rateLimitResponse = await applyRateLimit(request, rateLimiters.naturalSearch)
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createServerSupabaseClient()

  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Input validation and sanitization
    const trimmedQuery = query.trim()

    // Length validation (prevent overly long queries)
    if (trimmedQuery.length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedQuery.length > 200) {
      return NextResponse.json(
        { error: 'Query is too long (max 200 characters)' },
        { status: 400 }
      )
    }

    // Check if API key is available
    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key is not configured. Please add CLAUDE_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    // Database schema context for Claude
    const schemaContext = `
You are a PostgreSQL query generator for a poker hand database.
Generate a SQL query based on the user's natural language request.

Available tables and columns:
- hands: id, day_id, number, description, timestamp, favorite, board_cards, pot_size
- days: id, sub_event_id, name, video_url, video_file, video_source, video_nas_path
- sub_events: id, tournament_id, name, date, total_prize, winner
- tournaments: id, name, category, location, start_date, end_date
- players: id, name, photo_url, country, total_winnings
- hand_players: id, hand_id, player_id, position, cards

Relationships:
- hands.day_id -> days.id
- days.sub_event_id -> sub_events.id
- sub_events.tournament_id -> tournaments.id
- hand_players.hand_id -> hands.id
- hand_players.player_id -> players.id

Common queries:
- "Find hands with AA vs KK" -> Look for hands.description containing these cards
- "Show me Daniel Negreanu's hands" -> Join with players and filter by name
- "Find hands from WSOP" -> Join with tournaments and filter by category
- "Show me big pots" -> Filter by pot_size
- "Find hands with pocket aces" -> Look for 'AA' in description or hand_players.cards

Important:
1. Return ONLY the SQL query, no explanations
2. Use proper JOIN statements when filtering by related tables
3. Always SELECT from hands table and include: id, number, description, timestamp
4. LIMIT results to 50 maximum
5. Use ILIKE for case-insensitive text matching
6. When searching for player names, join with hand_players and players tables
`

    // Call Claude API to generate SQL query
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${schemaContext}\n\nUser query: "${trimmedQuery}"\n\nGenerate the SQL query:`
        }
      ],
    })

    // Extract SQL query from Claude's response
    const sqlQuery = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : ''

    // Clean up the SQL query (remove markdown code blocks if present)
    const cleanedQuery = sqlQuery
      .replace(/```sql\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    logger.debug('Generated SQL query:', cleanedQuery)

    // Execute the query
    const { data, error } = await supabase.rpc('execute_search_query', {
      query_text: cleanedQuery
    })

    // If RPC doesn't work, try direct query (with caution)
    // NOTE: In production, you should use RPC or prepared statements to prevent SQL injection
    if (error) {
      logger.warn('RPC failed, attempting direct query:', error)

      // For MVP, we'll use a simple text search as fallback
      // Sanitize query for ILIKE to prevent pattern injection
      const sanitizedQuery = trimmedQuery.replace(/[%_\\]/g, '\\$&')

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('hands')
        .select(`
          id,
          number,
          description,
          timestamp,
          favorite,
          pot_size,
          days (
            name,
            sub_events (
              name,
              tournaments (
                name
              )
            )
          )
        `)
        .ilike('description', `%${sanitizedQuery}%`)
        .limit(50)

      if (fallbackError) throw fallbackError

      return NextResponse.json({
        results: fallbackData,
        query: cleanedQuery,
        method: 'fallback',
        info: 'Using simple text search. For full natural language search, please set up the execute_search_query RPC function.'
      })
    }

    return NextResponse.json({
      results: data,
      query: cleanedQuery,
      method: 'claude'
    })

  } catch (error: any) {
    logError('natural-search', error)

    return NextResponse.json(
      {
        error: sanitizeErrorMessage(error, '자연어 검색 처리 중 오류가 발생했습니다')
      },
      { status: 500 }
    )
  }
}
