/**
 * Hand History Analysis API
 *
 * Analyzes poker videos using Gemini AI to extract hand histories
 * and automatically imports them into the database.
 *
 * POST /api/analyze
 * - Accepts YouTube URL, platform type, and optional player list
 * - Uses Gemini 1.5 Pro for video analysis
 * - Returns extracted hand histories
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyzePokerVideo, type Platform } from '@/lib/gemini'
import { applyRateLimit, rateLimiters } from '@/lib/rate-limit'

// Validation schema
const analyzeSchema = z.object({
  videoUrl: z.string().url('Invalid video URL'),
  platform: z.enum(['triton', 'pokerstars', 'wsop', 'hustler']),
  dayId: z.string().optional(),
  players: z
    .array(
      z.object({
        name: z.string(),
        position: z.string().optional(),
      })
    )
    .optional(),
  segments: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['countdown', 'opening', 'gameplay', 'break', 'ending']),
        startTime: z.string(),
        endTime: z.string(),
        label: z.string().optional(),
      })
    )
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (5 requests per minute for video analysis)
    const rateLimitResponse = await applyRateLimit(request, rateLimiters.naturalSearch)
    if (rateLimitResponse) return rateLimitResponse

    // Validate Vertex AI credentials
    if (!process.env.GOOGLE_VERTEX_PROJECT ||
        !process.env.GOOGLE_CLIENT_EMAIL ||
        !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json(
        {
          error: 'Vertex AI credentials not configured',
          message: 'Please set GOOGLE_VERTEX_PROJECT, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY in environment variables',
        },
        { status: 500 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = analyzeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { videoUrl, platform, dayId, players, segments } = validation.data

    // Analyze video with Gemini
    console.log(`Starting Gemini analysis: ${platform} - ${videoUrl}`)

    const result = await analyzePokerVideo({
      videoUrl,
      platform: platform as Platform,
      dayId,
      players,
      segments,
    })

    console.log(`Gemini analysis complete: ${result.hands.length} hands extracted`)

    // Optionally auto-import to database if dayId is provided
    if (dayId && result.hands.length > 0) {
      try {
        // Call the import-hands API
        const importUrl = new URL('/api/import-hands', request.url)
        const importResponse = await fetch(importUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dayId,
            hands: result.hands,
          }),
        })

        if (!importResponse.ok) {
          console.error('Failed to import hands:', await importResponse.text())
        } else {
          const importResult = await importResponse.json()
          console.log(`Imported ${importResult.imported} hands to database`)
        }
      } catch (importError) {
        console.error('Error importing hands:', importError)
        // Don't fail the request if import fails - still return extracted hands
      }
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      platform: result.platform,
      model: result.model,
      handsExtracted: result.hands.length,
      hands: result.hands,
      dayId: dayId || null,
      imported: !!dayId,
    })
  } catch (error) {
    console.error('Analysis API error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}

// GET endpoint to provide API documentation
export async function GET() {
  return NextResponse.json({
    name: 'Hand History Analysis API',
    version: '1.0.0',
    description: 'Analyzes poker videos using Gemini AI to extract hand histories',
    endpoints: {
      POST: {
        description: 'Analyze a poker video and extract hand histories',
        body: {
          videoUrl: 'string (required) - YouTube video URL',
          platform: 'string (required) - triton | pokerstars | wsop | hustler',
          dayId: 'string (optional) - Day ID to auto-import hands',
          players: 'array (optional) - Expected players [{name, position?}]',
        },
        example: {
          videoUrl: 'https://www.youtube.com/watch?v=xxxxxxxxxx',
          platform: 'triton',
          dayId: 'day-123',
          players: [
            { name: 'Phil Ivey', position: 'BTN' },
            { name: 'Tom Dwan', position: 'BB' },
          ],
        },
        response: {
          success: true,
          platform: 'triton',
          model: 'gemini-2.5-pro',
          handsExtracted: 12,
          hands: '[ ...array of hand objects... ]',
          dayId: 'day-123',
          imported: true,
        },
      },
    },
    rateLimit: {
      requests: 5,
      window: '1 minute',
    },
    models: {
      gemini: {
        name: 'Gemini 1.5 Pro',
        capabilities: [
          'Video Understanding',
          'Audio Processing',
          'Long Context (2M tokens)',
          'Structured Output (JSON)',
        ],
      },
    },
  })
}
