'use server'

import { adminAuth, adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'
import { getHandThumbnailUrl } from '@/lib/thumbnail-utils'
import { cookies } from 'next/headers'
import { FieldValue } from 'firebase-admin/firestore'

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
 * Verify user authentication from session cookie
 */
async function verifyAuth(): Promise<{ userId: string } | { error: string }> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return { error: '로그인이 필요합니다' }
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie)
    return { userId: decodedToken.uid }
  } catch (error) {
    console.error('[KAN] Auth verification failed:', error)
    return { error: '인증에 실패했습니다' }
  }
}

/**
 * Find or create player in database
 */
async function findOrCreatePlayer(name: string): Promise<string> {
  const normalized = normalizePlayerName(name)

  // Try to find existing player
  const playersRef = adminFirestore.collection(COLLECTION_PATHS.PLAYERS)
  const existingQuery = await playersRef
    .where('normalized_name', '==', normalized)
    .limit(1)
    .get()

  if (!existingQuery.empty) {
    return existingQuery.docs[0].id
  }

  // Create new player
  const newPlayerRef = playersRef.doc()
  await newPlayerRef.set({
    name,
    normalized_name: normalized,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  })

  return newPlayerRef.id
}

/**
 * Rate Limiting: 시간당 5개 분석 제한
 */
async function checkRateLimit(
  userId: string
): Promise<{ allowed: boolean; error?: string }> {
  const oneHourAgo = new Date(Date.now() - 3600000)

  const jobsRef = adminFirestore.collection('analysisJobs')
  const recentJobs = await jobsRef
    .where('created_by', '==', userId)
    .where('created_at', '>=', oneHourAgo)
    .get()

  const requestCount = recentJobs.size
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
  segments: TimeSegment[]
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

    // Find jobs for this video
    const jobsRef = adminFirestore.collection('analysisJobs')
    const existingJobs = await jobsRef
      .where('video_id', '==', videoId)
      .where('status', 'in', ['pending', 'processing', 'completed'])
      .get()

    // Check for overlapping segments
    for (const jobDoc of existingJobs.docs) {
      const jobData = jobDoc.data()
      const existingSegments = jobData.segments as TimeSegment[] || []

      for (const newSeg of segments) {
        for (const existingSeg of existingSegments) {
          // Check overlap: new segment overlaps if it starts before existing ends AND ends after existing starts
          const overlaps = newSeg.start < existingSeg.end && newSeg.end > existingSeg.start
          if (overlaps) {
            return {
              isDuplicate: true,
              existingJobId: jobDoc.id,
              error: `이미 ${jobData.status === 'completed' ? '완료된' : '분석 중인'} 세그먼트가 포함되어 있습니다. (Job ID: ${jobDoc.id})`,
            }
          }
        }
      }
    }

    return { isDuplicate: false }
  } catch (error) {
    console.error('[KAN] Duplicate check exception:', error)
    return {
      isDuplicate: false,
      error: '중복 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }
  }
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

    // 인증 확인
    const authResult = await verifyAuth()
    if ('error' in authResult) {
      return { success: false, error: authResult.error }
    }
    const userId = authResult.userId
    console.log('[KAN] User authenticated:', userId)

    // Rate Limiting 체크
    console.log('[KAN] Checking rate limit...')
    const rateLimitCheck = await checkRateLimit(userId)
    if (!rateLimitCheck.allowed) {
      console.warn('[KAN] Rate limit exceeded:', rateLimitCheck.error)
      return { success: false, error: rateLimitCheck.error }
    }
    console.log('[KAN] Rate limit check passed')

    // 권한 체크 (High Templar 이상)
    console.log('[KAN] Checking user permissions...')
    const userDoc = await adminFirestore.collection(COLLECTION_PATHS.USERS).doc(userId).get()

    if (!userDoc.exists) {
      console.error('[KAN] No profile found for user:', userId)
      return {
        success: false,
        error: '사용자 프로필을 찾을 수 없습니다.',
      }
    }

    const userData = userDoc.data()
    const userRole = userData?.role

    console.log('[KAN] User role:', userRole)

    // 권한 체크: High Templar, Reporter, Admin만 허용
    const allowedRoles = ['high_templar', 'reporter', 'admin']
    const hasValidRole = userRole ? allowedRoles.includes(userRole) : false

    if (!hasValidRole) {
      console.warn('[KAN] Permission denied - insufficient role:', userRole)
      return {
        success: false,
        error: `이 기능은 High Templar, Reporter, Admin 권한이 필요합니다. (현재 권한: ${userRole})`,
      }
    }

    console.log('[KAN] Permission granted for user:', userId)

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
    const videosRef = adminFirestore.collection('videos')
    const existingVideoQuery = await videosRef
      .where('youtube_id', '==', videoId)
      .limit(1)
      .get()

    let dbVideoId: string

    if (existingVideoQuery.empty) {
      const newVideoRef = videosRef.doc()
      await newVideoRef.set({
        url: input.videoUrl,
        youtube_id: videoId,
        platform: 'youtube',
        title: null,
        duration: null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      })
      dbVideoId = newVideoRef.id
    } else {
      dbVideoId = existingVideoQuery.docs[0].id
    }

    // Check for duplicate analysis
    const duplicateCheck = await checkDuplicateAnalysis(dbVideoId, gameplaySegments)
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
      created_by: userId,
    })

    const jobsRef = adminFirestore.collection('analysisJobs')
    const newJobRef = jobsRef.doc()

    await newJobRef.set({
      video_id: dbVideoId,
      stream_id: input.streamId || null,
      platform: dbPlatform,
      status: 'pending',
      segments: gameplaySegments,
      progress: 0,
      ai_provider: 'gemini',
      submitted_players: input.players || null,
      created_by: userId,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    })

    const jobId = newJobRef.id
    console.log('[KAN] Analysis job created:', jobId)

    // Job created and enqueued for processing
    // KAN Backend will pick up this job via Firestore polling
    console.log('[KAN] Job enqueued for background processing')
    console.log('[KAN] KAN Backend worker will detect and process this job')

    revalidatePath('/kan')

    console.log('[KAN] startKanAnalysis completed, jobId:', jobId)
    return {
      success: true,
      jobId,
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
  // 인증 확인
  const authResult = await verifyAuth()
  if ('error' in authResult) {
    return null
  }

  const jobDoc = await adminFirestore.collection('analysisJobs').doc(jobId).get()

  if (!jobDoc.exists) {
    return null
  }

  return { id: jobDoc.id, ...jobDoc.data() }
}

/**
 * Save hands from completed KAN job to database
 */
export async function saveHandsFromJob(jobId: string): Promise<{ success: boolean; saved: number; error?: string }> {
  try {
    console.log('[saveHandsFromJob] Starting for job:', jobId)

    // 인증 확인
    const authResult = await verifyAuth()
    if ('error' in authResult) {
      return { success: false, saved: 0, error: authResult.error }
    }

    // Get job data
    const jobDoc = await adminFirestore.collection('analysisJobs').doc(jobId).get()

    if (!jobDoc.exists) {
      return { success: false, saved: 0, error: 'Job not found' }
    }

    const job = jobDoc.data()

    // Check if stream_id exists
    if (!job?.stream_id) {
      return { success: false, saved: 0, error: 'No stream_id associated with this job' }
    }

    const streamId = job.stream_id

    // Check if hands data exists in result
    const jobResult = job.result as Record<string, unknown> | null
    if (!jobResult || !jobResult.hands || !Array.isArray(jobResult.hands)) {
      return { success: false, saved: 0, error: 'No hands data in job result' }
    }

    const hands = jobResult.hands as KanHand[]
    console.log(`[saveHandsFromJob] Found ${hands.length} hands in job result`)

    // Get stream info for thumbnail
    const streamDoc = await adminFirestore.collection(COLLECTION_PATHS.STREAMS).doc(streamId).get()
    const streamData = streamDoc.data()

    const thumbnailUrl = streamData
      ? getHandThumbnailUrl(
          streamData.video_url || undefined,
          (streamData.video_source as 'youtube' | 'upload' | 'nas' | undefined) || undefined
        )
      : null

    let savedCount = 0
    const errors: string[] = []

    // Save each hand using batch writes
    const batch = adminFirestore.batch()
    const handsRef = adminFirestore.collection(COLLECTION_PATHS.HANDS)

    for (const handData of hands) {
      try {
        // Find or create players
        const playerIdMap = new Map<string, string>()

        if (handData.players) {
          for (const playerData of handData.players) {
            const playerId = await findOrCreatePlayer(playerData.name)
            playerIdMap.set(playerData.name, playerId)
          }
        }

        // Prepare players data (embedded in hand document)
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

        // Prepare actions data (embedded in hand document)
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

        // Get segment start time from job segments (use first segment)
        const jobSegments = job.segments as TimeSegment[] | null
        const segment = jobSegments?.[0]
        const videoTimestampStart = segment?.start || 0

        // Create hand document
        const handRef = handsRef.doc()
        batch.set(handRef, {
          day_id: streamId,
          job_id: jobId,
          number: String(handData.handNumber || savedCount + 1),
          description: handData.description || `Hand #${handData.handNumber || savedCount + 1}`,
          timestamp: formatTimestamp(videoTimestampStart),
          video_timestamp_start: videoTimestampStart,
          video_timestamp_end: videoTimestampStart + 300, // Default 5 minutes
          stakes: handData.stakes || 'Unknown',
          board_flop: handData.board?.flop || [],
          board_turn: handData.board?.turn || '',
          board_river: handData.board?.river || '',
          pot_size: handData.pot || 0,
          raw_data: handData,
          players: playersData,
          actions: actionsData,
          small_blind: handData.small_blind || null,
          big_blind: handData.big_blind || null,
          ante: handData.ante || 0,
          pot_preflop: handData.pot_preflop || null,
          pot_flop: handData.pot_flop || null,
          pot_turn: handData.pot_turn || null,
          pot_river: handData.pot_river || null,
          thumbnail_url: thumbnailUrl || '',
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        })

        savedCount++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Hand ${handData.handNumber}: ${errorMsg}`)
      }
    }

    // Commit batch
    await batch.commit()

    console.log(`[saveHandsFromJob] Saved ${savedCount}/${hands.length} hands`)

    return {
      success: savedCount > 0,
      saved: savedCount,
      error: errors.length > 0 ? errors.join('; ') : undefined
    }
  } catch (error) {
    console.error('[saveHandsFromJob] Error:', error)
    return {
      success: false,
      saved: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create KAN analysis request with auto-generated draft stream
 * Used by admin KAN management pages
 */
export async function createKanAnalysisRequest(
  input: KanAnalysisRequestInput
): Promise<KanStartResult> {
  try {
    // 인증 확인
    const authResult = await verifyAuth()
    if ('error' in authResult) {
      return { success: false, error: authResult.error }
    }
    const userId = authResult.userId

    // 권한 체크
    const userDoc = await adminFirestore.collection(COLLECTION_PATHS.USERS).doc(userId).get()
    const userData = userDoc.data()
    const userRole = userData?.role

    const allowedRoles = ['high_templar', 'reporter', 'admin']
    if (!userRole || !allowedRoles.includes(userRole)) {
      return {
        success: false,
        error: 'KAN 분석 권한이 없습니다 (High Templar 이상 필요)',
      }
    }

    // Rate Limiting
    const rateLimitCheck = await checkRateLimit(userId)
    if (!rateLimitCheck.allowed) {
      return { success: false, error: rateLimitCheck.error }
    }

    // Extract video ID
    const videoId = extractVideoId(input.youtubeUrl)
    if (!videoId) {
      return { success: false, error: 'Invalid YouTube URL' }
    }

    // Create or get video record
    const videosRef = adminFirestore.collection('videos')
    const existingVideoQuery = await videosRef
      .where('youtube_id', '==', videoId)
      .limit(1)
      .get()

    // Create video record if not exists (required for analysis tracking)
    if (existingVideoQuery.empty) {
      const newVideoRef = videosRef.doc()
      await newVideoRef.set({
        url: input.youtubeUrl,
        youtube_id: videoId,
        platform: 'youtube',
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      })
    }

    // Create draft stream if requested
    let streamId: string | undefined = undefined

    if (input.createDraftStream) {
      const streamName = input.streamName || `KAN Analysis - ${new Date().toLocaleDateString()}`

      const streamsRef = adminFirestore.collection(COLLECTION_PATHS.STREAMS)
      const newStreamRef = streamsRef.doc()

      await newStreamRef.set({
        sub_event_id: input.subEventId,
        name: streamName,
        video_url: input.youtubeUrl,
        video_source: 'youtube',
        status: 'draft',
        is_organized: false,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      })

      streamId = newStreamRef.id
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
