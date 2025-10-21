import { createClientSupabaseClient } from './supabase-client'

export type AdminRole = 'user' | 'high_templar' | 'admin' | 'reporter'

export type AdminLog = {
  id: string
  admin_id: string
  action: string
  target_type: 'user' | 'post' | 'comment' | 'hand' | 'player'
  target_id?: string
  details?: Record<string, any>
  created_at: string
  admin?: {
    nickname: string
    avatar_url?: string
  }
}

export type DashboardStats = {
  totalUsers: number
  totalPosts: number
  totalComments: number
  totalHands: number
  totalPlayers: number
  newUsersToday: number
  newPostsToday: number
  bannedUsers: number
  pendingClaims: number
}

/**
 * Check if current user is admin
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  const supabase = createClientSupabaseClient()

  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    userId = user.id
  }

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  return data?.role === 'admin' || data?.role === 'high_templar'
}

/**
 * Check if current user is reporter
 */
export async function isReporter(userId?: string): Promise<boolean> {
  const supabase = createClientSupabaseClient()

  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    userId = user.id
  }

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  return data?.role === 'reporter'
}

/**
 * Check if current user is reporter or admin
 */
export async function isReporterOrAdmin(userId?: string): Promise<boolean> {
  const supabase = createClientSupabaseClient()

  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    userId = user.id
  }

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  return data?.role === 'reporter' || data?.role === 'admin' || data?.role === 'high_templar'
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createClientSupabaseClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalUsers },
    { count: totalPosts },
    { count: totalComments },
    { count: totalHands },
    { count: totalPlayers },
    { count: newUsersToday },
    { count: newPostsToday },
    { count: bannedUsers },
    { count: pendingClaims }
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('hands').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    supabase.from('player_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  ])

  return {
    totalUsers: totalUsers || 0,
    totalPosts: totalPosts || 0,
    totalComments: totalComments || 0,
    totalHands: totalHands || 0,
    totalPlayers: totalPlayers || 0,
    newUsersToday: newUsersToday || 0,
    newPostsToday: newPostsToday || 0,
    bannedUsers: bannedUsers || 0,
    pendingClaims: pendingClaims || 0
  }
}

/**
 * Get recent admin activity
 */
export async function getRecentActivity(limit: number = 20) {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from('admin_logs')
    .select(`
      *,
      admin:admin_id (nickname, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * Get all users with pagination
 */
export async function getUsers(options?: {
  page?: number
  limit?: number
  role?: AdminRole
  banned?: boolean
  search?: string
}) {
  const supabase = createClientSupabaseClient()
  const page = options?.page || 1
  const limit = options?.limit || 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })

  if (options?.role) {
    query = query.eq('role', options.role)
  }

  if (options?.banned !== undefined) {
    query = query.eq('is_banned', options.banned)
  }

  if (options?.search) {
    query = query.or(`nickname.ilike.%${options.search}%,email.ilike.%${options.search}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    users: data,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  }
}

/**
 * Ban user
 */
export async function banUser(userId: string, reason: string, adminId: string) {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      is_banned: true,
      ban_reason: reason,
      banned_at: new Date().toISOString(),
      banned_by: adminId
    })
    .eq('id', userId)

  if (error) throw error

  // Log action
  await logAdminAction(adminId, 'ban_user', 'user', userId, { reason })
}

/**
 * Unban user
 */
export async function unbanUser(userId: string, adminId: string) {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      is_banned: false,
      ban_reason: null,
      banned_at: null,
      banned_by: null
    })
    .eq('id', userId)

  if (error) throw error

  // Log action
  await logAdminAction(adminId, 'unban_user', 'user', userId)
}

/**
 * Change user role
 */
export async function changeUserRole(userId: string, role: AdminRole, adminId: string) {
  const supabase = createClientSupabaseClient()

  console.log('changeUserRole called:', { userId, role, adminId })

  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()

  if (error) {
    console.error('Supabase error in changeUserRole:', error)
    throw error
  }

  console.log('Role change result:', data)

  // Log action
  await logAdminAction(adminId, 'change_role', 'user', userId, { role })
}

/**
 * Delete post (admin)
 */
export async function deletePost(postId: string, reason: string, adminId: string) {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)

  if (error) throw error

  // Log action
  await logAdminAction(adminId, 'delete_post', 'post', postId, { reason })
}

/**
 * Delete comment (admin)
 */
export async function deleteComment(commentId: string, reason: string, adminId: string) {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error

  // Log action
  await logAdminAction(adminId, 'delete_comment', 'comment', commentId, { reason })
}

/**
 * Log admin action
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: 'user' | 'post' | 'comment' | 'hand' | 'player',
  targetId?: string,
  details?: Record<string, any>
) {
  const supabase = createClientSupabaseClient()
  const { error } = await supabase
    .from('admin_logs')
    .insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details
    })

  if (error) throw error
}

/**
 * Get recent posts (for moderation)
 */
export async function getRecentPosts(limit: number = 50) {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:author_id (nickname, avatar_url, is_banned)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * Get recent comments (for moderation)
 */
export async function getRecentComments(limit: number = 50) {
  const supabase = createClientSupabaseClient()
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      author:author_id (nickname, avatar_url, is_banned),
      post:post_id (id, title)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}
