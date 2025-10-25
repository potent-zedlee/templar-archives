import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sanitizeErrorMessage, logError } from '@/lib/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { naturalSearchSchema, validateInput, formatValidationErrors } from '@/lib/validation/api-schemas'
import { logSecurityEvent } from '@/lib/security'
import {
  NaturalSearchFilterSchema,
  type NaturalSearchFilter,
  buildQueryFromFilter,
  NATURAL_SEARCH_PROMPT_TEMPLATE
} from '@/lib/natural-search-filter'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Apply rate limiting (5 requests per minute)
  const rateLimitResponse = await applyRateLimit(request, rateLimiters.naturalSearch)
  if (rateLimitResponse) return rateLimitResponse

  const supabase = await createServerSupabaseClient()

  try {
    const body = await request.json()

    // Zod 스키마 검증 (사용자 쿼리)
    const validation = validateInput(naturalSearchSchema, body)
    if (!validation.success) {
      const errors = formatValidationErrors(validation.errors!)
      logSecurityEvent('xss_attempt', { errors, body })
      return NextResponse.json(
        { error: errors[0] || '입력값이 유효하지 않습니다' },
        { status: 400 }
      )
    }

    const { query } = validation.data!
    const trimmedQuery = query.trim()

    // Check if API key is available
    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key is not configured. Please add CLAUDE_API_KEY to your environment variables.' },
        { status: 500 }
      )
    }

    // Call Claude API to generate JSON filter (NOT SQL)
    const prompt = NATURAL_SEARCH_PROMPT_TEMPLATE.replace('{QUERY}', trimmedQuery)

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    })

    // Extract JSON filter from Claude's response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : '{}'

    // Clean up JSON (remove markdown code blocks if present)
    const cleanedJson = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    logger.debug('Generated JSON filter:', cleanedJson)

    // Parse and validate JSON filter
    let filter: NaturalSearchFilter
    try {
      const parsedFilter = JSON.parse(cleanedJson)

      // Zod 검증 (JSON 필터)
      const filterValidation = NaturalSearchFilterSchema.safeParse(parsedFilter)
      if (!filterValidation.success) {
        logger.warn('Invalid JSON filter from Claude:', filterValidation.error)

        // Claude가 잘못된 필터를 생성한 경우, 텍스트 검색으로 fallback
        filter = {
          description_contains: trimmedQuery,
          limit: 50
        }
      } else {
        filter = filterValidation.data
      }
    } catch (parseError) {
      logger.warn('Failed to parse JSON from Claude:', parseError)

      // JSON 파싱 실패 시 텍스트 검색으로 fallback
      filter = {
        description_contains: trimmedQuery,
        limit: 50
      }
    }

    logger.debug('Validated filter:', filter)

    // Build query from filter (안전한 Query Builder 사용)
    const supabaseQuery = await buildQueryFromFilter(filter, supabase)

    if (!supabaseQuery) {
      // 필터 조건에 일치하는 결과 없음
      return NextResponse.json({
        results: [],
        filter,
        method: 'json-filter',
        info: 'No results found matching the filter criteria.'
      })
    }

    // Execute the query
    const { data, error } = await supabaseQuery

    if (error) {
      throw error
    }

    return NextResponse.json({
      results: data,
      filter,
      method: 'json-filter'
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
