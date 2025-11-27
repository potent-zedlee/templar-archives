/**
 * Notification React Query Hooks (Firestore Version)
 *
 * 알림 시스템의 데이터 페칭을 위한 React Query hooks
 * Supabase에서 Firestore로 마이그레이션됨
 *
 * @module lib/queries/notification-queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  type Notification,
  type NotificationType,
} from '@/lib/notifications'

// ==================== Query Keys ====================

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters?: { limit?: number; unreadOnly?: boolean; type?: NotificationType }) =>
    [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

// ==================== Notifications Query ====================

/**
 * Fetch notifications
 */
export function useNotificationsQuery(options?: {
  limit?: number
  unreadOnly?: boolean
  type?: NotificationType
}) {
  return useQuery({
    queryKey: notificationKeys.list(options),
    queryFn: async () => {
      return await fetchNotifications(options)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Get unread notification count (with polling)
 */
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      return await getUnreadCount()
    },
    staleTime: 30 * 1000, // 30초
    gcTime: 2 * 60 * 1000, // 2분
    refetchInterval: 60 * 1000, // 1분마다 폴링
  })
}

// ==================== Mutations ====================

/**
 * Mark a notification as read (Optimistic Update)
 */
export function useMarkAsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await markAsRead(notificationId)
    },
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() })

      // Snapshot previous values
      const previousNotifications = queryClient.getQueriesData({ queryKey: notificationKeys.lists() })

      // Optimistically update all notification lists
      queryClient.setQueriesData({ queryKey: notificationKeys.lists() }, (old: Notification[] | undefined) => {
        if (!old) return old
        return old.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      })

      // Optimistically update unread count
      const previousUnreadCount = queryClient.getQueryData(notificationKeys.unreadCount())
      queryClient.setQueryData(notificationKeys.unreadCount(), (old: number = 0) => Math.max(0, old - 1))

      return { previousNotifications, previousUnreadCount }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnreadCount)
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

/**
 * Mark all notifications as read (Optimistic Update)
 */
export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await markAllAsRead()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() })

      const previousNotifications = queryClient.getQueriesData({ queryKey: notificationKeys.lists() })

      // Mark all as read
      queryClient.setQueriesData({ queryKey: notificationKeys.lists() }, (old: Notification[] | undefined) => {
        if (!old) return old
        return old.map((n) => ({ ...n, is_read: true }))
      })

      // Set unread count to 0
      const previousUnreadCount = queryClient.getQueryData(notificationKeys.unreadCount())
      queryClient.setQueryData(notificationKeys.unreadCount(), 0)

      return { previousNotifications, previousUnreadCount }
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnreadCount)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

/**
 * Delete a notification (Optimistic Update)
 */
export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await deleteNotification(notificationId)
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() })

      const previousNotifications = queryClient.getQueriesData({ queryKey: notificationKeys.lists() })

      // Find if the notification is unread
      let wasUnread = false
      queryClient.setQueriesData({ queryKey: notificationKeys.lists() }, (old: Notification[] | undefined) => {
        if (!old) return old
        const notification = old.find((n) => n.id === notificationId)
        if (notification && !notification.is_read) {
          wasUnread = true
        }
        return old.filter((n) => n.id !== notificationId)
      })

      // Decrement unread count if needed
      const previousUnreadCount = queryClient.getQueryData(notificationKeys.unreadCount())
      if (wasUnread) {
        queryClient.setQueryData(notificationKeys.unreadCount(), (old: number = 0) => Math.max(0, old - 1))
      }

      return { previousNotifications, previousUnreadCount, wasUnread }
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      if (context?.previousUnreadCount !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnreadCount)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
    },
  })
}

/**
 * Delete all read notifications
 */
export function useDeleteAllReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await deleteAllRead()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() })

      const previousNotifications = queryClient.getQueriesData({ queryKey: notificationKeys.lists() })

      // Remove all read notifications
      queryClient.setQueriesData({ queryKey: notificationKeys.lists() }, (old: Notification[] | undefined) => {
        if (!old) return old
        return old.filter((n) => !n.is_read)
      })

      return { previousNotifications }
    },
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        context.previousNotifications.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    },
  })
}
