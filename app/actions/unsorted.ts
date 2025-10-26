'use server'

/**
 * Unsorted Videos 관리 Server Actions
 *
 * 관리자 전용 Unsorted 비디오 관리 기능
 * - CRUD 작업
 * - 배치 조직화
 * - 서버 사이드 권한 검증
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

/**
 * Normalize YouTube URL to standard format
 */
function normalizeYoutubeUrl(url: string): string {
  try {
    url = url.trim()

    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url
    }

    const urlObj = new URL(url)

    // Handle youtu.be short URLs
    if (urlObj.hostname === 'youtu.be' || urlObj.hostname === 'www.youtu.be') {
      const videoId = urlObj.pathname.slice(1)
      return `https://www.youtube.com/watch?v=${videoId}`
    }

    // Handle youtube.com URLs
    if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
      return url.replace(/^(https?:\/\/)youtube\.com/, '$1www.youtube.com')
    }

    return url
  } catch (error) {
    console.error('Error normalizing YouTube URL:', error)
    return url
  }
}

// ==================== Unsorted Video Actions ====================

/**
 * Create a new unsorted video
 */
export async function createUnsortedVideo(data: {
  name: string
  video_url?: string
  video_file?: string
  video_source?: 'youtube' | 'local' | 'nas'
  published_at?: string
}) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  const supabase = await createServerSupabaseClient()

  // Normalize YouTube URL if provided
  let normalizedUrl = data.video_url || null
  if (normalizedUrl && data.video_source === 'youtube') {
    normalizedUrl = normalizeYoutubeUrl(normalizedUrl)
  }

  const { data: result, error: insertError } = await supabase
    .from('streams')
    .insert({
      name: data.name,
      video_url: normalizedUrl,
      video_file: data.video_file || null,
      video_source: data.video_source || 'youtube',
      sub_event_id: null,
      is_organized: false,
      published_at: data.published_at || null,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Error creating unsorted video:', insertError)
    return { success: false, error: insertError.message }
  }

  revalidatePath('/admin/archive')
  return { success: true, id: result.id }
}

/**
 * Update an unsorted video
 */
export async function updateUnsortedVideo(
  id: string,
  data: {
    name?: string
    video_url?: string
    video_file?: string
    video_source?: 'youtube' | 'local' | 'nas'
    published_at?: string
  }
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  const supabase = await createServerSupabaseClient()

  // Build update object
  const updateData: Record<string, any> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.video_url !== undefined) {
    updateData.video_url = data.video_source === 'youtube' && data.video_url
      ? normalizeYoutubeUrl(data.video_url)
      : data.video_url
  }
  if (data.video_file !== undefined) updateData.video_file = data.video_file
  if (data.video_source !== undefined) updateData.video_source = data.video_source
  if (data.published_at !== undefined) updateData.published_at = data.published_at

  const { error: updateError } = await supabase
    .from('streams')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    console.error('Error updating unsorted video:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/admin/archive')
  return { success: true }
}

/**
 * Delete an unsorted video
 */
export async function deleteUnsortedVideo(id: string) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  const supabase = await createServerSupabaseClient()

  const { error: deleteError } = await supabase
    .from('streams')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Error deleting unsorted video:', deleteError)
    return { success: false, error: deleteError.message }
  }

  revalidatePath('/admin/archive')
  return { success: true }
}

/**
 * Delete multiple unsorted videos (batch)
 */
export async function deleteUnsortedVideosBatch(ids: string[]) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  const supabase = await createServerSupabaseClient()

  const { error: deleteError } = await supabase
    .from('streams')
    .delete()
    .in('id', ids)

  if (deleteError) {
    console.error('Error deleting unsorted videos:', deleteError)
    return { success: false, error: deleteError.message }
  }

  revalidatePath('/admin/archive')
  return { success: true }
}

/**
 * Organize a video by assigning it to a sub_event
 */
export async function organizeUnsortedVideo(
  videoId: string,
  subEventId: string
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  const supabase = await createServerSupabaseClient()

  const { error: updateError } = await supabase
    .from('streams')
    .update({
      sub_event_id: subEventId,
      is_organized: true,
      organized_at: new Date().toISOString(),
    })
    .eq('id', videoId)

  if (updateError) {
    console.error('Error organizing video:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/admin/archive')
  return { success: true }
}

/**
 * Organize multiple videos at once (batch)
 */
export async function organizeUnsortedVideosBatch(
  videoIds: string[],
  subEventId: string
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  const supabase = await createServerSupabaseClient()

  const { error: updateError } = await supabase
    .from('streams')
    .update({
      sub_event_id: subEventId,
      is_organized: true,
      organized_at: new Date().toISOString(),
    })
    .in('id', videoIds)

  if (updateError) {
    console.error('Error organizing videos:', updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath('/admin/archive')
  return { success: true }
}

/**
 * Get all unsorted videos (admin only)
 */
export async function getUnsortedVideos() {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error, data: [] }
  }

  const supabase = await createServerSupabaseClient()

  const { data, error: fetchError } = await supabase
    .from('streams')
    .select('id, name, video_url, video_file, video_source, created_at, published_at')
    .is('sub_event_id', null)
    .eq('is_organized', false)
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching unsorted videos:', fetchError)
    return { success: false, error: fetchError.message, data: [] }
  }

  return { success: true, data: data || [] }
}
