'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { haeAnalyzeSegments } from '@/lib/ai/gemini'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'

export interface HaeStartInput {
  videoUrl: string
  segments: TimeSegment[]
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
          youtube_id: videoId,
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
        status: 'pending',
        segments: gameplaySegments,
        progress: 0,
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
    processHaeJob(job.id, dbVideoId, videoId, gameplaySegments).catch(
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
  dbVideoId: string,
  youtubeId: string,
  segments: TimeSegment[]
) {
  const supabase = await createServerSupabaseClient()

  try {
    // Update job status to processing
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    // Analyze each segment with YouTube URL
    const segmentsForAnalysis = segments.map((s) => ({
      start: s.start,
      end: s.end,
      label: s.label,
    }))

    // Pass full YouTube URL to HAE (Gemini)
    const fullYoutubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`
    const results = await haeAnalyzeSegments(fullYoutubeUrl, segmentsForAnalysis)

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
            video_id: dbVideoId,
            job_id: jobId,
            hand_number: handData.handNumber || ++totalHands,
            stakes: handData.stakes || 'Unknown',
            timestamp_start: segment.start,
            timestamp_end: segment.end,
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

        // Store players and actions
        if (handData.players) {
          for (const playerData of handData.players) {
            // Find or create player
            const playerId = await findOrCreatePlayer(supabase, playerData.name)

            // Create hand_player record
            const winner = handData.winners?.find(
              (w: any) => w.name === playerData.name
            )

            const { data: handPlayer, error: hpError } = await supabase
              .from('hand_players')
              .insert({
                hand_id: hand.id,
                player_id: playerId,
                seat: playerData.seat,
                position: playerData.position,
                stack_size: playerData.stackSize || 0,
                hole_cards: playerData.holeCards ? [playerData.holeCards] : null,
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
                  hand_player_id: handPlayer.id,
                  action_sequence: idx,
                  street: action.street,
                  action_type: action.action,
                  amount: action.amount || 0,
                  timestamp: segment.start, // In production, parse action.timestamp
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
