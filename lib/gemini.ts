/**
 * Gemini API Client
 *
 * Provides functionality for video analysis and hand history extraction
 * using Google's Gemini 1.5 Pro model with video understanding capabilities.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs/promises'
import path from 'path'

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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
 * Configuration for video analysis
 */
export interface AnalysisConfig {
  platform: Platform
  videoUrl: string
  players?: PlayerInfo[]
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
 * Build the complete prompt with player list if provided
 */
function buildPrompt(basePrompt: string, players?: PlayerInfo[]): string {
  let fullPrompt = basePrompt

  if (players && players.length > 0) {
    fullPrompt += '\n\n## Expected Players\n\n'
    fullPrompt += 'The following players are expected to appear in this video. Use these names when matching players:\n\n'

    players.forEach((player) => {
      fullPrompt += `- ${player.name}`
      if (player.position) {
        fullPrompt += ` (${player.position})`
      }
      fullPrompt += '\n'
    })

    fullPrompt += '\nIf you see a name that is similar but not exact, use the closest match from this list.\n'
  }

  return fullPrompt
}

/**
 * Analyze poker video and extract hand histories using Gemini
 */
export async function analyzePokerVideo(config: AnalysisConfig) {
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    // Load platform-specific prompt
    const basePrompt = await loadPrompt(config.platform)
    const fullPrompt = buildPrompt(basePrompt, config.players)

    // Initialize Gemini model with video understanding
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent, factual extraction
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json', // Request JSON response
      },
    })

    // Prepare video file part
    // For YouTube videos, Gemini can directly process the URL
    const videoPart = {
      fileData: {
        fileUri: config.videoUrl,
        mimeType: 'video/*',
      },
    }

    // Generate content with video and prompt
    const result = await model.generateContent([
      fullPrompt,
      videoPart,
    ])

    const response = result.response
    const text = response.text()

    // Parse JSON response
    let hands
    try {
      hands = JSON.parse(text)
    } catch (parseError) {
      // If response is not valid JSON, try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        hands = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Failed to parse Gemini response as JSON')
      }
    }

    // Validate response structure
    if (!Array.isArray(hands)) {
      throw new Error('Expected array of hands from Gemini')
    }

    return {
      success: true,
      hands,
      model: 'gemini-1.5-pro',
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
    if (!process.env.GEMINI_API_KEY) {
      return false
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    const result = await model.generateContent('Hello')
    const response = result.response

    return response.text().length > 0
  } catch (error) {
    console.error('Gemini connection test failed:', error)
    return false
  }
}
