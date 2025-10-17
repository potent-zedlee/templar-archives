import { createClientSupabaseClient } from './supabase-client'

export type NotificationType =
  | 'comment'
  | 'reply'
  | 'like_post'
  | 'like_comment'
  | 'edit_approved'
  | 'edit_rejected'
  | 'claim_approved'
  | 'claim_rejected'
  | 'mention'

export type Notification = {
  id: string
  recipient_id: string
  sender_id: string | null
  type: NotificationType
  title: string
  message: string
  link: string | null
  post_id: string | null
  comment_id: string | null
  hand_id: string | null
  edit_request_id: string | null
  claim_id: string | null
  is_read: boolean
  created_at: string
  // Joined sender info
  sender?: {
    nickname: string
    avatar_url: string | null
  }
}

/**
 * Fetch notifications for the current user
 */
export async function fetchNotifications(options?: {
  limit?: number
  unreadOnly?: boolean
  type?: NotificationType
}): Promise<Notification[]> {
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('notifications')
    .select(`
      *,
      sender:sender_id (
        nickname,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })

  if (options?.unreadOnly) {
    query = query.eq('is_read', false)
  }

  if (options?.type) {
    query = query.eq('type', options.type)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) throw error

  // Map sender info
  return (data as any[]).map((notification) => ({
    ...notification,
    sender: notification.sender
      ? {
          nickname: notification.sender.nickname,
          avatar_url: notification.sender.avatar_url,
        }
      : undefined,
  })) as Notification[]
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = createClientSupabaseClient()

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  if (error) throw error

  return count || 0
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = createClientSupabaseClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) throw error
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const supabase = createClientSupabaseClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  if (error) throw error
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = createClientSupabaseClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) throw error
}

/**
 * Delete all read notifications
 */
export async function deleteAllRead(): Promise<void> {
  const supabase = createClientSupabaseClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('is_read', true)

  if (error) throw error
}

/**
 * Subscribe to real-time notifications
 * Returns a subscription object with unsubscribe method
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const supabase = createClientSupabaseClient()

  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      async (payload) => {
        // Fetch full notification with sender info
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            sender:sender_id (
              nickname,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (!error && data) {
          const notification: Notification = {
            ...data,
            sender: data.sender
              ? {
                  nickname: data.sender.nickname,
                  avatar_url: data.sender.avatar_url,
                }
              : undefined,
          }
          callback(notification)
        }
      }
    )
    .subscribe()

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'comment':
    case 'reply':
      return '💬'
    case 'like_post':
    case 'like_comment':
      return '👍'
    case 'edit_approved':
    case 'claim_approved':
      return '✅'
    case 'edit_rejected':
    case 'claim_rejected':
      return '❌'
    case 'mention':
      return '@'
    default:
      return '🔔'
  }
}

/**
 * Format notification time (relative)
 */
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
