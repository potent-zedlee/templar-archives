import { createServerSupabaseClient } from './supabase-server'

export type PlatformStats = {
  totalHands: number
  totalTournaments: number
  totalPlayers: number
  totalUsers: number
}

export type WeeklyHighlight = {
  id: string
  number: string
  description: string
  timestamp: string
  pot_size: number
  likes_count: number
  video_url: string
  tournament_name: string
  day_name: string
}

export type TopPlayer = {
  id: string
  name: string
  photo_url?: string
  total_winnings: number
  tournament_count: number
  hands_count: number
}

/**
 * 플랫폼 전체 통계 조회
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = createServerSupabaseClient()

  const [
    { count: totalHands },
    { count: totalTournaments },
    { count: totalPlayers },
    { count: totalUsers }
  ] = await Promise.all([
    supabase.from('hands').select('*', { count: 'exact', head: true }),
    supabase.from('tournaments').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true })
  ])

  return {
    totalHands: totalHands || 0,
    totalTournaments: totalTournaments || 0,
    totalPlayers: totalPlayers || 0,
    totalUsers: totalUsers || 0
  }
}

/**
 * 주간 하이라이트 핸드 조회 (최근 7일간 좋아요 많이 받은 핸드)
 */
export async function getWeeklyHighlights(limit: number = 3): Promise<WeeklyHighlight[]> {
  const supabase = createServerSupabaseClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('hands')
    .select(`
      id,
      number,
      description,
      timestamp,
      pot_size,
      likes_count,
      day:day_id (
        name,
        video_url,
        sub_event:sub_event_id (
          tournament:tournament_id (
            name
          )
        )
      )
    `)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('likes_count', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching weekly highlights:', error)
    return []
  }

  return (data || []).map((hand: any) => ({
    id: hand.id,
    number: hand.number,
    description: hand.description || '',
    timestamp: hand.timestamp || '',
    pot_size: hand.pot_size || 0,
    likes_count: hand.likes_count || 0,
    video_url: hand.day?.video_url || '',
    tournament_name: hand.day?.sub_event?.tournament?.name || 'Unknown',
    day_name: hand.day?.name || 'Unknown'
  }))
}

/**
 * 최신 커뮤니티 포스트 조회
 */
export async function getLatestPosts(limit: number = 5) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      category,
      created_at,
      likes_count,
      comments_count,
      author_name,
      author_avatar
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching latest posts:', error)
    return []
  }

  return (data || []).map((post: any) => ({
    ...post,
    author: {
      nickname: post.author_name,
      avatar_url: post.author_avatar
    }
  }))
}

/**
 * Top 플레이어 조회 (총 상금 기준)
 */
export async function getTopPlayers(limit: number = 5): Promise<TopPlayer[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('players')
    .select(`
      id,
      name,
      photo_url,
      total_winnings,
      hand_players:hand_players(count)
    `)
    .order('total_winnings', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching top players:', error)
    return []
  }

  // 각 플레이어의 토너먼트 수 계산
  const playersWithStats = await Promise.all(
    (data || []).map(async (player: any) => {
      const supabaseInner = createServerSupabaseClient()
      const { count: tournamentCount } = await supabaseInner
        .from('hand_players')
        .select('hand:hand_id(day:day_id(sub_event:sub_event_id(tournament_id)))', { count: 'exact', head: true })
        .eq('player_id', player.id)

      return {
        id: player.id,
        name: player.name,
        photo_url: player.photo_url,
        total_winnings: player.total_winnings || 0,
        tournament_count: tournamentCount || 0,
        hands_count: player.hand_players?.length || 0
      }
    })
  )

  return playersWithStats
}
