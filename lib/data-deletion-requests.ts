/**
 * Data Deletion Requests Library
 *
 * GDPR/CCPA/PIPL 데이터 삭제 요청 관리
 */

import { createClientSupabaseClient } from './supabase-client'

export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface DeletionRequest {
  id: string
  user_id: string
  reason: string
  status: DeletionRequestStatus
  requested_at: string
  reviewed_at?: string
  reviewed_by?: string
  completed_at?: string
  admin_notes?: string
  created_at: string
  updated_at: string
}

export interface DeletionRequestWithUser extends DeletionRequest {
  user: {
    id: string
    email: string
    nickname: string
    avatar_url: string
  }
  reviewed_by_user?: {
    id: string
    email: string
    nickname: string
  }
}

/**
 * Get all deletion requests (admin)
 */
export async function getAllDeletionRequests(): Promise<{
  data: DeletionRequestWithUser[]
  error: Error | null
}> {
  try {
    const supabase = createClientSupabaseClient()

    const { data, error } = await supabase
      .from('data_deletion_requests')
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          nickname,
          avatar_url
        ),
        reviewed_by_user:users!reviewed_by (
          id,
          email,
          nickname
        )
      `)
      .order('requested_at', { ascending: false })

    if (error) throw error

    return { data: data as DeletionRequestWithUser[], error: null }
  } catch (error) {
    console.error('Error fetching deletion requests:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * Get pending deletion requests (admin)
 */
export async function getPendingDeletionRequests(): Promise<{
  data: DeletionRequestWithUser[]
  error: Error | null
}> {
  try {
    const supabase = createClientSupabaseClient()

    const { data, error } = await supabase
      .from('data_deletion_requests')
      .select(`
        *,
        user:users!user_id (
          id,
          email,
          nickname,
          avatar_url
        )
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })

    if (error) throw error

    return { data: data as DeletionRequestWithUser[], error: null }
  } catch (error) {
    console.error('Error fetching pending deletion requests:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * Approve deletion request (admin)
 */
export async function approveDeletionRequest({
  requestId,
  adminId,
  adminNotes,
}: {
  requestId: string
  adminId: string
  adminNotes?: string
}): Promise<{ error: Error | null }> {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase
      .from('data_deletion_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        admin_notes: adminNotes,
      })
      .eq('id', requestId)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error('Error approving deletion request:', error)
    return { error: error as Error }
  }
}

/**
 * Reject deletion request (admin)
 */
export async function rejectDeletionRequest({
  requestId,
  adminId,
  rejectedReason,
  adminNotes,
}: {
  requestId: string
  adminId: string
  rejectedReason: string
  adminNotes?: string
}): Promise<{ error: Error | null }> {
  try {
    const supabase = createClientSupabaseClient()

    const combinedNotes = adminNotes
      ? `Rejection Reason: ${rejectedReason}\n\nAdmin Notes: ${adminNotes}`
      : `Rejection Reason: ${rejectedReason}`

    const { error } = await supabase
      .from('data_deletion_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        admin_notes: combinedNotes,
      })
      .eq('id', requestId)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error('Error rejecting deletion request:', error)
    return { error: error as Error }
  }
}

/**
 * Mark deletion request as completed (admin)
 * This should be called after all user data has been permanently deleted
 */
export async function completeDeletionRequest({
  requestId,
  adminId,
}: {
  requestId: string
  adminId: string
}): Promise<{ error: Error | null }> {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase
      .from('data_deletion_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error('Error completing deletion request:', error)
    return { error: error as Error }
  }
}

/**
 * Delete all user data (admin)
 * WARNING: This permanently deletes ALL user data
 * Should only be called after deletion request is approved
 */
export async function deleteUserData(userId: string): Promise<{ error: Error | null }> {
  try {
    const supabase = createClientSupabaseClient()

    // Delete in order (respecting foreign key constraints)

    // 1. Delete user's comments
    await supabase.from('comments').delete().eq('user_id', userId)

    // 2. Delete user's posts
    await supabase.from('posts').delete().eq('user_id', userId)

    // 3. Delete user's bookmarks
    await supabase.from('bookmarks').delete().eq('user_id', userId)

    // 4. Delete user's bookmark folders
    await supabase.from('bookmark_folders').delete().eq('user_id', userId)

    // 5. Delete user's hand edit requests
    await supabase.from('hand_edit_requests').delete().eq('user_id', userId)

    // 6. Delete user's activity logs
    await supabase.from('activity_logs').delete().eq('user_id', userId)

    // 7. Delete user's player claims
    await supabase.from('player_claims').delete().eq('user_id', userId)

    // 8. Delete user's content reports
    await supabase.from('content_reports').delete().eq('reporter_id', userId)

    // 9. Delete user's profile (this will cascade to deletion requests due to ON DELETE CASCADE)
    const { error } = await supabase.from('users').delete().eq('id', userId)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error('Error deleting user data:', error)
    return { error: error as Error }
  }
}
