'use server'

/**
 * Archive 관리 Server Actions
 *
 * 모든 write 작업은 서버 사이드에서만 실행되며,
 * 관리자 권한을 서버에서 검증합니다.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { Tournament, TournamentCategory } from '@/lib/types/archive'

// ==================== Helper Functions ====================

/**
 * 관리자 권한 검증 (DB role 기반)
 *
 * @returns {Promise<{authorized: boolean, error?: string, userId?: string}>}
 */
async function verifyAdmin(): Promise<{
  authorized: boolean
  error?: string
  userId?: string
}> {
  const supabase = await createServerSupabaseClient()

  // 1. 인증된 사용자 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized - Please sign in' }
  }

  // 2. DB에서 사용자 role 조회 (신뢰할 수 있는 source)
  const { data: dbUser, error: dbError } = await supabase
    .from('users')
    .select('role, banned_at')
    .eq('id', user.id)
    .single()

  if (dbError || !dbUser) {
    return {
      authorized: false,
      error: 'User not found in database'
    }
  }

  // 3. 밴 상태 확인
  if (dbUser.banned_at) {
    return {
      authorized: false,
      error: 'Account is banned'
    }
  }

  // 4. 관리자 역할 확인 (admin 또는 high_templar)
  if (!['admin', 'high_templar'].includes(dbUser.role)) {
    return {
      authorized: false,
      error: 'Forbidden - Admin access required'
    }
  }

  return { authorized: true, userId: user.id }
}

// ==================== Tournament Actions ====================

export async function createTournament(data: {
  name: string
  category: TournamentCategory
  game_type: 'tournament' | 'cash-game'
  location: string
  city?: string
  country?: string
  start_date: string
  end_date: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!data.name.trim() || !data.location.trim() || !data.start_date || !data.end_date) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Category ID 매핑
    const getCategoryId = (category: string): string => {
      const mapping: Record<string, string> = {
        'WSOP': 'wsop',
        'Triton': 'triton',
        'EPT': 'ept',
        'APT': 'apt',
        'APL': 'apl',
        'Hustler Casino Live': 'hustler',
        'WSOP Classic': 'wsop',
        'GGPOKER': 'ggpoker',
      }
      return mapping[category] || category.toLowerCase().replace(/\s+/g, '-')
    }

    const supabase = await createServerSupabaseClient()

    // 4. DB에 삽입
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        name: data.name.trim(),
        category: data.category,
        category_id: getCategoryId(data.category),
        game_type: data.game_type,
        location: data.location.trim(),
        city: data.city?.trim() || null,
        country: data.country?.trim() || null,
        start_date: data.start_date,
        end_date: data.end_date,
      })
      .select()
      .single()

    if (error) {
      console.error('[Server Action] Create tournament error:', error)
      return { success: false, error: error.message }
    }

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true, data: tournament }
  } catch (error: any) {
    console.error('[Server Action] Create tournament exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function updateTournament(id: string, data: {
  name: string
  category: TournamentCategory
  game_type: 'tournament' | 'cash-game'
  location: string
  city?: string
  country?: string
  start_date: string
  end_date: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!data.name.trim() || !data.location.trim() || !data.start_date || !data.end_date) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Category ID 매핑
    const getCategoryId = (category: string): string => {
      const mapping: Record<string, string> = {
        'WSOP': 'wsop',
        'Triton': 'triton',
        'EPT': 'ept',
        'APT': 'apt',
        'APL': 'apl',
        'Hustler Casino Live': 'hustler',
        'WSOP Classic': 'wsop',
        'GGPOKER': 'ggpoker',
      }
      return mapping[category] || category.toLowerCase().replace(/\s+/g, '-')
    }

    const supabase = await createServerSupabaseClient()

    // 4. DB 업데이트
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .update({
        name: data.name.trim(),
        category: data.category,
        category_id: getCategoryId(data.category),
        game_type: data.game_type,
        location: data.location.trim(),
        city: data.city?.trim() || null,
        country: data.country?.trim() || null,
        start_date: data.start_date,
        end_date: data.end_date,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Server Action] Update tournament error:', error)
      return { success: false, error: error.message }
    }

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true, data: tournament }
  } catch (error: any) {
    console.error('[Server Action] Update tournament exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function deleteTournament(id: string) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB에서 삭제
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Server Action] Delete tournament error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Delete tournament exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== SubEvent Actions ====================

export async function createSubEvent(tournamentId: string, data: {
  name: string
  date: string
  event_number?: string
  total_prize?: string
  winner?: string
  buy_in?: string
  entry_count?: number
  blind_structure?: string
  level_duration?: number
  starting_stack?: number
  notes?: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!data.name.trim() || !data.date) {
      return { success: false, error: 'Missing required fields' }
    }

    const supabase = await createServerSupabaseClient()

    // 3. DB에 삽입
    const { data: subEvent, error } = await supabase
      .from('sub_events')
      .insert({
        tournament_id: tournamentId,
        name: data.name.trim(),
        date: data.date,
        event_number: data.event_number?.trim() || null,
        total_prize: data.total_prize?.trim() || null,
        winner: data.winner?.trim() || null,
        buy_in: data.buy_in?.trim() || null,
        entry_count: data.entry_count || null,
        blind_structure: data.blind_structure?.trim() || null,
        level_duration: data.level_duration || null,
        starting_stack: data.starting_stack || null,
        notes: data.notes?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[Server Action] Create sub event error:', error)
      return { success: false, error: error.message }
    }

    // 4. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true, data: subEvent }
  } catch (error: any) {
    console.error('[Server Action] Create sub event exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function updateSubEvent(id: string, data: {
  name: string
  date: string
  event_number?: string
  total_prize?: string
  winner?: string
  buy_in?: string
  entry_count?: number
  blind_structure?: string
  level_duration?: number
  starting_stack?: number
  notes?: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!data.name.trim() || !data.date) {
      return { success: false, error: 'Missing required fields' }
    }

    const supabase = await createServerSupabaseClient()

    // 3. DB 업데이트
    const { data: subEvent, error } = await supabase
      .from('sub_events')
      .update({
        name: data.name.trim(),
        date: data.date,
        event_number: data.event_number?.trim() || null,
        total_prize: data.total_prize?.trim() || null,
        winner: data.winner?.trim() || null,
        buy_in: data.buy_in?.trim() || null,
        entry_count: data.entry_count || null,
        blind_structure: data.blind_structure?.trim() || null,
        level_duration: data.level_duration || null,
        starting_stack: data.starting_stack || null,
        notes: data.notes?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Server Action] Update sub event error:', error)
      return { success: false, error: error.message }
    }

    // 4. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true, data: subEvent }
  } catch (error: any) {
    console.error('[Server Action] Update sub event exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function deleteSubEvent(id: string) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB에서 삭제
    const { error } = await supabase
      .from('sub_events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Server Action] Delete sub event error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Delete sub event exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Day Actions ====================

export async function createDay(subEventId: string, data: {
  name?: string
  video_source: 'youtube' | 'upload'
  video_url?: string
  video_file?: string
  published_at?: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (data.video_source === 'youtube' && !data.video_url) {
      return { success: false, error: 'YouTube URL is required' }
    }

    const supabase = await createServerSupabaseClient()

    // 3. DB에 삽입
    const { data: day, error } = await supabase
      .from('days')
      .insert({
        sub_event_id: subEventId,
        name: data.name?.trim() || `Day ${new Date().toISOString()}`,
        video_source: data.video_source,
        video_url: data.video_url?.trim() || null,
        video_file: data.video_file?.trim() || null,
        published_at: data.published_at || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[Server Action] Create day error:', error)
      return { success: false, error: error.message }
    }

    // 4. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true, data: day }
  } catch (error: any) {
    console.error('[Server Action] Create day exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function updateDay(id: string, data: {
  name?: string
  video_source: 'youtube' | 'upload'
  video_url?: string
  video_file?: string
  published_at?: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (data.video_source === 'youtube' && !data.video_url) {
      return { success: false, error: 'YouTube URL is required' }
    }

    const supabase = await createServerSupabaseClient()

    // 3. DB 업데이트
    const { data: day, error } = await supabase
      .from('days')
      .update({
        name: data.name?.trim() || `Day ${new Date().toISOString()}`,
        video_source: data.video_source,
        video_url: data.video_url?.trim() || null,
        video_file: data.video_file?.trim() || null,
        published_at: data.published_at || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Server Action] Update day error:', error)
      return { success: false, error: error.message }
    }

    // 4. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true, data: day }
  } catch (error: any) {
    console.error('[Server Action] Update day exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function deleteDay(id: string) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB에서 삭제
    const { error } = await supabase
      .from('days')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[Server Action] Delete day error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Delete day exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Payout Actions ====================

export async function saveEventPayouts(subEventId: string, payouts: Array<{
  rank: number
  playerName: string
  prizeAmount: string
}>) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. 기존 payouts 삭제
    await supabase
      .from('event_payouts')
      .delete()
      .eq('sub_event_id', subEventId)

    // 3. Prize amount 파싱 함수
    const parsePrizeAmount = (amountStr: string): number => {
      if (!amountStr) return 0

      let cleaned = amountStr.replace(/[$\s]/g, '')

      if (cleaned.includes('M')) {
        const num = parseFloat(cleaned.replace('M', ''))
        return Math.round(num * 1000000 * 100)
      } else if (cleaned.includes('K')) {
        const num = parseFloat(cleaned.replace('K', ''))
        return Math.round(num * 1000 * 100)
      } else {
        const num = parseFloat(cleaned.replace(/,/g, ''))
        return Math.round(num * 100)
      }
    }

    // 4. 유효한 payouts만 필터링
    const validPayouts = payouts.filter(p => p.playerName.trim() && p.prizeAmount.trim())

    if (validPayouts.length > 0) {
      const payoutInserts = validPayouts.map(p => ({
        sub_event_id: subEventId,
        rank: p.rank,
        player_name: p.playerName.trim(),
        prize_amount: parsePrizeAmount(p.prizeAmount),
        matched_status: 'unmatched' as const,
      }))

      const { error } = await supabase
        .from('event_payouts')
        .insert(payoutInserts)

      if (error) {
        console.error('[Server Action] Save payouts error:', error)
        return { success: false, error: error.message }
      }
    }

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Save payouts exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Rename Action ====================

export async function renameItem(
  itemType: 'tournament' | 'subevent' | 'day',
  itemId: string,
  newName: string
) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!newName.trim()) {
      return { success: false, error: 'Name cannot be empty' }
    }

    const supabase = await createServerSupabaseClient()

    // 3. 테이블 이름 매핑
    const table = itemType === 'tournament' ? 'tournaments'
      : itemType === 'subevent' ? 'sub_events'
      : 'days'

    // 4. DB 업데이트
    const { error } = await supabase
      .from(table)
      .update({ name: newName.trim() })
      .eq('id', itemId)

    if (error) {
      console.error('[Server Action] Rename item error:', error)
      return { success: false, error: error.message }
    }

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Rename item exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}
