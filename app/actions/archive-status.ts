'use server'

/**
 * Archive Status Management Server Actions
 *
 * Stream 상태 관리 (Publish/Unpublish) 전용 액션
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

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

// ==================== Stream Status Actions ====================

/**
 * Publish Stream
 */
export async function publishStream(streamId: string) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB 업데이트
    const { error } = await supabase
      .from('streams')
      .update({
        status: 'published',
        published_by: authCheck.userId,
        published_at: new Date().toISOString(),
      })
      .eq('id', streamId)

    if (error) {
      console.error('[Server Action] Publish stream error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Publish stream exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Unpublish Stream (back to draft)
 */
export async function unpublishStream(streamId: string) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB 업데이트
    const { error } = await supabase
      .from('streams')
      .update({
        status: 'draft',
        published_by: null,
        published_at: null,
      })
      .eq('id', streamId)

    if (error) {
      console.error('[Server Action] Unpublish stream error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Unpublish stream exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Bulk Publish Streams
 */
export async function bulkPublishStreams(streamIds: string[]) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    if (streamIds.length === 0) {
      return { success: false, error: 'No streams selected' }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB 대량 업데이트
    const { error } = await supabase
      .from('streams')
      .update({
        status: 'published',
        published_by: authCheck.userId,
        published_at: new Date().toISOString(),
      })
      .in('id', streamIds)

    if (error) {
      console.error('[Server Action] Bulk publish streams error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Bulk publish streams exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Bulk Unpublish Streams
 */
export async function bulkUnpublishStreams(streamIds: string[]) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    if (streamIds.length === 0) {
      return { success: false, error: 'No streams selected' }
    }

    const supabase = await createServerSupabaseClient()

    // 2. DB 대량 업데이트
    const { error } = await supabase
      .from('streams')
      .update({
        status: 'draft',
        published_by: null,
        published_at: null,
      })
      .in('id', streamIds)

    if (error) {
      console.error('[Server Action] Bulk unpublish streams error:', error)
      return { success: false, error: error.message }
    }

    // 3. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Bulk unpublish streams exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}
