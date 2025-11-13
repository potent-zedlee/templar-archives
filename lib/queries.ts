import { createClientSupabaseClient } from "./supabase-client"
import type { Hand } from "./supabase"
import type { HandHistory } from "./types/hand-history"

/**
 * Optimized query to fetch hands with all related data in minimal queries
 * Solves N+1 problem by using PostgreSQL joins
 */
export async function fetchHandsWithDetails(options: {
  limit?: number
  offset?: number
  favoriteOnly?: boolean
  streamId?: string
  playerId?: string
}) {
  const supabase = createClientSupabaseClient()
  const { limit = 20, offset = 0, favoriteOnly, streamId, playerId } = options

  try {
    // Base query with count
    let query = supabase
      .from('hands')
      .select('*, days!inner(name, sub_event_id, sub_events!inner(name, tournament_id, tournaments!inner(name, category)))', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (favoriteOnly) {
      query = query.eq('favorite', true)
    }

    if (streamId) {
      query = query.eq('day_id', streamId)
    }

    // Pagination
    if (limit) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: handsData, error, count } = await query

    if (error) throw error

    // Get player information for all hands in one query
    const handIds = (handsData || []).map(h => h.id)

    let playersMap: Record<string, string[]> = {}
    if (handIds.length > 0) {
      const { data: handPlayersData } = await supabase
        .from('hand_players')
        .select('hand_id, players!inner(name)')
        .in('hand_id', handIds)

      if (handPlayersData) {
        playersMap = handPlayersData.reduce((acc, hp: any) => {
          if (!acc[hp.hand_id]) acc[hp.hand_id] = []
          acc[hp.hand_id].push(hp.players.name)
          return acc
        }, {} as Record<string, string[]>)
      }
    }

    // Transform data
    const enrichedHands = (handsData || []).map((hand: any) => ({
      ...hand,
      tournament_name: hand.streams?.sub_events?.tournaments?.name,
      tournament_category: hand.streams?.sub_events?.tournaments?.category,
      sub_event_name: hand.streams?.sub_events?.name,
      day_name: hand.streams?.name,
      player_names: playersMap[hand.id] || [],
      player_count: playersMap[hand.id]?.length || 0
    }))

    return {
      hands: enrichedHands,
      count: count || 0
    }
  } catch (error) {
    console.error('Error fetching hands:', error)
    throw error
  }
}

/**
 * Fetch single hand with all details
 */
export async function fetchHandDetails(handId: string) {
  const supabase = createClientSupabaseClient()

  try {
    const { data: hand, error } = await supabase
      .from('hands')
      .select(`
        *,
        days!inner(
          id, name, video_url, video_file, video_source, video_nas_path,
          sub_events!inner(
            id, name, date,
            tournaments!inner(id, name, category, location)
          )
        )
      `)
      .eq('id', handId)
      .single()

    if (error) throw error

    // Get players in this hand
    const { data: handPlayers } = await supabase
      .from('hand_players')
      .select('position, cards, players!inner(id, name, photo_url, country)')
      .eq('hand_id', handId)

    return {
      ...hand,
      players: handPlayers || []
    }
  } catch (error) {
    console.error('Error fetching hand details:', error)
    throw error
  }
}

/**
 * Fetch tournaments with sub_events and days (optimized)
 */
export async function fetchTournamentsTree(gameType?: 'tournament' | 'cash-game') {
  const supabase = createClientSupabaseClient()

  try {
    let query = supabase
      .from('tournaments')
      .select(`
        *,
        tournament_categories!category_id(logo_url),
        sub_events(
          *,
          streams(*)
        )
      `)
      .order('start_date', { ascending: false })

    // Filter by game_type if provided
    if (gameType) {
      query = query.eq('game_type', gameType)
    }

    const { data, error } = await query

    if (error) throw error

    const tournaments = data || []

    // Get all day IDs from the tournaments tree
    const allDayIds: string[] = []
    tournaments.forEach((tournament: any) => {
      tournament.sub_events?.forEach((subEvent: any) => {
        subEvent.streams?.forEach((day: any) => {
          allDayIds.push(day.id)
        })
      })
    })

    // Calculate player counts for each day
    let playerCountsByDayId: Record<string, number> = {}
    if (allDayIds.length > 0) {
      const { data: playerCounts, error: pcError } = await supabase
        .rpc('get_player_counts_by_day', { day_ids: allDayIds })

      if (pcError) {
        console.error('Error fetching player counts:', pcError)
      } else if (playerCounts) {
        playerCountsByDayId = playerCounts.reduce((acc: Record<string, number>, item: any) => {
          acc[item.day_id] = item.player_count
          return acc
        }, {})
      }
    }

    // Add player counts to days and sort nested arrays
    tournaments.forEach((tournament: any) => {
      // Flatten category logo data
      if (tournament.tournament_categories?.logo_url) {
        tournament.category_logo_url = tournament.tournament_categories.logo_url
        delete tournament.tournament_categories
      }

      // Sort sub_events by date descending
      if (tournament.sub_events) {
        tournament.sub_events.sort((a: any, b: any) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA // Descending order
        })

        tournament.sub_events.forEach((subEvent: any) => {
          // Sort streams by published_at descending
          if (subEvent.streams) {
            subEvent.streams.sort((a: any, b: any) => {
              const dateA = a.published_at ? new Date(a.published_at).getTime() : 0
              const dateB = b.published_at ? new Date(b.published_at).getTime() : 0
              return dateB - dateA // Descending order
            })

            // Add player counts
            subEvent.streams.forEach((day: any) => {
              day.player_count = playerCountsByDayId[day.id] || 0
            })
          }
        })
      }
    })

    return tournaments
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    throw error
  }
}

/**
 * Fetch players with hand counts (optimized with RPC)
 */
export async function fetchPlayersWithHandCount() {
  const supabase = createClientSupabaseClient()

  try {
    // Use optimized RPC function - eliminates N+1 query
    const { data, error } = await supabase
      .rpc('get_players_with_hand_counts')

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching players:', error)
    throw error
  }
}

/**
 * Fetch hands for a specific player (formatted for HandListAccordion)
 * Optimized: Single query with JOIN instead of 2-step process
 */
export async function fetchPlayerHands(playerId: string): Promise<{
  hands: HandHistory[]
  handIds: string[]
}> {
  const supabase = createClientSupabaseClient()

  try {
    // Optimized: Single query using INNER JOIN
    const { data: handsData, error } = await supabase
      .from('hands')
      .select(`
        *,
        hand_players!inner(
          position,
          cards,
          player_id,
          player:players(name)
        )
      `)
      .eq('hand_players.player_id', playerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const handIds = (handsData || []).map((h: any) => h.id)

    // Transform to HandHistory format
    const hands: HandHistory[] = (handsData || []).map((hand: any) => {
      // timestamp 파싱: "MM:SS-MM:SS" 또는 "MM:SS" 형식 지원
      const timestamp = hand.timestamp || ""
      const parts = timestamp.split('-')
      const startTime = parts[0] || "00:00"
      const endTime = parts[1] || parts[0] || "00:00"

      return {
        handNumber: hand.number || "???",
        summary: hand.description || "핸드 정보",
        startTime,
        endTime,
        duration: 0,
        confidence: hand.confidence || 0,
        winner: hand.hand_players?.find((hp: any) => hp.position === "BTN")?.player?.name || "Unknown",
        potSize: hand.pot_size || 0,
        players: hand.hand_players?.map((hp: any) => ({
          name: hp.player?.name || "Unknown",
          position: hp.position || "Unknown",
          cards: hp.cards || "",
          stack: 0,
        })) || [],
        streets: {
          preflop: { actions: [], pot: 0 },
          flop: { actions: [], pot: 0, cards: hand.board_cards?.slice(0, 3)?.join(' ') },
          turn: { actions: [], pot: 0, cards: hand.board_cards?.slice(3, 4)?.join(' ') },
          river: { actions: [], pot: 0, cards: hand.board_cards?.slice(4, 5)?.join(' ') },
        },
      }
    })

    return {
      hands,
      handIds
    }
  } catch (error) {
    console.error('Error fetching player hands:', error)
    throw error
  }
}

/**
 * Fetch player prize history (from event_payouts)
 */
export async function fetchPlayerPrizeHistory(playerId: string) {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('event_payouts')
      .select(`
        *,
        sub_events!inner(
          id,
          name,
          date,
          tournaments!inner(id, name, category)
        )
      `)
      .eq('player_id', playerId)
      .order('sub_events(date)', { ascending: true })

    if (error) throw error

    // Transform data for charting
    const prizeHistory = (data || []).map((payout: any) => ({
      eventName: payout.sub_events.name,
      tournamentName: payout.sub_events.tournaments.name,
      category: payout.sub_events.tournaments.category,
      date: payout.sub_events.date,
      rank: payout.rank,
      prize: payout.prize_amount / 100, // Convert from cents to dollars
    }))

    return prizeHistory
  } catch (error) {
    console.error('Error fetching player prize history:', error)
    throw error
  }
}

/**
 * Fetch player hands grouped by tournament/event hierarchy
 */
export async function fetchPlayerHandsGrouped(playerId: string) {
  const supabase = createClientSupabaseClient()

  try {
    // Use optimized RPC function - single query instead of 2-step process
    const { data, error } = await supabase
      .rpc('get_player_hands_grouped', { player_uuid: playerId })

    if (error) throw error

    // RPC returns JSONB, parse it to array
    return data || []
  } catch (error) {
    console.error('Error fetching player hands grouped:', error)
    throw error
  }
}
