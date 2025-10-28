/**
 * Hand Players Library
 *
 * 핸드 참여 플레이어 관리 함수
 */

import { createClientSupabaseClient } from './supabase-client'

/**
 * 핸드 플레이어 타입
 */
export type HandPlayer = {
  id: string
  hand_id: string
  player_id: string
  position: string | null
  cards: string | null
  starting_stack: number
  ending_stack: number
  created_at: string
  // Join된 플레이어 정보
  player?: {
    id: string
    name: string
    photo_url: string | null
    country: string | null
  }
}

/**
 * 플레이어 타입
 */
export type Player = {
  id: string
  name: string
  photo_url: string | null
  country: string | null
  total_winnings: number
}

/**
 * 포지션 타입
 */
export const POSITIONS = [
  'BB',
  'SB',
  'BTN',
  'CO',
  'MP',
  'MP+1',
  'MP+2',
  'UTG',
  'UTG+1',
  'UTG+2',
] as const

export type Position = typeof POSITIONS[number]

/**
 * 핸드의 플레이어 목록 가져오기
 */
export async function fetchHandPlayers(handId: string): Promise<HandPlayer[]> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('hand_players')
      .select(`
        *,
        player:players(id, name, photo_url, country)
      `)
      .eq('hand_id', handId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data as HandPlayer[]) || []
  } catch (error) {
    console.error('핸드 플레이어 조회 실패:', error)
    return []
  }
}

/**
 * 전체 플레이어 목록 가져오기
 */
export async function fetchAllPlayers(): Promise<Player[]> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return (data as Player[]) || []
  } catch (error) {
    console.error('전체 플레이어 조회 실패:', error)
    return []
  }
}

/**
 * 핸드에 플레이어 추가
 */
export async function addPlayerToHand(
  handId: string,
  playerId: string,
  position?: string,
  cards?: string,
  startingStack?: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient()

  try {
    // 중복 체크
    const { data: existing } = await supabase
      .from('hand_players')
      .select('id')
      .eq('hand_id', handId)
      .eq('player_id', playerId)
      .single()

    if (existing) {
      return { success: false, error: 'This player is already in this hand' }
    }

    // 플레이어 추가
    const { error } = await supabase
      .from('hand_players')
      .insert({
        hand_id: handId,
        player_id: playerId,
        position: position || null,
        cards: cards || null,
        starting_stack: startingStack || 0,
        ending_stack: 0,
      })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('플레이어 추가 실패:', error)
    return { success: false, error: error.message || 'Failed to add player' }
  }
}

/**
 * 핸드에서 플레이어 제거
 */
export async function removePlayerFromHand(
  handId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient()

  try {
    const { error } = await supabase
      .from('hand_players')
      .delete()
      .eq('hand_id', handId)
      .eq('player_id', playerId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('플레이어 제거 실패:', error)
    return { success: false, error: error.message || 'Failed to remove player' }
  }
}

/**
 * 핸드 플레이어 정보 수정
 */
export async function updatePlayerInHand(
  handId: string,
  playerId: string,
  data: {
    position?: string
    cards?: string
    starting_stack?: number
    ending_stack?: number
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient()

  try {
    const { error } = await supabase
      .from('hand_players')
      .update(data)
      .eq('hand_id', handId)
      .eq('player_id', playerId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('플레이어 정보 수정 실패:', error)
    return { success: false, error: error.message || 'Failed to update player' }
  }
}

/**
 * 플레이어 검색
 */
export async function searchPlayers(query: string): Promise<Player[]> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true })
      .limit(20)

    if (error) throw error
    return (data as Player[]) || []
  } catch (error) {
    console.error('플레이어 검색 실패:', error)
    return []
  }
}

/**
 * 새 플레이어 생성
 */
export async function createPlayer(data: {
  name: string
  country?: string
  photo_url?: string
}): Promise<{ success: boolean; player?: Player; error?: string }> {
  const supabase = createClientSupabaseClient()

  try {
    // 이름 중복 체크
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('name', data.name)
      .single()

    if (existing) {
      return { success: false, error: 'Player with this name already exists' }
    }

    // 플레이어 생성
    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({
        name: data.name,
        country: data.country || null,
        photo_url: data.photo_url || null,
        total_winnings: 0,
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, player: newPlayer as Player }
  } catch (error: any) {
    console.error('플레이어 생성 실패:', error)
    return { success: false, error: error.message || 'Failed to create player' }
  }
}
