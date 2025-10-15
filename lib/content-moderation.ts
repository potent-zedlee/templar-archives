import { createClientSupabaseClient } from './supabase-client'

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other'
export type ReportStatus = 'pending' | 'approved' | 'rejected'

export type Report = {
  id: string
  post_id: string | null
  comment_id: string | null
  reporter_id: string
  reporter_name: string
  reason: ReportReason
  description: string | null
  status: ReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_comment: string | null
  created_at: string
}

/**
 * 신고 생성
 */
export async function createReport({
  postId,
  commentId,
  reporterId,
  reporterName,
  reason,
  description
}: {
  postId?: string
  commentId?: string
  reporterId: string
  reporterName: string
  reason: ReportReason
  description?: string
}) {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('reports')
    .insert({
      post_id: postId || null,
      comment_id: commentId || null,
      reporter_id: reporterId,
      reporter_name: reporterName,
      reason,
      description: description || null,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 신고 목록 조회 (관리자)
 */
export async function fetchReports({
  status,
  limit = 50
}: {
  status?: ReportStatus
  limit?: number
} = {}) {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('reports')
    .select(`
      id,
      post_id,
      comment_id,
      reporter_id,
      reporter_name,
      reason,
      description,
      status,
      reviewed_by,
      reviewed_at,
      admin_comment,
      created_at,
      post:post_id (
        id,
        title,
        author_name
      ),
      comment:comment_id (
        id,
        content,
        author_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * 신고 승인 (콘텐츠 숨김)
 */
export async function approveReport({
  reportId,
  adminId,
  adminComment
}: {
  reportId: string
  adminId: string
  adminComment?: string
}) {
  const supabase = createClientSupabaseClient()

  // 1. Get report details
  const { data: report, error: fetchError } = await supabase
    .from('reports')
    .select('post_id, comment_id')
    .eq('id', reportId)
    .single()

  if (fetchError) throw fetchError

  // 2. Hide the content
  if (report.post_id) {
    const { error: hideError } = await supabase
      .from('posts')
      .update({ is_hidden: true })
      .eq('id', report.post_id)

    if (hideError) throw hideError
  } else if (report.comment_id) {
    const { error: hideError } = await supabase
      .from('comments')
      .update({ is_hidden: true })
      .eq('id', report.comment_id)

    if (hideError) throw hideError
  }

  // 3. Update report status
  const { data, error } = await supabase
    .from('reports')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      admin_comment: adminComment || null
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 신고 거부
 */
export async function rejectReport({
  reportId,
  adminId,
  adminComment
}: {
  reportId: string
  adminId: string
  adminComment?: string
}) {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      admin_comment: adminComment || null
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 콘텐츠 숨김 (직접)
 */
export async function hideContent({
  postId,
  commentId
}: {
  postId?: string
  commentId?: string
}) {
  const supabase = createClientSupabaseClient()

  if (postId) {
    const { error } = await supabase
      .from('posts')
      .update({ is_hidden: true })
      .eq('id', postId)

    if (error) throw error
  } else if (commentId) {
    const { error } = await supabase
      .from('comments')
      .update({ is_hidden: true })
      .eq('id', commentId)

    if (error) throw error
  }
}

/**
 * 콘텐츠 표시 (숨김 해제)
 */
export async function unhideContent({
  postId,
  commentId
}: {
  postId?: string
  commentId?: string
}) {
  const supabase = createClientSupabaseClient()

  if (postId) {
    const { error } = await supabase
      .from('posts')
      .update({ is_hidden: false })
      .eq('id', postId)

    if (error) throw error
  } else if (commentId) {
    const { error } = await supabase
      .from('comments')
      .update({ is_hidden: false })
      .eq('id', commentId)

    if (error) throw error
  }
}

/**
 * 콘텐츠 삭제 (관리자)
 */
export async function deleteContent({
  postId,
  commentId
}: {
  postId?: string
  commentId?: string
}) {
  const supabase = createClientSupabaseClient()

  if (postId) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) throw error
  } else if (commentId) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
  }
}

/**
 * 포스트 목록 조회 (관리자 - 숨김 포함)
 */
export async function fetchAllPosts({
  includeHidden = true,
  limit = 50
}: {
  includeHidden?: boolean
  limit?: number
} = {}) {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      author_name,
      category,
      likes_count,
      comments_count,
      is_hidden,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!includeHidden) {
    query = query.eq('is_hidden', false)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * 댓글 목록 조회 (관리자 - 숨김 포함)
 */
export async function fetchAllComments({
  includeHidden = true,
  limit = 50
}: {
  includeHidden?: boolean
  limit?: number
} = {}) {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('comments')
    .select(`
      id,
      content,
      author_name,
      post_id,
      hand_id,
      is_hidden,
      created_at,
      post:post_id (
        title
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!includeHidden) {
    query = query.eq('is_hidden', false)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}
