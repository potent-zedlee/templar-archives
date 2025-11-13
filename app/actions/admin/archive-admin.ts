'use server'

/**
 * Archive 상태 관리 Server Actions (Admin Only)
 *
 * 모든 함수는 admin/high_templar 권한을 서버에서 검증합니다.
 * 상태 변경은 DB 트리거를 통해 자동으로 감사 로그에 기록됩니다.
 *
 * @module app/actions/admin/archive-admin
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type { ContentStatus } from '@/lib/types/archive'

// ==================== Types ====================

interface ActionResult<T = void> {
  success: boolean
  error?: string
  data?: T
}

interface StreamChecklistValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata: {
    hasYouTubeLink: boolean
    handCount: number
    hasThumbnail: boolean
    playersInfoComplete: boolean
    hasMetadata: boolean
    averageHandCount?: number
  }
}

// ==================== Helper Functions ====================

/**
 * 관리자 권한 검증 (DB role 기반)
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

  // 2. DB에서 사용자 role 조회
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

  // 4. 관리자 역할 확인
  if (!['admin', 'high_templar'].includes(dbUser.role)) {
    return {
      authorized: false,
      error: 'Forbidden - Admin access required'
    }
  }

  return { authorized: true, userId: user.id }
}

/**
 * 캐시 무효화 (Public + Admin)
 */
function invalidateCache(): void {
  revalidatePath('/archive')
  revalidatePath('/admin/archive')
}

// ==================== Tournament Status Actions ====================

/**
 * Tournament를 published 상태로 변경
 */
export async function publishTournament(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB 함수 호출 (SECURITY DEFINER)
    const { error } = await supabase.rpc('publish_tournament', {
      tournament_id: id
    })

    if (error) {
      console.error('[publishTournament] RPC error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[publishTournament] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Tournament를 draft 상태로 변경 (Unpublish)
 */
export async function unpublishTournament(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. 상태 변경
    const { error } = await supabase
      .from('tournaments')
      .update({
        status: 'draft' as ContentStatus,
        published_at: null,
        published_by: null
      })
      .eq('id', id)

    if (error) {
      console.error('[unpublishTournament] Update error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[unpublishTournament] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Tournament를 archived 상태로 변경
 */
export async function archiveTournament(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. 상태 변경
    const { error } = await supabase
      .from('tournaments')
      .update({
        status: 'archived' as ContentStatus
      })
      .eq('id', id)

    if (error) {
      console.error('[archiveTournament] Update error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[archiveTournament] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== SubEvent Status Actions ====================

/**
 * SubEvent를 published 상태로 변경
 */
export async function publishSubEvent(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB 함수 호출
    const { error } = await supabase.rpc('publish_sub_event', {
      sub_event_id: id
    })

    if (error) {
      console.error('[publishSubEvent] RPC error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[publishSubEvent] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * SubEvent를 draft 상태로 변경 (Unpublish)
 */
export async function unpublishSubEvent(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. 상태 변경
    const { error } = await supabase
      .from('sub_events')
      .update({
        status: 'draft' as ContentStatus,
        published_at: null,
        published_by: null
      })
      .eq('id', id)

    if (error) {
      console.error('[unpublishSubEvent] Update error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[unpublishSubEvent] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * SubEvent를 archived 상태로 변경
 */
export async function archiveSubEvent(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. 상태 변경
    const { error } = await supabase
      .from('sub_events')
      .update({
        status: 'archived' as ContentStatus
      })
      .eq('id', id)

    if (error) {
      console.error('[archiveSubEvent] Update error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[archiveSubEvent] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Stream Status Actions ====================

/**
 * Stream을 published 상태로 변경
 */
export async function publishStream(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB 함수 호출
    const { error } = await supabase.rpc('publish_stream', {
      stream_id: id
    })

    if (error) {
      console.error('[publishStream] RPC error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[publishStream] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Stream을 draft 상태로 변경 (Unpublish)
 */
export async function unpublishStream(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. 상태 변경
    const { error } = await supabase
      .from('streams')
      .update({
        status: 'draft' as ContentStatus,
        published_at: null,
        published_by: null
      })
      .eq('id', id)

    if (error) {
      console.error('[unpublishStream] Update error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[unpublishStream] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Stream을 archived 상태로 변경
 */
export async function archiveStream(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. 상태 변경
    const { error } = await supabase
      .from('streams')
      .update({
        status: 'archived' as ContentStatus
      })
      .eq('id', id)

    if (error) {
      console.error('[archiveStream] Update error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[archiveStream] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Bulk Operations ====================

/**
 * 여러 Stream을 한 번에 published 상태로 변경
 */
export async function bulkPublishStreams(ids: string[]): Promise<ActionResult<{ published: number }>> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!ids || ids.length === 0) {
      return { success: false, error: 'No stream IDs provided' }
    }

    const supabase = await createServerSupabaseClient()

    // 3. 대량 상태 변경
    const { data, error } = await supabase
      .from('streams')
      .update({
        status: 'published' as ContentStatus,
        published_by: authCheck.userId,
        published_at: new Date().toISOString()
      })
      .in('id', ids)
      .select('id')

    if (error) {
      console.error('[bulkPublishStreams] Update error:', error)
      return { success: false, error: error.message }
    }

    const published = data?.length || 0

    // 4. 캐시 무효화
    invalidateCache()

    return { success: true, data: { published } }
  } catch (error: any) {
    console.error('[bulkPublishStreams] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * 여러 Stream을 한 번에 draft 상태로 변경
 */
export async function bulkUnpublishStreams(ids: string[]): Promise<ActionResult<{ unpublished: number }>> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!ids || ids.length === 0) {
      return { success: false, error: 'No stream IDs provided' }
    }

    const supabase = await createServerSupabaseClient()

    // 3. 대량 상태 변경
    const { data, error } = await supabase
      .from('streams')
      .update({
        status: 'draft' as ContentStatus,
        published_at: null,
        published_by: null
      })
      .in('id', ids)
      .select('id')

    if (error) {
      console.error('[bulkUnpublishStreams] Update error:', error)
      return { success: false, error: error.message }
    }

    const unpublished = data?.length || 0

    // 4. 캐시 무효화
    invalidateCache()

    return { success: true, data: { unpublished } }
  } catch (error: any) {
    console.error('[bulkUnpublishStreams] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Validation ====================

/**
 * Stream 완료 체크리스트 검증
 *
 * 다음 항목을 검증합니다:
 * - YouTube 링크 존재 (필수)
 * - 핸드 개수 (최소 1개, 평균 대비 검증)
 * - 썸네일 존재 (권장)
 * - 플레이어 정보 완성도 (권장)
 * - 메타데이터 검증 (권장)
 */
export async function validateStreamChecklist(
  streamId: string
): Promise<ActionResult<StreamChecklistValidation>> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. Stream 정보 조회
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select(`
        id,
        name,
        video_url,
        video_source,
        sub_event_id
      `)
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      return { success: false, error: 'Stream not found' }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // 3. YouTube 링크 확인 (필수)
    const hasYouTubeLink = stream.video_source === 'youtube' && !!stream.video_url
    if (!hasYouTubeLink) {
      errors.push('YouTube link is required for publishing')
    }

    // 4. 핸드 개수 확인
    const { data: hands, error: handsError } = await supabase
      .from('hands')
      .select('id')
      .eq('day_id', streamId)

    const handCount = hands?.length || 0

    if (handCount === 0) {
      errors.push('At least 1 hand is required')
    }

    // 5. 평균 핸드 개수 대비 검증 (경고만)
    const { data: avgData } = await supabase
      .from('streams')
      .select('id')
      .eq('sub_event_id', stream.sub_event_id)

    if (avgData && avgData.length > 1) {
      // 같은 SubEvent의 다른 스트림들의 평균 핸드 개수 계산
      const { data: allHands } = await supabase
        .from('hands')
        .select('day_id')
        .in('day_id', avgData.map(s => s.id))

      if (allHands && allHands.length > 0) {
        const avgHandCount = Math.round(allHands.length / avgData.length)

        if (handCount < avgHandCount * 0.5) {
          warnings.push(
            `Hand count (${handCount}) is significantly lower than average (${avgHandCount})`
          )
        }
      }
    }

    // 6. 썸네일 존재 확인 (권장)
    const { data: handsWithThumbnail } = await supabase
      .from('hands')
      .select('id')
      .eq('day_id', streamId)
      .not('thumbnail_url', 'is', null)

    const hasThumbnail = (handsWithThumbnail?.length || 0) > 0

    if (!hasThumbnail && handCount > 0) {
      warnings.push('No thumbnail found for hands')
    }

    // 7. 플레이어 정보 완성도 확인 (권장)
    const { data: handPlayers } = await supabase
      .from('hand_players')
      .select('id, player_id, cards, position')
      .in('hand_id', (hands || []).map(h => h.id))

    const totalPlayers = handPlayers?.length || 0
    const playersWithInfo = handPlayers?.filter(
      hp => hp.player_id && hp.cards && hp.cards.length > 0 && hp.position
    ).length || 0

    const playersInfoComplete = totalPlayers > 0 && playersWithInfo / totalPlayers >= 0.8

    if (!playersInfoComplete && totalPlayers > 0) {
      warnings.push(
        `Player info incomplete (${playersWithInfo}/${totalPlayers} complete)`
      )
    }

    // 8. 메타데이터 검증 (권장)
    const hasMetadata = !!stream.name && stream.name.trim() !== ''

    if (!hasMetadata) {
      warnings.push('Stream name is empty or invalid')
    }

    // 9. 검증 결과 반환
    const validation: StreamChecklistValidation = {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        hasYouTubeLink,
        handCount,
        hasThumbnail,
        playersInfoComplete,
        hasMetadata
      }
    }

    return { success: true, data: validation }
  } catch (error: any) {
    console.error('[validateStreamChecklist] Exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}
