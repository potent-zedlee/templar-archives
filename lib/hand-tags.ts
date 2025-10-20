/**
 * Hand Tags Library
 *
 * 핸드 태그 관리 함수
 */

import { createClientSupabaseClient } from './supabase-client'
import type { HandTag, HandTagName, HandTagStats, UserTagHistory } from './types/hand-tags'

/**
 * 핸드의 태그 목록 가져오기
 */
export async function fetchHandTags(handId: string): Promise<HandTag[]> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('hand_tags')
      .select('*')
      .eq('hand_id', handId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data as HandTag[]) || []
  } catch (error) {
    console.error('핸드 태그 조회 실패:', error)
    return []
  }
}

/**
 * 모든 태그 목록 가져오기 (중복 제거)
 */
export async function fetchAllTags(): Promise<HandTagName[]> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('hand_tags')
      .select('tag_name')

    if (error) throw error

    // 중복 제거
    const uniqueTags = Array.from(new Set((data || []).map(item => item.tag_name)))
    return uniqueTags as HandTagName[]
  } catch (error) {
    console.error('전체 태그 조회 실패:', error)
    return []
  }
}

/**
 * 태그 추가
 */
export async function addHandTag(
  handId: string,
  tagName: HandTagName,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient()

  try {
    // 중복 체크
    const { data: existing } = await supabase
      .from('hand_tags')
      .select('id')
      .eq('hand_id', handId)
      .eq('tag_name', tagName)
      .eq('created_by', userId)
      .single()

    if (existing) {
      return { success: false, error: 'This tag already exists' }
    }

    // 태그 추가
    const { error } = await supabase
      .from('hand_tags')
      .insert({
        hand_id: handId,
        tag_name: tagName,
        created_by: userId,
      })

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('태그 추가 실패:', error)
    return { success: false, error: error.message || 'Failed to add tag' }
  }
}

/**
 * 태그 삭제
 */
export async function removeHandTag(
  handId: string,
  tagName: HandTagName,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient()

  try {
    const { error } = await supabase
      .from('hand_tags')
      .delete()
      .eq('hand_id', handId)
      .eq('tag_name', tagName)
      .eq('created_by', userId)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error('태그 삭제 실패:', error)
    return { success: false, error: error.message || 'Failed to remove tag' }
  }
}

/**
 * 태그별 통계 가져오기
 */
export async function getTagStats(filters?: {
  tournamentId?: string
  playerId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<HandTagStats[]> {
  const supabase = createClientSupabaseClient()

  try {
    // Use the database function
    const { data, error } = await supabase.rpc('get_hand_tag_stats')

    if (error) throw error

    return (data || []).map((item: any) => ({
      tag_name: item.tag_name as HandTagName,
      count: parseInt(item.count, 10),
      percentage: parseFloat(item.percentage),
    }))
  } catch (error) {
    console.error('태그 통계 조회 실패:', error)
    return []
  }
}

/**
 * 태그로 핸드 검색
 *
 * @param tags - 태그 목록 (AND 조건, 모든 태그를 가진 핸드만 검색)
 */
export async function searchHandsByTags(tags: HandTagName[]): Promise<string[]> {
  if (tags.length === 0) return []

  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase.rpc('search_hands_by_tags', {
      tag_names: tags,
    })

    if (error) throw error

    return (data || []).map((item: any) => item.hand_id)
  } catch (error) {
    console.error('태그 검색 실패:', error)
    return []
  }
}

/**
 * 유저가 추가한 태그 히스토리
 */
export async function getUserTagHistory(userId: string): Promise<UserTagHistory[]> {
  const supabase = createClientSupabaseClient()

  try {
    const { data, error } = await supabase.rpc('get_user_tag_history', {
      user_id: userId,
    })

    if (error) throw error

    return (data || []) as UserTagHistory[]
  } catch (error) {
    console.error('유저 태그 히스토리 조회 실패:', error)
    return []
  }
}

/**
 * 핸드가 특정 태그를 가지고 있는지 확인
 */
export async function handHasTag(
  handId: string,
  tagName: HandTagName,
  userId?: string
): Promise<boolean> {
  const supabase = createClientSupabaseClient()

  try {
    let query = supabase
      .from('hand_tags')
      .select('id')
      .eq('hand_id', handId)
      .eq('tag_name', tagName)

    if (userId) {
      query = query.eq('created_by', userId)
    }

    const { data } = await query.single()

    return !!data
  } catch (error) {
    return false
  }
}

/**
 * 핸드의 특정 태그 개수 가져오기
 */
export async function getHandTagCount(handId: string, tagName: HandTagName): Promise<number> {
  const supabase = createClientSupabaseClient()

  try {
    const { count, error } = await supabase
      .from('hand_tags')
      .select('id', { count: 'exact', head: true })
      .eq('hand_id', handId)
      .eq('tag_name', tagName)

    if (error) throw error

    return count || 0
  } catch (error) {
    console.error('태그 개수 조회 실패:', error)
    return 0
  }
}
