import { GoogleGenAI } from '@google/genai'
import { TRITON_POKER_PROMPT } from './prompts'

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
})

export interface HaeSegment {
  start: number // seconds
  end: number // seconds
  label?: string
}

export interface HaeResult {
  hands: any[]
  rawResponse: string
  error?: string
}

const MAX_SEGMENT_DURATION = 3600 // 1시간 (초)

/**
 * Validate YouTube URL format
 */
function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
  ]
  return patterns.some(pattern => pattern.test(url))
}

/**
 * Convert seconds to Gemini's time offset format
 */
function formatTimeOffset(seconds: number): string {
  return `${Math.floor(seconds)}s`
}

/**
 * Split long segment into chunks (max 1 hour each)
 */
function splitSegment(segment: HaeSegment): HaeSegment[] {
  const duration = segment.end - segment.start
  if (duration <= MAX_SEGMENT_DURATION) {
    return [segment]
  }

  const chunks: HaeSegment[] = []
  let currentStart = segment.start

  while (currentStart < segment.end) {
    const currentEnd = Math.min(currentStart + MAX_SEGMENT_DURATION, segment.end)
    chunks.push({
      start: currentStart,
      end: currentEnd,
      label: segment.label,
    })
    currentStart = currentEnd
  }

  return chunks
}

/**
 * Analyze a video segment using HAE (Gemini 2.0 Flash) with YouTube URL
 * Supports direct YouTube URL processing with videoMetadata
 */
export async function haeAnalyzeSegment(
  youtubeUrl: string,
  segment: HaeSegment
): Promise<HaeResult> {
  try {
    // Validate YouTube URL
    if (!isValidYouTubeUrl(youtubeUrl)) {
      return {
        hands: [],
        rawResponse: '',
        error: 'Invalid YouTube URL format',
      }
    }

    // Validate segment times
    if (segment.start < 0 || segment.end <= segment.start) {
      return {
        hands: [],
        rawResponse: '',
        error: 'Invalid segment time range',
      }
    }

    // Split if segment is longer than 1 hour
    const chunks = splitSegment(segment)

    if (chunks.length > 1) {
      console.log(`Segment too long (${segment.end - segment.start}s), split into ${chunks.length} chunks`)

      // Analyze each chunk and merge results
      const results = await Promise.all(
        chunks.map(chunk => haeAnalyzeSingleSegment(youtubeUrl, chunk))
      )

      // Merge all hands from chunks
      const allHands = results.flatMap(r => r.hands)
      const allResponses = results.map(r => r.rawResponse).join('\n---\n')
      const errors = results.filter(r => r.error).map(r => r.error)

      return {
        hands: allHands,
        rawResponse: allResponses,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      }
    }

    return await haeAnalyzeSingleSegment(youtubeUrl, segment)
  } catch (error) {
    console.error('Gemini API error:', error)
    return {
      hands: [],
      rawResponse: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Analyze a single segment using HAE (must be <= 1 hour)
 */
async function haeAnalyzeSingleSegment(
  youtubeUrl: string,
  segment: HaeSegment
): Promise<HaeResult> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: youtubeUrl,
                mimeType: 'video/*',
              },
              videoMetadata: {
                startOffset: formatTimeOffset(segment.start),
                endOffset: formatTimeOffset(segment.end),
              },
            },
            {
              text: `${TRITON_POKER_PROMPT}

Segment: ${segment.start}s - ${segment.end}s (${Math.floor((segment.end - segment.start) / 60)} minutes)
Label: ${segment.label || 'Gameplay'}

Please analyze this poker video segment and extract all hand histories in the specified JSON format.`,
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

    const rawResponse = response.text || ''

    // Parse JSON response
    try {
      const parsedData = JSON.parse(rawResponse)
      return {
        hands: parsedData.hands || [],
        rawResponse,
      }
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = rawResponse.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[1])
        return {
          hands: parsedData.hands || [],
          rawResponse,
        }
      }

      return {
        hands: [],
        rawResponse,
        error: 'Could not parse JSON from response',
      }
    }
  } catch (error) {
    console.error('Gemini single segment error:', error)

    // Provide more specific error messages
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message

      // Common error patterns
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        errorMessage = 'Video not found or not accessible (may be private or deleted)'
      } else if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        errorMessage = 'Video access forbidden (may be private or restricted)'
      } else if (errorMessage.includes('quota')) {
        errorMessage = 'API quota exceeded - please try again later'
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Request timeout - video may be too long or server is busy'
      }
    }

    return {
      hands: [],
      rawResponse: '',
      error: errorMessage,
    }
  }
}

/**
 * Analyze multiple segments in parallel using HAE for better performance
 */
export async function haeAnalyzeSegments(
  youtubeUrl: string,
  segments: HaeSegment[]
): Promise<HaeResult[]> {
  // Parallel processing for speed
  const results = await Promise.all(
    segments.map(segment => haeAnalyzeSegment(youtubeUrl, segment))
  )

  return results
}

/**
 * Test connection to Gemini API
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: 'Hello',
    })
    return !!response.text
  } catch (error) {
    console.error('Gemini connection test failed:', error)
    return false
  }
}

/**
 * Test YouTube video analysis with a short segment
 */
export async function testYouTubeAnalysis(
  youtubeUrl: string,
  startSeconds: number = 0,
  endSeconds: number = 30
): Promise<{ success: boolean; error?: string; response?: string }> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: youtubeUrl,
                mimeType: 'video/*',
              },
              videoMetadata: {
                startOffset: formatTimeOffset(startSeconds),
                endOffset: formatTimeOffset(endSeconds),
              },
            },
            {
              text: 'Describe what you see in this video segment in 2-3 sentences.',
            },
          ],
        },
      ],
    })

    return {
      success: true,
      response: response.text || 'No response',
    }
  } catch (error) {
    console.error('YouTube analysis test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
