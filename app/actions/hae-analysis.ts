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

    // Create analysis job
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
      })
      .select('id')
      .single()

    if (jobError) {
      return {
        success: false,
        error: `Failed to create analysis job: ${jobError.message}`,
      }
    }

    // Start background processing (Python backend)
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
 * Process HAE job using Python backend
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

      const { data: existingStream } = await supabase
        .from('days')
        .select('id')
        .eq('name', 'Unsorted Hands')
        .single()

      if (existingStream) {
        finalStreamId = existingStream.id
      } else {
        const { data: defaultSubEvent, error: subEventError } = await supabase
          .from('sub_events')
          .insert({
            tournament_id: null,
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

    // Full YouTube URL
    const fullYoutubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`
    const analysisPlatform = ANALYSIS_PLATFORM_MAP[platform] ?? ANALYSIS_PLATFORM_MAP[DEFAULT_PLATFORM]

    let totalHands = 0

    // Process each segment by calling Python backend
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]

      try {
        // Update progress
        const progressPercent = Math.round((i / segments.length) * 100)
        await supabase
          .from('analysis_jobs')
          .update({ progress: progressPercent })
          .eq('id', jobId)

        console.log(`[HAE] Processing segment ${i + 1}/${segments.length}: ${segment.start}s - ${segment.end}s`)

        // Call Python backend (HAE-MVP)
        const backendUrl = process.env.HAE_BACKEND_URL || 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/api/analyze-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            youtubeUrl: fullYoutubeUrl,
            startTime: segment.start,
            endTime: segment.end,
            platform: analysisPlatform,
          }),
        })

        if (!response.ok) {
          console.error(`[HAE] Backend error for segment ${i}:`, response.statusText)
          continue
        }

        // Parse SSE stream from Python backend
        const reader = response.body?.getReader()
        if (!reader) {
          console.error('[HAE] No response body reader')
          continue
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let segmentResult: any = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split('\n\n')
          buffer = events.pop() || ''

          for (const event of events) {
            if (!event.trim()) continue

            const lines = event.split('\n')
            let eventType = ''
            let data = ''

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.substring(6).trim()
              } else if (line.startsWith('data:')) {
                data = line.substring(5).trim()
              }
            }

            if (eventType && data) {
              try {
                const parsed = JSON.parse(data)

                if (eventType === 'progress') {
                  // Update Supabase progress
                  const overallProgress = progressPercent + Math.round((parsed.percent / 100) * (100 / segments.length))
                  await supabase
                    .from('analysis_jobs')
                    .update({ progress: Math.min(overallProgress, 99) })
                    .eq('id', jobId)

                } else if (eventType === 'complete') {
                  segmentResult = parsed
                  console.log(`[HAE] Segment ${i} complete: ${parsed.hands?.length || 0} hands`)

                } else if (eventType === 'error') {
                  console.error(`[HAE] Segment ${i} error:`, parsed.error)
                }
              } catch (e) {
                console.error('[HAE] Failed to parse SSE event:', e)
              }
            }
          }
        }

        // Store hands from this segment
        if (segmentResult && segmentResult.hands && segmentResult.hands.length > 0) {
          for (const handData of segmentResult.hands) {
            // Create hand record
            const { data: hand, error: handError } = await supabase
              .from('hands')
              .insert({
                day_id: finalStreamId,
                job_id: jobId,
                number: String(handData.handNumber || ++totalHands),
                description: handData.description || `Hand #${handData.handNumber || totalHands}`,
                timestamp: formatTimestamp(segment.start),
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

            // Generate AI summary
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

              await supabase
                .from('hands')
                .update({ ai_summary: summary } as any)
                .eq('id', hand.id)
            } catch (summaryError) {
              console.error('Failed to generate hand summary:', summaryError)
            }

            // Store players and actions
            if (handData.players) {
              for (const playerData of handData.players) {
                const playerId = await findOrCreatePlayer(supabase, playerData.name)

                const winner = handData.winners?.find(
                  (w: any) => w.name === playerData.name
                )

                let holeCardsArray: string[] | null = null
                if (playerData.holeCards) {
                  if (Array.isArray(playerData.holeCards)) {
                    holeCardsArray = playerData.holeCards
                  } else if (typeof playerData.holeCards === 'string') {
                    holeCardsArray = playerData.holeCards.split(/[\s,]+/).filter(Boolean)
                  }
                }

                const { data: handPlayer, error: hpError } = await supabase
                  .from('hand_players')
                  .insert({
                    hand_id: hand.id,
                    player_id: playerId,
                    seat: playerData.seat,
                    poker_position: playerData.position,
                    starting_stack: playerData.stackSize || 0,
                    ending_stack: playerData.stackSize || 0,
                    hole_cards: holeCardsArray,
                    cards: holeCardsArray ? holeCardsArray.join(' ') : null,
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
                      player_id: playerId,
                      action_order: idx + 1,
                      street: action.street.toLowerCase(),
                      action_type: action.action.toLowerCase(),
                      amount: action.amount || 0,
                    })
                  }
                }
              }
            }
          }
        }
      } catch (segmentError) {
        console.error(`[HAE] Error processing segment ${i}:`, segmentError)
      }
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
