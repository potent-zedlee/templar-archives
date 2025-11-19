'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getHandThumbnailUrl } from '@/lib/thumbnail-utils'

// Typed Supabase Client
type TypedSupabaseClient = SupabaseClient<Database>

type KanPlatform = 'ept' | 'triton' | 'pokerstars' | 'wsop' | 'hustler'

const DEFAULT_PLATFORM: KanPlatform = 'ept'

const DB_PLATFORM_MAP: Record<KanPlatform, 'triton' | 'pokerstars' | 'wsop' | 'hustler'> = {
  ept: 'pokerstars',
  triton: 'triton',
  pokerstars: 'pokerstars',
  wsop: 'wsop',
  hustler: 'hustler',
}

// KAN Backend Types (inlined to avoid circular dependencies)
interface KanHand {
  handNumber: number
  description: string
  stakes: string
  small_blind?: number
  big_blind?: number
  ante?: number
  pot: number
  pot_preflop?: number
  pot_flop?: number
  pot_turn?: number
  pot_river?: number
  players: KanPlayer[]
  board: {
    flop: string[]
    turn: string | null
    river: string | null
  }
  winners: KanWinner[]
  actions: KanAction[]
}

interface KanPlayer {
  name: string
  position: string
  stackSize: number
  holeCards?: string[] | string
}

interface KanWinner {
  name: string
  amount: number
  hand?: string
}

interface KanAction {
  player: string
  action: string
  amount?: number
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
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

// Segment processing result (Currently unused, reserved for future multi-segment support)
// interface SegmentResult {
//   segment_id: string
//   segment_index: number
//   status: 'success' | 'failed'
//   hands_found?: number
//   error?: string
//   processing_time?: number
// }

// Job result structure (stored in analysis_jobs.result) - Currently unused
// interface JobResult {
//   success: boolean
//   segments_processed: number
//   segments_failed: number
//   segment_results: SegmentResult[]
//   total_hands: number
//   errors: string[]
// }

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
      // KAN 백엔드가 자동으로 1시간씩 세그먼트 분할 처리하므로
      // 프론트엔드에서는 10시간까지 허용 (대부분의 포커 영상 커버)
      if (seg.end - seg.start > 36000) { // Max 10 hours
        return { isDuplicate: false, error: 'Segment too long (max 10 hours)' }
      }
    }

    // Call RPC function to check for overlapping segments
    const { data, error } = await supabase.rpc('check_duplicate_analysis', {
      p_video_id: videoId,
      p_segments: JSON.parse(JSON.stringify(segments)),
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
 * (Currently unused - reserved for future multi-segment support)
 */
// async function storeHandsFromSegment(
//   supabase: TypedSupabaseClient,
//   hands: KanHand[],
//   streamId: string,
//   jobId: string,
//   segment: TimeSegment,
//   startHandNumber: number
// ): Promise<{ success: number; failed: number; errors: string[] }> {
//   let handNumber = startHandNumber
//   let successCount = 0
//   let failedCount = 0
//   const errors: string[] = []
//
//   if (process.env.NODE_ENV === 'development') {
//     console.log(`[storeHands] Processing ${hands.length} hands for segment`)
//   }
//
//   // Fetch stream info once for thumbnail URL generation
//   const { data: streamData } = await supabase
//     .from('streams')
//     .select('video_url, video_source')
//     .eq('id', streamId)
//     .single()
//
//   const thumbnailUrl = streamData
//     ? getHandThumbnailUrl(
//         streamData.video_url || undefined,
//         (streamData.video_source as 'youtube' | 'upload' | 'nas' | undefined) || undefined
//       )
//     : null
//
//   if (process.env.NODE_ENV === 'development') {
//     console.log(`[storeHands] Thumbnail URL for stream ${streamId}:`, thumbnailUrl)
//   }
//
//   for (const handData of hands) {
//     try {
//       if (process.env.NODE_ENV === 'development') {
//         console.log(`[storeHands] Processing hand #${handData.handNumber || handNumber}`)
//       }
//
//       // Find or create players first (outside transaction)
//       const playerIdMap = new Map<string, string>()
//
//       if (handData.players) {
//         if (process.env.NODE_ENV === 'development') {
//           console.log(`[storeHands] Finding/creating ${handData.players.length} players`)
//         }
//         for (const playerData of handData.players) {
//           const playerId = await findOrCreatePlayer(supabase, playerData.name)
//           playerIdMap.set(playerData.name, playerId)
//           if (process.env.NODE_ENV === 'development') {
//             console.log(`[storeHands] Player ${playerData.name} -> ${playerId}`)
//           }
//         }
//       }
//
//       // Prepare players data for RPC
//       const playersData: Record<string, unknown>[] = []
//       if (handData.players) {
//         for (const playerData of handData.players) {
//           const playerId = playerIdMap.get(playerData.name)
//           if (!playerId) continue
//
//           const winner = handData.winners?.find((w) => w.name === playerData.name)
//
//           let holeCardsArray: string[] | null = null
//           if (playerData.holeCards) {
//             if (Array.isArray(playerData.holeCards)) {
//               holeCardsArray = playerData.holeCards
//             } else if (typeof playerData.holeCards === 'string') {
//               holeCardsArray = playerData.holeCards.split(/[\s,]+/).filter(Boolean)
//             }
//           }
//
//           playersData.push({
//             player_id: playerId,
//             poker_position: playerData.position,
//             starting_stack: playerData.stackSize || 0,
//             ending_stack: playerData.stackSize || 0,
//             hole_cards: holeCardsArray,
//             cards: holeCardsArray ? holeCardsArray.join(' ') : null,
//             final_amount: winner?.amount || 0,
//             is_winner: !!winner,
//             hand_description: winner?.hand || null,
//           })
//         }
//       }
//
//       // Prepare actions data for RPC
//       const actionsData: Record<string, unknown>[] = []
//       if (handData.actions) {
//         for (let idx = 0; idx < handData.actions.length; idx++) {
//           const action = handData.actions[idx]
//           const playerId = playerIdMap.get(action.player)
//           if (!playerId) continue
//
//           actionsData.push({
//             player_id: playerId,
//             action_order: idx + 1,
//             street: action.street.toLowerCase(),
//             action_type: action.action.toLowerCase(),
//             amount: action.amount || 0,
//           })
//         }
//       }
//
//       // Call RPC function to save hand transactionally
//       console.log(`[storeHands] Calling RPC with ${playersData.length} players, ${actionsData.length} actions`)
//       const { data: newHandId, error: rpcError } = await supabase.rpc(
//         'save_hand_with_players_actions',
//         {
//           p_day_id: streamId,
//           p_job_id: jobId,
//           p_number: String(handData.handNumber || ++handNumber),
//           p_description: handData.description || `Hand #${handData.handNumber || handNumber}`,
//           p_timestamp: formatTimestamp(segment.start),
//           p_video_timestamp_start: segment.start,
//           p_video_timestamp_end: segment.end,
//           p_stakes: handData.stakes || 'Unknown',
//           p_board_flop: handData.board?.flop || [],
//           p_board_turn: handData.board?.turn || '',
//           p_board_river: handData.board?.river || '',
//           p_pot_size: handData.pot || 0,
//           p_raw_data: JSON.parse(JSON.stringify(handData)),
//           // Players and actions (required params)
//           p_players: JSON.parse(JSON.stringify(playersData)),
//           p_actions: JSON.parse(JSON.stringify(actionsData)),
//           // NEW: Blind information (optional params)
//           p_small_blind: handData.small_blind || null,
//           p_big_blind: handData.big_blind || null,
//           p_ante: handData.ante || 0,
//           // NEW: Street-specific pot sizes (optional params)
//           p_pot_preflop: handData.pot_preflop || null,
//           p_pot_flop: handData.pot_flop || null,
//           p_pot_turn: handData.pot_turn || null,
//           p_pot_river: handData.pot_river || null,
//           // NEW: Thumbnail URL (Phase 3)
//           p_thumbnail_url: thumbnailUrl || '',
//         }
//       )
//
//       if (rpcError) {
//         console.error(`[storeHands] RPC error:`, rpcError)
//         throw new Error(`RPC error: ${rpcError.message}`)
//       }
//
//       if (!newHandId) {
//         console.error(`[storeHands] No hand ID returned from RPC`)
//         throw new Error('No hand ID returned from RPC')
//       }
//
//       console.log(`[storeHands] Successfully saved hand with ID: ${newHandId}`)
//       successCount++
//     } catch (error) {
//       failedCount++
//       const errorMsg = error instanceof Error ? error.message : 'Unknown error'
//       errors.push(`Hand ${handData.handNumber || handNumber}: ${errorMsg}`)
//
//       // Detailed error logging in development only
//       if (process.env.NODE_ENV === 'development') {
//         console.error('[storeHands] Failed to save hand:', error)
//         if (error instanceof Error && error.stack) {
//           console.error('[storeHands] Stack trace:', error.stack)
//         }
//       } else {
//         // Production: Log only essential info
//         console.error(`[storeHands] Hand save failed: ${errorMsg}`)
//       }
//     }
//   }
//
//   return { success: successCount, failed: failedCount, errors }
// }

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

    // Check KHALAI_ARCHIVE_NETWORK_URL
    const backendUrl = process.env.KHALAI_ARCHIVE_NETWORK_URL
    if (!backendUrl) {
      console.error('[KAN] KHALAI_ARCHIVE_NETWORK_URL is not set')
      return {
        success: false,
        error: 'Khalai Archive Network 백엔드 URL이 설정되지 않았습니다. 환경 변수를 확인해주세요.',
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

    // Job created and enqueued for processing
    // KAN Backend will pick up this job via Supabase polling
    console.log('[KAN] Job enqueued for background processing')
    console.log('[KAN] KAN Backend worker will detect and process this job')

    revalidatePath('/kan')

    console.log('[KAN] startKanAnalysis completed, jobId:', job.id)
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
          sub_event_id: input.subEventId,
          name: streamName,
          video_url: input.youtubeUrl,
          video_source: 'youtube',
          status: 'draft',
          is_organized: false,
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
