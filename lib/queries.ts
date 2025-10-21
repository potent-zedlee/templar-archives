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
  dayId?: string
  playerId?: string
}) {
  const supabase = createClientSupabaseClient()
  const { limit = 20, offset = 0, favoriteOnly, dayId, playerId } = options

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

    if (dayId) {
      query = query.eq('day_id', dayId)
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
      tournament_name: hand.days?.sub_events?.tournaments?.name,
      tournament_category: hand.days?.sub_events?.tournaments?.category,
      sub_event_name: hand.days?.sub_events?.name,
      day_name: hand.days?.name,
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
        sub_events(
          *,
          days(*)
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by game_type if provided
    if (gameType) {
      query = query.eq('game_type', gameType)
    }

    const { data, error } = await query

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    throw error
  }
}

/**
 * Fetch players with hand counts (optimized)
 */
export async function fetchPlayersWithHandCount() {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('players')
      .select(`
        *,
        hand_players(count)
      `)
      .order('total_winnings', { ascending: false })

    if (error) throw error

    // Transform data to include hand count
    const playersWithCount = (data || []).map((player: any) => ({
      ...player,
      hand_count: player.hand_players?.length || 0
    }))

    return playersWithCount
  } catch (error) {
    console.error('Error fetching players:', error)
    throw error
  }
}

/**
 * Fetch hands for a specific player (formatted for HandListAccordion)
 */
export async function fetchPlayerHands(playerId: string): Promise<{
  hands: HandHistory[]
  handIds: string[]
}> {
  const supabase = createClientSupabaseClient()

  try {
    // Get all hands for this player with full details
    const { data: handPlayersData, error: handPlayersError } = await supabase
      .from('hand_players')
      .select('hand_id')
      .eq('player_id', playerId)

    if (handPlayersError) throw handPlayersError

    const handIds = (handPlayersData || []).map(hp => hp.hand_id)

    if (handIds.length === 0) {
      return { hands: [], handIds: [] }
    }

    // Fetch hands with player details
    const { data: handsData, error: handsError } = await supabase
      .from('hands')
      .select(`
        *,
        hand_players(
          position,
          cards,
          player:players(name)
        )
      `)
      .in('id', handIds)
      .order('created_at', { ascending: false })

    if (handsError) throw handsError

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
      handIds: handIds.filter(id => handsData?.some((h: any) => h.id === id))
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
    // Get all hand IDs for this player
    const { data: handPlayersData, error: handPlayersError } = await supabase
      .from('hand_players')
      .select('hand_id')
      .eq('player_id', playerId)

    if (handPlayersError) throw handPlayersError

    const handIds = (handPlayersData || []).map(hp => hp.hand_id)

    if (handIds.length === 0) {
      return []
    }

    // Fetch hands with full tournament/event hierarchy
    const { data: handsData, error: handsError } = await supabase
      .from('hands')
      .select(`
        *,
        hand_players(
          position,
          cards,
          player:players(name)
        ),
        days!inner(
          id,
          name,
          video_url,
          video_file,
          video_source,
          video_nas_path,
          sub_events!inner(
            id,
            name,
            date,
            tournaments!inner(
              id,
              name,
              category,
              location
            )
          )
        )
      `)
      .in('id', handIds)
      .order('created_at', { ascending: false })

    if (handsError) throw handsError

    // Group by tournament -> sub_event -> day
    const grouped: any = {}

    handsData?.forEach((hand: any) => {
      const tournament = hand.days.sub_events.tournaments
      const subEvent = hand.days.sub_events
      const day = hand.days

      // Initialize tournament
      if (!grouped[tournament.id]) {
        grouped[tournament.id] = {
          ...tournament,
          sub_events: {},
        }
      }

      // Initialize sub_event
      if (!grouped[tournament.id].sub_events[subEvent.id]) {
        grouped[tournament.id].sub_events[subEvent.id] = {
          ...subEvent,
          days: {},
        }
      }

      // Initialize day
      if (!grouped[tournament.id].sub_events[subEvent.id].days[day.id]) {
        grouped[tournament.id].sub_events[subEvent.id].days[day.id] = {
          ...day,
          hands: [],
        }
      }

      // Add hand to day
      grouped[tournament.id].sub_events[subEvent.id].days[day.id].hands.push(hand)
    })

    // Convert to array structure
    const result = Object.values(grouped).map((tournament: any) => ({
      ...tournament,
      sub_events: Object.values(tournament.sub_events).map((subEvent: any) => ({
        ...subEvent,
        days: Object.values(subEvent.days),
      })),
    }))

    return result
  } catch (error) {
    console.error('Error fetching player hands grouped:', error)
    throw error
  }
}
