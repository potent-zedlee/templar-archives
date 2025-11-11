/**
 * HAE (Hand Analysis Engine) API Client
 * Wrapper for HAE-MVP Python backend
 */

import type {
  AnalyzeVideoRequest,
  AnalyzeResult,
  SseEvent,
  ProgressEvent,
  LogEvent,
  CompleteEvent,
  ErrorEvent,
  HaeClientConfig,
} from '@/types/hae'

/**
 * HAE API Client Class
 */
export class HaeClient {
  private baseUrl: string
  private apiKey?: string
  private timeout: number

  constructor(config?: Partial<HaeClientConfig>) {
    this.baseUrl = config?.baseUrl || this.getDefaultBaseUrl()
    this.apiKey = config?.apiKey
    this.timeout = config?.timeout || 900000 // 15 minutes default
  }

  /**
   * Get default base URL from environment variables
   */
  private getDefaultBaseUrl(): string {
    // Server-side
    if (typeof window === 'undefined') {
      return process.env.HAE_BACKEND_URL || 'http://localhost:8000'
    }
    // Client-side
    return process.env.NEXT_PUBLIC_HAE_BACKEND_URL || 'http://localhost:8000'
  }

  /**
   * Analyze video and stream results via SSE
   */
  async *analyzeVideo(
    request: AnalyzeVideoRequest
  ): AsyncGenerator<SseEvent, void, unknown> {
    const url = `${this.baseUrl}/api/analyze-video`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    const body = JSON.stringify({
      youtubeUrl: request.youtubeUrl,
      startTime: request.startTime,
      endTime: request.endTime,
      platform: request.platform,
      apiKey: request.apiKey || this.apiKey,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HAE API error (${response.status}): ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body reader not available')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue

          const event = this.parseSSE(eventBlock)
          if (event) {
            yield event
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Parse SSE event block
   */
  private parseSSE(block: string): SseEvent | null {
    const lines = block.split('\n')
    let eventType: string | null = null
    let eventData: string | null = null

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim()
      } else if (line.startsWith('data:')) {
        eventData = line.substring(5).trim()
      }
    }

    if (!eventType || !eventData) {
      return null
    }

    try {
      const data = JSON.parse(eventData)

      switch (eventType) {
        case 'progress':
          return {
            event: 'progress',
            data,
          } as ProgressEvent

        case 'log':
          return {
            event: 'log',
            data,
          } as LogEvent

        case 'complete':
          return {
            event: 'complete',
            data,
          } as CompleteEvent

        case 'error':
          return {
            event: 'error',
            data,
          } as ErrorEvent

        default:
          console.warn(`Unknown SSE event type: ${eventType}`)
          return null
      }
    } catch (error) {
      console.error('Failed to parse SSE event data:', error)
      return null
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
}

/**
 * Create default HAE client instance
 */
export function createHaeClient(config?: Partial<HaeClientConfig>): HaeClient {
  return new HaeClient(config)
}

/**
 * Singleton instance for convenience
 */
let defaultClient: HaeClient | null = null

export function getHaeClient(): HaeClient {
  if (!defaultClient) {
    defaultClient = createHaeClient()
  }
  return defaultClient
}
