'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getServiceSupabaseClient } from '@/lib/supabase-service'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type {
  KanAnalysisResult,
  KanHand,
  SSEEventType,
  SSEEventData,
  SSECompleteEvent,
  SSEProgressEvent,
  AnalyzeVideoRequest,
} from '@/lib/types/kan-backend'

// Typed Supabase Client
type TypedSupabaseClient = SupabaseClient<Database>

// Timeout configurations
const TIMEOUTS = {
  BACKEND_REQUEST: 300000, // 5분 (Python 백엔드 요청)
  SSE_STREAM: 600000, // 10분 (SSE 스트림 전체)
  SEGMENT_PROCESSING: 180000, // 3분 (세그먼트 하나 처리)
} as const

type KanPlatform = 'ept' | 'triton' | 'pokerstars' | 'wsop' | 'hustler'

const DEFAULT_PLATFORM: KanPlatform = 'ept'

const DB_PLATFORM_MAP: Record<KanPlatform, 'triton' | 'pokerstars' | 'wsop' | 'hustler'> = {
  ept: 'pokerstars',
  triton: 'triton',
  pokerstars: 'pokerstars',
  wsop: 'wsop',
  hustler: 'hustler',
}

const ANALYSIS_PLATFORM_MAP: Record<KanPlatform, 'ept' | 'triton'> = {
  ept: 'ept',
  pokerstars: 'ept',
  wsop: 'ept',
  triton: 'triton',
  hustler: 'triton',
}

export interface KanStartInput {
  videoUrl: string
  segments: TimeSegment[]
  players?: string[]
  streamId?: string // Stream (day) ID for linking hands
  platform?: KanPlatform
}

export interface KanStartResult {
  success: boolean
  jobId?: string
  streamId?: string // Created stream ID (if auto-created)
  error?: string
}

export interface KanAnalysisRequestInput {
  youtubeUrl: string
  tournamentId: string
  subEventId: string
  segmentType: 'full' | 'custom'
  startTime?: string // HH:MM:SS format
  endTime?: string // HH:MM:SS format
  players?: string[]
  platform?: KanPlatform
  createDraftStream?: boolean // Auto-create draft stream
  streamName?: string // Custom stream name
}

// Segment processing result
interface SegmentResult {
  segment_id: string
  segment_index: number
  status: 'success' | 'failed'
  hands_found?: number
  error?: string
  processing_time?: number
}

// Job result structure (stored in analysis_jobs.result)
interface JobResult {
  success: boolean
  segments_processed: number
  segments_failed: number
  segment_results: SegmentResult[]
  total_hands: number
  errors: string[]
}

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/**
 * Normalize player name for matching
 */
function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

/**
 * Format seconds to MM:SS timestamp format
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Find or create player in database
 */
async function findOrCreatePlayer(
  supabase: TypedSupabaseClient,
  name: string
): Promise<string> {
  const normalized = normalizePlayerName(name)

  // Try to find existing player
  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('normalized_name', normalized)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new player
  const { data: newPlayer, error } = await supabase
    .from('players')
    .insert({
      name,
      normalized_name: normalized,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create player: ${error.message}`)
  }

  return newPlayer.id
}

/**
 * Rate Limiting: 시간당 5개 분석 제한
 */
async function checkRateLimit(
  userId: string,
  supabase: TypedSupabaseClient
): Promise<{ allowed: boolean; error?: string }> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()

  const { data, error } = await supabase
    .from('analysis_jobs')
    .select('id')
    .eq('created_by', userId)
    .gte('created_at', oneHourAgo)

  if (error) {
    console.error('[KAN] Rate limit check failed')
    if (process.env.NODE_ENV === 'development') {
      console.error('[KAN] Error details:', error)
    }
    return { allowed: false, error: 'Rate limit 확인 실패' }
  }

  const requestCount = data?.length || 0
  const limit = 5 // 시간당 5개

  if (requestCount >= limit) {
    return {
      allowed: false,
      error: `시간당 최대 ${limit}개의 분석만 가능합니다. (현재: ${requestCount}/${limit})`,
    }
  }

  return { allowed: true }
}

/**
 * Check for duplicate analysis (same video + overlapping segments)
 */
async function checkDuplicateAnalysis(
  videoId: string,
  segments: TimeSegment[],
  supabase: TypedSupabaseClient
): Promise<{ isDuplicate: boolean; error?: string; existingJobId?: string }> {
  try {
    // Input validation
    if (!Array.isArray(segments) || segments.length === 0) {
      return { isDuplicate: false, error: 'Invalid segments array' }
    }

    // Validate each segment
    for (const seg of segments) {
      if (typeof seg.start !== 'number' || typeof seg.end !== 'number') {
        return { isDuplicate: false, error: 'Invalid segment format' }
      }
      if (seg.start < 0 || seg.end <= seg.start) {
        return { isDuplicate: false, error: 'Invalid segment range' }
      }
      if (seg.end - seg.start > 7200) { // Max 2 hours
        return { isDuplicate: false, error: 'Segment too long (max 2 hours)' }
      }
    }

    // Call RPC function to check for overlapping segments
    const { data, error } = await supabase.rpc('check_duplicate_analysis', {
      p_video_id: videoId,
      p_segments: segments as unknown as Record<string, unknown>[],
    })

    if (error) {
      console.error('[KAN] Duplicate check RPC failed')
      if (process.env.NODE_ENV === 'development') {
        console.error('[KAN] Error details:', error)
      }
      // Fail-Closed: Block analysis on DB error
      return {
        isDuplicate: false,
        error: '중복 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      }
    }

    if (data && data.length > 0) {
      const existingJob = data[0]
      return {
        isDuplicate: true,
        existingJobId: existingJob.job_id,
        error: `이미 ${existingJob.status === 'completed' ? '완료된' : '분석 중인'} 세그먼트가 포함되어 있습니다. (Job ID: ${existingJob.job_id})`,
      }
    }

    return { isDuplicate: false }
  } catch (error) {
    console.error('[KAN] Duplicate check exception')
    if (process.env.NODE_ENV === 'development') {
      console.error('[KAN] Exception details:', error)
    }
    // Fail-Closed: Block analysis on exception
    return {
      isDuplicate: false,
      error: '중복 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }
  }
}

/**
 * Store hands from segment to database using transactional RPC
 */
async function storeHandsFromSegment(
  supabase: TypedSupabaseClient,
  hands: KanHand[],
  streamId: string,
  jobId: string,
  segment: TimeSegment,
  startHandNumber: number
): Promise<{ success: number; failed: number; errors: string[] }> {
  let handNumber = startHandNumber
  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  if (process.env.NODE_ENV === 'development') {
    console.log(`[storeHands] Processing ${hands.length} hands for segment`)
  }

  for (const handData of hands) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[storeHands] Processing hand #${handData.handNumber || handNumber}`)
      }

      // Find or create players first (outside transaction)
      const playerIdMap = new Map<string, string>()

      if (handData.players) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[storeHands] Finding/creating ${handData.players.length} players`)
        }
        for (const playerData of handData.players) {
          const playerId = await findOrCreatePlayer(supabase, playerData.name)
          playerIdMap.set(playerData.name, playerId)
          if (process.env.NODE_ENV === 'development') {
            console.log(`[storeHands] Player ${playerData.name} -> ${playerId}`)
          }
        }
      }

      // Prepare players data for RPC
      const playersData: Record<string, unknown>[] = []
      if (handData.players) {
        for (const playerData of handData.players) {
          const playerId = playerIdMap.get(playerData.name)
          if (!playerId) continue

          const winner = handData.winners?.find((w) => w.name === playerData.name)

          let holeCardsArray: string[] | null = null
          if (playerData.holeCards) {
            if (Array.isArray(playerData.holeCards)) {
              holeCardsArray = playerData.holeCards
            } else if (typeof playerData.holeCards === 'string') {
              holeCardsArray = playerData.holeCards.split(/[\s,]+/).filter(Boolean)
            }
          }

          playersData.push({
            player_id: playerId,
            poker_position: playerData.position,
            starting_stack: playerData.stackSize || 0,
            ending_stack: playerData.stackSize || 0,
            hole_cards: holeCardsArray,
            cards: holeCardsArray ? holeCardsArray.join(' ') : null,
            final_amount: winner?.amount || 0,
            is_winner: !!winner,
            hand_description: winner?.hand || null,
          })
        }
      }

      // Prepare actions data for RPC
      const actionsData: Record<string, unknown>[] = []
      if (handData.actions) {
        for (let idx = 0; idx < handData.actions.length; idx++) {
          const action = handData.actions[idx]
          const playerId = playerIdMap.get(action.player)
          if (!playerId) continue

          actionsData.push({
            player_id: playerId,
            action_order: idx + 1,
            street: action.street.toLowerCase(),
            action_type: action.action.toLowerCase(),
            amount: action.amount || 0,
          })
        }
      }

      // Call RPC function to save hand transactionally
      console.log(`[storeHands] Calling RPC with ${playersData.length} players, ${actionsData.length} actions`)
      const { data: newHandId, error: rpcError } = await supabase.rpc(
        'save_hand_with_players_actions',
        {
          p_day_id: streamId,
          p_job_id: jobId,
          p_number: String(handData.handNumber || ++handNumber),
          p_description: handData.description || `Hand #${handData.handNumber || handNumber}`,
          p_timestamp: formatTimestamp(segment.start),
          p_video_timestamp_start: segment.start,
          p_video_timestamp_end: segment.end,
          p_stakes: handData.stakes || 'Unknown',
          p_board_flop: handData.board?.flop || [],
          p_board_turn: handData.board?.turn || null,
          p_board_river: handData.board?.river || null,
          p_pot_size: handData.pot || 0,
          p_raw_data: handData as unknown as Record<string, unknown>,
          p_players: playersData,
          p_actions: actionsData,
        }
      )

      if (rpcError) {
        console.error(`[storeHands] RPC error:`, rpcError)
        throw new Error(`RPC error: ${rpcError.message}`)
      }

      if (!newHandId) {
        console.error(`[storeHands] No hand ID returned from RPC`)
        throw new Error('No hand ID returned from RPC')
      }

      console.log(`[storeHands] Successfully saved hand with ID: ${newHandId}`)
      successCount++
    } catch (error) {
      failedCount++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Hand ${handData.handNumber || handNumber}: ${errorMsg}`)

      // Detailed error logging in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('[storeHands] Failed to save hand:', error)
        if (error instanceof Error && error.stack) {
          console.error('[storeHands] Stack trace:', error.stack)
        }
      } else {
        // Production: Log only essential info
        console.error(`[storeHands] Hand save failed: ${errorMsg}`)
      }
    }
  }

  return { success: successCount, failed: failedCount, errors }
}

/**
 * Start KAN video analysis job
 */
export async function startKanAnalysis(
  input: KanStartInput
): Promise<KanStartResult> {
  try {
    console.log('[KAN] startKanAnalysis called with input:', {
      videoUrl: input.videoUrl,
      segmentsCount: input.segments?.length || 0,
      streamId: input.streamId,
      platform: input.platform,
      playersCount: input.players?.length || 0,
    })

    // Check KAN_BACKEND_URL (환경 변수명은 HAE_BACKEND_URL로 유지)
    const backendUrl = process.env.HAE_BACKEND_URL
    if (!backendUrl) {
      console.error('[KAN] HAE_BACKEND_URL is not set')
      return {
        success: false,
        error: 'KAN 백엔드 URL이 설정되지 않았습니다. 환경 변수를 확인해주세요.',
      }
    }
    console.log('[KAN] Backend URL:', backendUrl)

    const supabase = await createServerSupabaseClient()

    // 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[KAN] Auth error:', authError)
      return { success: false, error: '로그인이 필요합니다' }
    }

    console.log('[KAN] User authenticated:', user.id)

    // Rate Limiting 체크
    console.log('[KAN] Checking rate limit...')
    const rateLimitCheck = await checkRateLimit(user.id, supabase)
    if (!rateLimitCheck.allowed) {
      console.warn('[KAN] Rate limit exceeded:', rateLimitCheck.error)
      return { success: false, error: rateLimitCheck.error }
    }
    console.log('[KAN] Rate limit check passed')

    // 권한 체크 (High Templar 이상)
    console.log('[KAN] Checking user permissions...')
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // 권한 체크: High Templar, Reporter, Admin만 허용
    const allowedRoles = ['high_templar', 'reporter', 'admin']

    if (profileError) {
      console.error('[KAN] Profile fetch error:', profileError)
      return {
        success: false,
        error: '사용자 정보를 불러오는데 실패했습니다.',
      }
    }

    if (!profile) {
      console.error('[KAN] No profile found for user:', user.id)
      return {
        success: false,
        error: '사용자 프로필을 찾을 수 없습니다.',
      }
    }

    console.log('[KAN] User role:', profile.role)

    const hasValidRole = allowedRoles.includes(profile.role)

    if (!hasValidRole) {
      console.warn('[KAN] Permission denied - insufficient role:', profile.role)
      return {
        success: false,
        error: `이 기능은 High Templar, Reporter, Admin 권한이 필요합니다. (현재 권한: ${profile.role})`,
      }
    }

    console.log('[KAN] Permission granted for user:', user.id)

    const selectedPlatform = input.platform || DEFAULT_PLATFORM
    const dbPlatform = DB_PLATFORM_MAP[selectedPlatform] ?? DB_PLATFORM_MAP[DEFAULT_PLATFORM]

    console.log('[KAN] Platform:', selectedPlatform, '-> DB Platform:', dbPlatform)

    // Extract video ID
    console.log('[KAN] Extracting video ID from:', input.videoUrl)
    const videoId = extractVideoId(input.videoUrl)
    if (!videoId) {
      console.error('[KAN] Invalid YouTube URL:', input.videoUrl)
      return {
        success: false,
        error: 'Invalid YouTube URL',
      }
    }
    console.log('[KAN] Video ID extracted:', videoId)

    // Filter only gameplay segments
    const gameplaySegments = input.segments.filter((s) => s.type === 'gameplay')

    console.log('[KAN] Total segments:', input.segments.length, '-> Gameplay segments:', gameplaySegments.length)

    if (gameplaySegments.length === 0) {
      console.error('[KAN] No gameplay segments provided')
      return {
        success: false,
        error: 'No gameplay segments provided',
      }
    }

    // Create or get video record
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id')
      .eq('youtube_id', videoId)
      .single()

    let dbVideoId: string

    if (!existingVideo) {
      const { data: newVideo, error: videoError } = await supabase
        .from('videos')
        .insert({
          url: input.videoUrl,
          youtube_id: videoId,
          platform: 'youtube',
          title: null,
          duration: null,
        })
        .select('id')
        .single()

      if (videoError || !newVideo) {
        return {
          success: false,
          error: `Failed to create video record: ${videoError?.message || 'Unknown error'}`,
        }
      }

      dbVideoId = newVideo.id
    } else {
      dbVideoId = existingVideo.id
    }

    // Check for duplicate analysis
    const duplicateCheck = await checkDuplicateAnalysis(dbVideoId, gameplaySegments, supabase)
    if (duplicateCheck.error) {
      // DB error or validation error - block analysis
      return { success: false, error: duplicateCheck.error }
    }
    if (duplicateCheck.isDuplicate) {
      return {
        success: false,
        error: duplicateCheck.error || `이미 완료된/분석 중인 세그먼트가 포함되어 있습니다 (작업 ID: ${duplicateCheck.existingJobId})`
      }
    }

    // Create analysis job
    console.log('[KAN] Creating analysis job...')
    console.log('[KAN] Job params:', {
      video_id: dbVideoId,
      stream_id: input.streamId,
      platform: dbPlatform,
      segments_count: gameplaySegments.length,
      ai_provider: 'gemini',
      submitted_players_count: input.players?.length || 0,
      created_by: user.id,
    })

    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .insert({
        video_id: dbVideoId,
        stream_id: input.streamId || null,
        platform: dbPlatform,
        status: 'pending',
        segments: gameplaySegments,
        progress: 0,
        ai_provider: 'gemini',
        submitted_players: input.players || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (jobError) {
      console.error('[KAN] Failed to create job:', jobError)
      return {
        success: false,
        error: `Failed to create analysis job: ${jobError.message}`,
      }
    }

    console.log('[KAN] Analysis job created:', job.id)

    // Start background processing (Python backend)
    console.log('[KAN] Starting background processing...')
    processKanJob(job.id, videoId, gameplaySegments, input.streamId, selectedPlatform).catch(
      (err) => {
        console.error('[KAN] Background processing error:', err)
      }
    )

    revalidatePath('/kan')

    console.log('[KAN] startKanAnalysis completed successfully, jobId:', job.id)
    return {
      success: true,
      jobId: job.id,
    }
  } catch (error) {
    console.error('[KAN] Start KAN error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Call Python backend with timeout
 */
async function callPythonBackend(params: AnalyzeVideoRequest): Promise<Response> {
  const backendUrl = process.env.HAE_BACKEND_URL || 'http://localhost:8000'

  // AbortController 생성
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, TIMEOUTS.BACKEND_REQUEST)

  try {
    const response = await fetch(`${backendUrl}/api/analyze-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal, // 타임아웃 신호 연결
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('백엔드 요청 타임아웃 (5분 초과)')
    }
    throw error
  }
}

/**
 * Process KAN job using Python backend
 */
async function processKanJob(
  jobId: string,
  youtubeId: string,
  segments: TimeSegment[],
  streamId?: string,
  platform: KanPlatform = DEFAULT_PLATFORM
) {
  const supabase = getServiceSupabaseClient()
  const startTime = Date.now()

  // Initialize result tracking
  const segmentResults: SegmentResult[] = []
  const globalErrors: string[] = []
  let totalHands = 0

  try {
    // Update job status to processing
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    // Ensure streamId exists (create default if not provided)
    let finalStreamId: string = streamId || ''
    if (!finalStreamId) {
      console.log('[KAN] No streamId provided, looking for existing "Unsorted Hands" stream')

      const existingStreamResult = await supabase
        .from('streams')
        .select('id')
        .eq('name', 'Unsorted Hands')
        .single()

      if (existingStreamResult.error) {
        console.error('[KAN] Error querying Unsorted Hands stream:', existingStreamResult.error)
      }

      if (existingStreamResult.data?.id) {
        finalStreamId = existingStreamResult.data.id
        console.log(`[KAN] Using existing "Unsorted Hands" stream: ${finalStreamId}`)
      } else {
        // Cannot create stream without streamId due to tournament_id NOT NULL constraint
        // User must provide streamId or create stream manually
        const errorMsg = 'No streamId provided and no "Unsorted Hands" stream found. Please provide a streamId or create an "Unsorted Hands" stream manually using the create-unsorted-stream.mjs script.'
        console.error(`[KAN] ${errorMsg}`)
        globalErrors.push(errorMsg)
        throw new Error(errorMsg)
      }
    }

    console.log(`[KAN] Using streamId: ${finalStreamId}`)

    // Full YouTube URL
    const fullYoutubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`
    const analysisPlatform = ANALYSIS_PLATFORM_MAP[platform] ?? ANALYSIS_PLATFORM_MAP[DEFAULT_PLATFORM]

    // Process each segment by calling Python backend
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const segmentStartTime = Date.now()
      const segmentId = `seg_${i}_${segment.start}_${segment.end}`

      // Initialize segment result
      const segmentResult: SegmentResult = {
        segment_id: segmentId,
        segment_index: i,
        status: 'failed', // Default to failed, will be updated on success
      }

      try {
        // Update progress - base progress for completed segments
        const segmentWeight = 100 / segments.length
        const baseProgress = Math.round(i * segmentWeight)
        await supabase
          .from('analysis_jobs')
          .update({ progress: Math.min(baseProgress, 99) })
          .eq('id', jobId)

        console.log(`[KAN] Processing segment ${i + 1}/${segments.length}: ${segment.start}s - ${segment.end}s`)
        console.log(`[KAN] Backend URL: ${process.env.HAE_BACKEND_URL || 'http://localhost:8000'}`)
        console.log(`[KAN] Calling with: ${fullYoutubeUrl}, platform: ${analysisPlatform}`)

        // 전체 실행 시간 체크
        if (Date.now() - startTime > TIMEOUTS.SSE_STREAM) {
          throw new Error('분석 타임아웃 (10분 초과)')
        }

        // Call Python backend with timeout
        const response = await callPythonBackend({
          youtubeUrl: fullYoutubeUrl,
          startTime: segment.start,
          endTime: segment.end,
          platform: analysisPlatform,
        })

        console.log(`[KAN] Backend response status: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          console.error(`[KAN] Backend error for segment ${i}:`, response.status, response.statusText)
          const errorText = await response.text().catch(() => 'Unable to read error response')
          console.error(`[KAN] Error details:`, errorText)
          segmentResult.error = `Backend error: ${response.statusText} - ${errorText}`
          continue
        }

        // Parse SSE stream from Python backend
        const reader = response.body?.getReader()
        if (!reader) {
          console.error('[KAN] No response body reader')
          await response.body?.cancel() // Clean up stream
          continue
        }

        try {
          const decoder = new TextDecoder()
          let buffer = ''
          let analysisResult: KanAnalysisResult | null = null

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const events = buffer.split('\n\n')
            buffer = events.pop() || ''

            for (const event of events) {
              if (!event.trim()) continue

              const lines = event.split('\n')
              let eventType: SSEEventType | '' = ''
              let data = ''

              for (const line of lines) {
                if (line.startsWith('event:')) {
                  eventType = line.substring(6).trim() as SSEEventType
                } else if (line.startsWith('data:')) {
                  data = line.substring(5).trim()
                }
              }

              if (eventType && data) {
                try {
                  const parsed: SSEEventData = JSON.parse(data)

                  if (eventType === 'progress') {
                    const progressData = parsed as SSEProgressEvent
                    // Calculate accurate progress: base (completed segments) + current segment progress
                    const segmentWeight = 100 / segments.length
                    const baseProgress = i * segmentWeight
                    const currentSegmentProgress = (progressData.percent / 100) * segmentWeight
                    const overallProgress = Math.min(
                      Math.round(baseProgress + currentSegmentProgress),
                      99 // Keep at 99% until truly complete
                    )
                    await supabase
                      .from('analysis_jobs')
                      .update({ progress: overallProgress })
                      .eq('id', jobId)
                  } else if (eventType === 'complete') {
                    const completeData = parsed as SSECompleteEvent
                    if (completeData.hands) {
                      analysisResult = { hands: completeData.hands }
                    }
                    console.log(
                      `[KAN] Segment ${i} complete: ${completeData.hands?.length || 0} hands`
                    )
                  } else if (eventType === 'error') {
                    console.error(`[KAN] Segment ${i} error:`, parsed)
                  }
                } catch (e) {
                  console.error('[KAN] Failed to parse SSE event:', e)
                }
              }
            }
          }

          // Store hands from this segment
          if (analysisResult && analysisResult.hands && analysisResult.hands.length > 0) {
            console.log(`[KAN] Storing ${analysisResult.hands.length} hands from segment ${i}`)
            console.log(`[KAN] Stream ID: ${finalStreamId}, Job ID: ${jobId}`)
            const storeResult = await storeHandsFromSegment(
              supabase,
              analysisResult.hands,
              finalStreamId,
              jobId,
              segment,
              totalHands
            )
            console.log(`[KAN] Store result: ${storeResult.success} successful, ${storeResult.failed} failed`)
            if (storeResult.errors.length > 0) {
              console.error(`[KAN] Store errors:`, storeResult.errors)
            }

            // Update totalHands ONCE and immediately update DB for realtime feedback
            totalHands += storeResult.success
            await supabase
              .from('analysis_jobs')
              .update({ hands_found: totalHands })
              .eq('id', jobId)

            // Update segment result with storage results
            const currentSegmentResult: SegmentResult = {
              segment_id: segmentId,
              segment_index: i,
              status: 'success',
              hands_found: storeResult.success,
              processing_time: Math.round((Date.now() - segmentStartTime) / 1000),
            }

            if (storeResult.failed > 0) {
              currentSegmentResult.error = `${storeResult.failed} hands failed to save: ${storeResult.errors.join('; ')}`
              globalErrors.push(...storeResult.errors)
            }

            segmentResults.push(currentSegmentResult)
          } else {
            // No hands found
            segmentResult.status = 'success'
            segmentResult.hands_found = 0
            segmentResult.processing_time = Math.round((Date.now() - segmentStartTime) / 1000)
            segmentResults.push(segmentResult)
          }
        } finally {
          reader.releaseLock() // 메모리 누수 방지
        }
      } catch (segmentError) {
        console.error(`[KAN] Error processing segment ${i}:`, segmentError)

        // Record segment failure
        segmentResult.status = 'failed'
        segmentResult.error = segmentError instanceof Error ? segmentError.message : 'Unknown error'
        segmentResult.processing_time = Math.round((Date.now() - segmentStartTime) / 1000)
        segmentResults.push(segmentResult)
        globalErrors.push(`Segment ${i}: ${segmentResult.error}`)

        // Continue processing next segment (don't throw)
      }
    }

    // Calculate final statistics
    const segmentsProcessed = segmentResults.filter((r) => r.status === 'success').length
    const segmentsFailed = segmentResults.filter((r) => r.status === 'failed').length
    const jobSuccess = segmentsFailed === 0

    // Build result object
    const jobResult: JobResult = {
      success: jobSuccess,
      segments_processed: segmentsProcessed,
      segments_failed: segmentsFailed,
      segment_results: segmentResults,
      total_hands: totalHands,
      errors: globalErrors,
    }

    // Mark job as completed (even if some segments failed)
    await supabase
      .from('analysis_jobs')
      .update({
        status: segmentsFailed === segments.length ? 'failed' : 'completed',
        progress: 100,
        hands_found: totalHands,
        result: jobResult as unknown as Record<string, unknown>,
        completed_at: new Date().toISOString(),
        processing_time: Math.round((Date.now() - startTime) / 1000),
      })
      .eq('id', jobId)

    console.log(
      `[KAN] Job ${jobId} completed: ${segmentsProcessed}/${segments.length} segments successful, ${totalHands} hands saved`
    )
  } catch (error) {
    console.error('KAN job processing error:', error)

    // 타임아웃 에러 구분
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      if (error.message.includes('타임아웃')) {
        errorMessage = error.message
      } else {
        errorMessage = `분석 실패: ${error.message}`
      }
    }

    globalErrors.push(errorMessage)

    // Build failure result
    const failureResult: JobResult = {
      success: false,
      segments_processed: segmentResults.filter((r) => r.status === 'success').length,
      segments_failed: segmentResults.filter((r) => r.status === 'failed').length + 1,
      segment_results: segmentResults,
      total_hands: totalHands,
      errors: globalErrors,
    }

    // Mark job as failed
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        result: failureResult as unknown as Record<string, unknown>,
        completed_at: new Date().toISOString(),
        processing_time: Math.round((Date.now() - startTime) / 1000),
      })
      .eq('id', jobId)
  }
}

/**
 * Get KAN job status
 */
export async function getKanJob(jobId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Create KAN analysis request with auto-generated draft stream
 * Used by admin KAN management pages
 */
export async function createKanAnalysisRequest(
  input: KanAnalysisRequestInput
): Promise<KanStartResult> {
  try {
    const supabase = await createServerSupabaseClient()

    // 인증 및 권한 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: '로그인이 필요합니다' }
    }

    // 권한 체크
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['high_templar', 'reporter', 'admin']
    if (profileError || !profile || !allowedRoles.includes(profile.role)) {
      return {
        success: false,
        error: 'KAN 분석 권한이 없습니다 (High Templar 이상 필요)',
      }
    }

    // Rate Limiting
    const rateLimitCheck = await checkRateLimit(user.id, supabase)
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error }
    }

    // Extract video ID
    const videoId = extractVideoId(input.youtubeUrl)
    if (!videoId) {
      return { success: false, error: 'Invalid YouTube URL' }
    }

    // Create or get video record
    const { data: existingVideo } = await supabase
      .from('videos')
      .select('id')
      .eq('youtube_id', videoId)
      .single()

    let dbVideoId: string
    if (!existingVideo) {
      const { data: newVideo, error: videoError } = await supabase
        .from('videos')
        .insert({
          url: input.youtubeUrl,
          youtube_id: videoId,
          platform: 'youtube',
        })
        .select('id')
        .single()

      if (videoError || !newVideo) {
        return {
          success: false,
          error: `Failed to create video record: ${videoError?.message}`,
        }
      }
      dbVideoId = newVideo.id
    } else {
      dbVideoId = existingVideo.id
    }

    // Create draft stream if requested
    let streamId = input.createDraftStream
      ? undefined
      : undefined // Will be created below

    if (input.createDraftStream) {
      const streamName = input.streamName || `KAN Analysis - ${new Date().toLocaleDateString()}`

      const { data: newStream, error: streamError } = await supabase
        .from('streams')
        .insert({
          tournament_id: input.tournamentId,
          sub_event_id: input.subEventId,
          name: streamName,
          video_url: input.youtubeUrl,
          video_source: 'youtube',
          status: 'draft',
        })
        .select('id')
        .single()

      if (streamError || !newStream) {
        return {
          success: false,
          error: `Failed to create draft stream: ${streamError?.message}`,
        }
      }

      streamId = newStream.id
    }

    // Convert time strings to segments
    let segments: TimeSegment[] = []

    if (input.segmentType === 'full') {
      // Full video - use default full segment
      segments = [
        {
          id: 'full',
          type: 'gameplay',
          start: 0,
          end: 3600, // Default 1 hour, will be adjusted by backend
          label: 'Full Video',
        },
      ]
    } else if (input.startTime && input.endTime) {
      // Custom segment
      const start = timeStringToSeconds(input.startTime)
      const end = timeStringToSeconds(input.endTime)

      if (start >= end) {
        return { success: false, error: '시작 시간이 종료 시간보다 늦습니다' }
      }

      segments = [
        {
          id: 'custom',
          type: 'gameplay',
          start,
          end,
          label: 'Custom Segment',
        },
      ]
    } else {
      return {
        success: false,
        error: '세그먼트 정보가 올바르지 않습니다',
      }
    }

    // Start KAN analysis
    const result = await startKanAnalysis({
      videoUrl: input.youtubeUrl,
      segments,
      players: input.players,
      streamId,
      platform: input.platform,
    })

    if (!result.success) {
      return result
    }

    return {
      success: true,
      jobId: result.jobId,
      streamId,
    }
  } catch (error) {
    console.error('[createKanAnalysisRequest] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Helper: Convert HH:MM:SS to seconds
 */
function timeStringToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}
