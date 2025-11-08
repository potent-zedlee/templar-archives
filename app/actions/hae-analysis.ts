'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getServiceSupabaseClient } from '@/lib/supabase-service'
import { generateHandSummary } from '@/lib/ai/gemini'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'

type HaePlatform = 'ept' | 'triton' | 'pokerstars' | 'wsop' | 'hustler'

const DEFAULT_PLATFORM: HaePlatform = 'ept'

const DB_PLATFORM_MAP: Record<HaePlatform, 'triton' | 'pokerstars' | 'wsop' | 'hustler'> = {
  ept: 'pokerstars',
  triton: 'triton',
  pokerstars: 'pokerstars',
  wsop: 'wsop',
  hustler: 'hustler',
}

const ANALYSIS_PLATFORM_MAP: Record<HaePlatform, 'ept' | 'triton'> = {
  ept: 'ept',
  pokerstars: 'ept',
  wsop: 'ept',
  triton: 'triton',
  hustler: 'triton',
}

export interface HaeStartInput {
  videoUrl: string
  segments: TimeSegment[]
  players?: string[]
  streamId?: string // Stream (day) ID for linking hands
  platform?: HaePlatform
}

export interface HaeStartResult {
  success: boolean
  jobId?: string
  error?: string
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
async function findOrCreatePlayer(supabase: any, name: string): Promise<string> {
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
 * Start HAE video analysis job
 */
export async function startHaeAnalysis(
  input: HaeStartInput
): Promise<HaeStartResult> {
  try {
    const supabase = await createServerSupabaseClient()

    const selectedPlatform = input.platform || DEFAULT_PLATFORM
    const dbPlatform = DB_PLATFORM_MAP[selectedPlatform] ?? DB_PLATFORM_MAP[DEFAULT_PLATFORM]

    // Extract video ID
    const videoId = extractVideoId(input.videoUrl)
    if (!videoId) {
      return {
        success: false,
        error: 'Invalid YouTube URL',
      }
    }

    // Filter only gameplay segments
    const gameplaySegments = input.segments.filter((s) => s.type === 'gameplay')

    if (gameplaySegments.length === 0) {
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
          url: input.videoUrl, // Store full YouTube URL
          youtube_id: videoId,
          platform: 'youtube',
          title: null, // Will be updated later when we fetch metadata
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

    // Create analysis job
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .insert({
        video_id: dbVideoId,
        stream_id: input.streamId || null, // Link to stream (day) if provided
        platform: dbPlatform,
        status: 'pending',
        segments: gameplaySegments,
        progress: 0,
        ai_provider: 'gemini',
        submitted_players: input.players || null,
      })
      .select('id')
      .single()

    if (jobError) {
      return {
        success: false,
        error: `Failed to create analysis job: ${jobError.message}`,
      }
    }

    // Start background processing (in production, this would be a queue)
    processHaeJob(job.id, videoId, gameplaySegments, input.streamId, selectedPlatform).catch(
      console.error
    )

    revalidatePath('/hae')

    return {
      success: true,
      jobId: job.id,
    }
  } catch (error) {
    console.error('Start HAE error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process HAE job in the background
 * In production, this should be moved to a queue worker
 */
async function processHaeJob(
  jobId: string,
  youtubeId: string,
  segments: TimeSegment[],
  streamId?: string,
  platform: HaePlatform = DEFAULT_PLATFORM
) {
  const supabase = getServiceSupabaseClient()

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
    let finalStreamId = streamId
    if (!finalStreamId) {
      console.log('No streamId provided, creating default "Unsorted Hands" stream')

      // Try to find existing "Unsorted Hands" stream
      const { data: existingStream } = await supabase
        .from('days')
        .select('id')
        .eq('name', 'Unsorted Hands')
        .single()

      if (existingStream) {
        finalStreamId = existingStream.id
      } else {
        // Create default sub_event and day for unsorted hands
        const { data: defaultSubEvent, error: subEventError } = await supabase
          .from('sub_events')
          .insert({
            tournament_id: null, // No tournament
            name: 'Unsorted Videos',
            date: new Date().toISOString().split('T')[0],
          })
          .select('id')
          .single()

        if (subEventError || !defaultSubEvent) {
          console.error('Failed to create default sub_event:', subEventError)
          throw new Error('Failed to create default stream for unsorted hands')
        }

        const { data: defaultDay, error: dayError } = await supabase
          .from('days')
          .insert({
            sub_event_id: defaultSubEvent.id,
            name: 'Unsorted Hands',
            video_url: `https://www.youtube.com/watch?v=${youtubeId}`,
          })
          .select('id')
          .single()

        if (dayError || !defaultDay) {
          console.error('Failed to create default day:', dayError)
          throw new Error('Failed to create default stream for unsorted hands')
        }

        finalStreamId = defaultDay.id
        console.log(`Created default stream: ${finalStreamId}`)
      }
    }

    // Analyze each segment with YouTube URL
    const segmentsForAnalysis = segments.map((s) => ({
      start: s.start,
      end: s.end,
      label: s.label,
    }))

    // Pass full YouTube URL to Python HAE API
    const fullYoutubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`
    const analysisPlatform =
      ANALYSIS_PLATFORM_MAP[platform] ?? ANALYSIS_PLATFORM_MAP[DEFAULT_PLATFORM]

    // Call Python API endpoint (same domain)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/hae_analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        youtubeUrl: fullYoutubeUrl,
        segments: segmentsForAnalysis,
        platform: analysisPlatform,
      }),
    })

    if (!response.ok) {
      throw new Error(`Python API error: ${response.statusText}`)
    }

    const data = await response.json()
    const results = data.results || []

    // Process results and store in database
    let totalHands = 0

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const segment = segments[i]

      if (result.error || result.hands.length === 0) {
        continue
      }

      // Store each hand
      for (const handData of result.hands) {
        // Create hand record
        const { data: hand, error: handError } = await supabase
          .from('hands')
          .insert({
            day_id: finalStreamId, // Use finalStreamId (guaranteed to exist)
            job_id: jobId,
            number: String(handData.handNumber || ++totalHands),
            description: handData.description || `Hand #${handData.handNumber || totalHands}`,
            timestamp: formatTimestamp(segment.start), // Convert seconds to MM:SS format
            video_timestamp_start: segment.start,
            video_timestamp_end: segment.end,
            stakes: handData.stakes || 'Unknown',
            board_flop: handData.board?.flop || [],
            board_turn: handData.board?.turn || null,
            board_river: handData.board?.river || null,
            pot_size: handData.pot || 0,
            raw_data: handData,
          })
          .select('id')
          .single()

        if (handError || !hand) {
          console.error('Failed to create hand:', handError)
          continue
        }

        // Generate AI summary for the hand
        try {
          const summary = await generateHandSummary({
            handNumber: handData.handNumber,
            stakes: handData.stakes,
            players: handData.players || [],
            board: handData.board,
            pot: handData.pot,
            winners: handData.winners,
            actions: handData.actions,
          })

          // Update hand with summary
          await supabase
            .from('hands')
            .update({ ai_summary: summary } as any)
            .eq('id', hand.id)
        } catch (summaryError) {
          console.error('Failed to generate hand summary:', summaryError)
          // Continue even if summary fails
        }

        // Store players and actions
        if (handData.players) {
          for (const playerData of handData.players) {
            // Find or create player
            const playerId = await findOrCreatePlayer(supabase, playerData.name)

            // Create hand_player record
            const winner = handData.winners?.find(
              (w: any) => w.name === playerData.name
            )

            // Convert holeCards to array format if needed
            let holeCardsArray: string[] | null = null
            if (playerData.holeCards) {
              if (Array.isArray(playerData.holeCards)) {
                holeCardsArray = playerData.holeCards
              } else if (typeof playerData.holeCards === 'string') {
                // Parse string format like "AsKd" or "As Kd"
                holeCardsArray = playerData.holeCards.split(/[\s,]+/).filter(Boolean)
              }
            }

            const { data: handPlayer, error: hpError } = await supabase
              .from('hand_players')
              .insert({
                hand_id: hand.id,
                player_id: playerId,
                seat: playerData.seat,
                poker_position: playerData.position, // Use poker_position instead of position
                starting_stack: playerData.stackSize || 0,
                ending_stack: playerData.stackSize || 0, // Will be updated if winner info available
                hole_cards: holeCardsArray,
                cards: holeCardsArray ? holeCardsArray.join(' ') : null, // Legacy format
                final_amount: winner?.amount || 0,
                is_winner: !!winner,
                hand_description: winner?.hand || null,
              })
              .select('id')
              .single()

            if (hpError || !handPlayer) {
              console.error('Failed to create hand_player:', hpError)
              continue
            }

            // Store actions
            if (handData.actions) {
              const playerActions = handData.actions.filter(
                (a: any) => a.player === playerData.name
              )

              for (let idx = 0; idx < playerActions.length; idx++) {
                const action = playerActions[idx]

                await supabase.from('hand_actions').insert({
                  hand_id: hand.id,
                  player_id: playerId, // Use player_id directly
                  action_order: idx + 1, // Use action_order (1-indexed) - fixed column name
                  street: action.street.toLowerCase(), // Normalize street name
                  action_type: action.action.toLowerCase(), // Normalize action type
                  amount: action.amount || 0,
                })
              }
            }
          }
        }
      }

      // Update progress
      const progress = Math.round(((i + 1) / segments.length) * 100)
      await supabase
        .from('analysis_jobs')
        .update({ progress })
        .eq('id', jobId)
    }

    // Mark job as completed
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  } catch (error) {
    console.error('HAE job processing error:', error)

    // Mark job as failed
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}

/**
 * Get HAE job status
 */
export async function getHaeJob(jobId: string) {
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
