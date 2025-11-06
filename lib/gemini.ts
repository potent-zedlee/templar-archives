/**
 * Gemini API Client
 *
 * Provides functionality for video analysis and hand history extraction
 * using Google's Gemini 1.5 Pro model with video understanding capabilities.
 */

import { GoogleGenAI } from '@google/genai'
import fs from 'fs/promises'
import path from 'path'
import { timeStringToSeconds } from './types/video-segments'

// Initialize Gemini API
const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || '',
})

/**
 * Platform types for poker video analysis
 */
export type Platform = 'triton' | 'pokerstars' | 'wsop' | 'hustler'

/**
 * Player information for hand history extraction
 */
export interface PlayerInfo {
  name: string
  position?: string
}

/**
 * Video segment (from video-segments.ts)
 */
export interface VideoSegment {
  id: string
  type: 'countdown' | 'opening' | 'gameplay' | 'break' | 'ending'
  startTime: string
  endTime: string
  label?: string
}

/**
 * Configuration for video analysis
 */
export interface AnalysisConfig {
  platform: Platform
  videoUrl: string
  players?: PlayerInfo[]
  segments?: VideoSegment[]
  dayId?: string
}

/**
 * Load platform-specific prompt from prompts directory
 */
async function loadPrompt(platform: Platform): Promise<string> {
  const promptsDir = path.join(process.cwd(), 'prompts')

  // Load base prompt
  const basePath = path.join(promptsDir, 'base.md')
  const basePrompt = await fs.readFile(basePath, 'utf-8')

  // Load platform-specific prompt
  const platformPath = path.join(promptsDir, `${platform}.md`)
  const platformPrompt = await fs.readFile(platformPath, 'utf-8')

  // Combine prompts
  return `${basePrompt}\n\n---\n\n${platformPrompt}`
}

/**
 * Build the complete prompt with player list and segments if provided
 */
function buildPrompt(
  basePrompt: string,
  players?: PlayerInfo[],
  segments?: VideoSegment[]
): string {
  let fullPrompt = basePrompt

  // Add video segments instruction
  if (segments && segments.length > 0) {
    const gameplaySegments = segments.filter((s) => s.type === 'gameplay')

    if (gameplaySegments.length > 0) {
      fullPrompt += '\n\n## Video Segments (IMPORTANT)\n\n'
      fullPrompt +=
        'ONLY analyze the GAMEPLAY segments listed below. Ignore all other parts of the video:\n\n'

      gameplaySegments.forEach((segment, index) => {
        fullPrompt += `${index + 1}. Gameplay segment: ${segment.startTime} - ${segment.endTime}`
        if (segment.label) {
          fullPrompt += ` (${segment.label})`
        }
        fullPrompt += '\n'
      })

      fullPrompt +=
        '\nFocus your analysis ONLY on these gameplay segments. Skip countdown, opening, breaks, and ending sequences.\n'
    }
  }

  // Add player list
  if (players && players.length > 0) {
    fullPrompt += '\n\n## Expected Players\n\n'
    fullPrompt +=
      'The following players are expected to appear in this video. Use these names when matching players:\n\n'

    players.forEach((player) => {
      fullPrompt += `- ${player.name}`
      if (player.position) {
        fullPrompt += ` (${player.position})`
      }
      fullPrompt += '\n'
    })

    fullPrompt +=
      '\nIf you see a name that is similar but not exact, use the closest match from this list.\n'
  }

  return fullPrompt
}

/**
 * Analyze a single video segment or full video
 */
async function analyzeSingleVideo(
  videoUrl: string,
  fullPrompt: string,
  segment?: VideoSegment
): Promise<any[]> {
  if (segment) {
    console.log(
      `[Segment] Analyzing ${segment.startTime} - ${segment.endTime}`
    )
  }

  // Build analysis prompt
  let promptText = `CRITICAL OUTPUT REQUIREMENTS:
- You MUST respond with ONLY a valid JSON array
- Start your response with [ and end with ]
- Do NOT include any text before or after the JSON
- Do NOT use markdown code blocks (no \`\`\`json)
- Follow the exact JSON schema provided below

${fullPrompt}`

  // Add time range instruction if segment provided
  if (segment) {
    const startSeconds = timeStringToSeconds(segment.startTime)
    const endSeconds = timeStringToSeconds(segment.endTime)

    promptText += `

⚠️ CRITICAL TIME RANGE RESTRICTION ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANALYZE ONLY THE FOLLOWING TIME RANGE:
START: ${segment.startTime} (${startSeconds} seconds)
END: ${segment.endTime} (${endSeconds} seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABSOLUTE REQUIREMENTS:
1. ✓ ONLY extract hands that BEGIN and END within ${segment.startTime} - ${segment.endTime}
2. ✗ COMPLETELY IGNORE all gameplay before ${segment.startTime}
3. ✗ COMPLETELY IGNORE all gameplay after ${segment.endTime}
4. ✓ Use actual video timestamps (e.g., "${segment.startTime}", NOT "00:00")
5. ✓ If a hand starts before ${segment.startTime}, DO NOT INCLUDE IT
6. ✓ If a hand ends after ${segment.endTime}, DO NOT INCLUDE IT
7. ✓ If NO complete hands exist in this segment, return an empty array: []

VALID EXAMPLE:
- Hand starts at timestamp ${Math.floor(startSeconds + (endSeconds - startSeconds) * 0.2)}s → within range ✓
- Hand ends at timestamp ${Math.floor(startSeconds + (endSeconds - startSeconds) * 0.8)}s → within range ✓
- INCLUDE THIS HAND ✓

INVALID EXAMPLES:
- Hand starts at ${startSeconds - 30}s → before ${segment.startTime} ✗ SKIP
- Hand ends at ${endSeconds + 30}s → after ${segment.endTime} ✗ SKIP
- Hand starts at ${startSeconds - 10}s, ends at ${startSeconds + 120}s → starts before range ✗ SKIP

THIS IS NOT A SUGGESTION - THIS IS A MANDATORY CONSTRAINT.
YOU MUST STRICTLY ADHERE TO THE TIME RANGE ${segment.startTime} - ${segment.endTime}.
`
  }

  // Generate content using YouTube video (official SDK format)
  // Documentation: https://ai.google.dev/gemini-api/docs/video-understanding

  // Log request details for debugging
  console.log('=== Gemini API Request Details ===')
  console.log('Model:', 'gemini-2.5-flash')
  console.log('Video URL:', videoUrl)
  console.log('Prompt length:', promptText.length, 'chars')
  if (segment) {
    console.log('Segment:', `${segment.startTime} - ${segment.endTime}`)
  }

  // Build videoMetadata for segment clipping
  const fileDataPart: any = {
    fileData: {
      fileUri: videoUrl,
      mimeType: 'video/*',
    },
  }

  // Add videoMetadata if segment is provided
  if (segment) {
    const startSeconds = timeStringToSeconds(segment.startTime)
    const endSeconds = timeStringToSeconds(segment.endTime)
    fileDataPart.videoMetadata = {
      startOffset: `${startSeconds}s`,
      endOffset: `${endSeconds}s`,
    }
    console.log(`[videoMetadata] ${segment.startTime} (${startSeconds}s) - ${segment.endTime} (${endSeconds}s)`)
  }

  const requestConfig = {
    model: 'gemini-2.5-flash', // Fast and cost-effective for video analysis
    contents: [
      {
        role: 'user',
        parts: [
          fileDataPart,
          {
            text: promptText,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Low temperature for consistent, factual extraction
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 65536, // Gemini 2.5 Flash maximum output tokens
    },
  }

  console.log('Request config:', JSON.stringify({
    model: requestConfig.model,
    contentsCount: requestConfig.contents.length,
    generationConfig: requestConfig.generationConfig,
  }, null, 2))

  let response
  try {
    response = await genAI.models.generateContent(requestConfig)
  } catch (apiError) {
    console.error('=== Gemini API Error ===')
    console.error('Error:', apiError)
    console.error('Error type:', apiError instanceof Error ? apiError.constructor.name : typeof apiError)
    if (apiError instanceof Error) {
      console.error('Error message:', apiError.message)
      console.error('Error stack:', apiError.stack)
    }
    throw apiError
  }

  // Get response text (async property in new SDK)
  const text = await response.text

  // Detailed logging for debugging
  console.log('=== Gemini Video Analysis Response ===')
  console.log('Response length:', text.length)
  console.log('First 1000 chars:', text.substring(0, 1000))
  if (text.length > 1000) {
    console.log('Last 1000 chars:', text.substring(text.length - 1000))
  }
  if (response.candidates?.[0]?.finishReason) {
    console.log('Finish reason:', response.candidates[0].finishReason)
  }

  // Parse JSON response with aggressive extraction
  let hands
  let cleanedText = text.trim()

  // Step 1: Remove markdown code blocks if present
  const codeBlockMatch = cleanedText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
  if (codeBlockMatch) {
    cleanedText = codeBlockMatch[1]
  }

  // Step 2: Extract JSON array (handle text before/after)
  const arrayMatch = cleanedText.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    cleanedText = arrayMatch[0]
  }

  // Step 3: Parse JSON
  try {
    hands = JSON.parse(cleanedText)
  } catch (parseError) {
    // Enhanced error logging
    console.error('=== Gemini Response Parsing Error ===')
    console.error('Raw response length:', text.length)
    console.error('First 500 chars:', text.substring(0, 500))
    console.error('Last 500 chars:', text.substring(text.length - 500))
    console.error('Cleaned text:', cleanedText.substring(0, 500))
    console.error('Parse error:', parseError)
    throw new Error(
      `Failed to parse Gemini response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
    )
  }

  // Validate response structure
  if (!Array.isArray(hands)) {
    throw new Error('Expected array of hands from Gemini')
  }

  return hands
}

/**
 * Analyze poker video and extract hand histories using Gemini
 */
export async function analyzePokerVideo(config: AnalysisConfig) {
  try {
    // Validate API key
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY is not configured')
    }

    // Load platform-specific prompt
    const basePrompt = await loadPrompt(config.platform)
    const fullPrompt = buildPrompt(basePrompt, config.players, config.segments)

    // Check if segments are provided (for long videos)
    const gameplaySegments = config.segments?.filter((s) => s.type === 'gameplay') || []

    let hands: any[] = []

    if (gameplaySegments.length > 0) {
      // Process segments sequentially
      console.log(
        `=== Processing ${gameplaySegments.length} gameplay segments ===`
      )

      for (let i = 0; i < gameplaySegments.length; i++) {
        const segment = gameplaySegments[i]
        console.log(
          `[Segment ${i + 1}/${gameplaySegments.length}] ${segment.startTime} - ${segment.endTime}`
        )

        try {
          const segmentHands = await analyzeSingleVideo(
            config.videoUrl,
            fullPrompt,
            segment
          )

          console.log(`[Segment ${i + 1}] Extracted ${segmentHands.length} hands`)
          hands.push(...segmentHands)
        } catch (error) {
          console.error(`[Segment ${i + 1}] Failed:`, error)
          // Continue with next segment even if one fails
        }
      }

      console.log(
        `\n=== Total hands extracted from all segments: ${hands.length} ===`
      )
    } else {
      // No segments - process entire video
      console.log('=== Processing entire video (no segments) ===')
      console.warn(
        'WARNING: Processing entire video without segments. For videos longer than 3 hours, please use the segment feature in the UI.'
      )

      hands = await analyzeSingleVideo(config.videoUrl, fullPrompt)
      console.log(`Extracted ${hands.length} hands from full video`)
    }

    return {
      success: true,
      hands,
      model: 'gemini-2.5-flash',
      platform: config.platform,
    }
  } catch (error) {
    console.error('Gemini analysis error:', error)
    throw error
  }
}

/**
 * Test Gemini API connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return false
    }

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ],
    })

    const text = await response.text
    return text.length > 0
  } catch (error) {
    console.error('Gemini connection test failed:', error)
    return false
  }
}
