"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Trash2, CheckCheck } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  useNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllReadMutation,
} from "@/lib/queries/notification-queries"
import {
  formatNotificationTime,
  type NotificationType,
} from "@/lib/notifications"
import { useAuth } from "@/components/layout/AuthProvider"
import { CardSkeleton } from "@/components/ui/skeletons/CardSkeleton"

const notificationTypeLabels: Record<NotificationType, string> = {
  comment: "Comment",
  reply: "Reply",
  like_post: "Post Like",
  like_comment: "Comment Like",
  edit_approved: "Edit Approved",
  edit_rejected: "Edit Rejected",
  claim_approved: "Claim Approved",
  claim_rejected: "Claim Rejected",
  mention: "Mention",
}

const notificationTypeColors: Record<NotificationType, string> = {
  comment: "bg-blue-500/10 text-blue-500 border-blue-500",
  reply: "bg-purple-500/10 text-purple-500 border-purple-500",
  like_post: "bg-pink-500/10 text-pink-500 border-pink-500",
  like_comment: "bg-pink-500/10 text-pink-500 border-pink-500",
  edit_approved: "bg-green-500/10 text-green-500 border-green-500",
  edit_rejected: "bg-red-500/10 text-red-500 border-red-500",
  claim_approved: "bg-green-500/10 text-green-500 border-green-500",
  claim_rejected: "bg-red-500/10 text-red-500 border-red-500",
  mention: "bg-yellow-500/10 text-yellow-500 border-yellow-500",
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")

  // React Query hooks
  const { data: notifications = [], isLoading: loading } = useNotificationsQuery({
    unreadOnly: activeTab === "unread",
  })
  const markAsReadMutation = useMarkAsReadMutation()
  const markAllAsReadMutation = useMarkAllAsReadMutation()
  const deleteNotificationMutation = useDeleteNotificationMutation()
  const deleteAllReadMutation = useDeleteAllReadMutation()

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, router])

  function handleMarkAsRead(notificationId: string) {
    markAsReadMutation.mutate(notificationId, {
      onSuccess: () => {
        toast.success("Marked as read")
      },
      onError: () => {
        toast.error("Failed to mark as read")
      },
    })
  }

  function handleMarkAllAsRead() {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("All notifications marked as read")
      },
      onError: () => {
        toast.error("Failed to mark all as read")
      },
    })
  }

  function handleDelete(notificationId: string) {
    deleteNotificationMutation.mutate(notificationId, {
      onSuccess: () => {
        toast.success("Notification deleted")
      },
      onError: () => {
        toast.error("Failed to delete notification")
      },
    })
  }

  function handleDeleteAllRead() {
    deleteAllReadMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("All read notifications deleted")
      },
      onError: () => {
        toast.error("Failed to delete read notifications")
      },
    })
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black-100">
      <div className="container max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-heading text-2xl mb-2">NOTIFICATIONS</h1>
          <p className="text-black-600">
            Stay updated with your activity and interactions
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="px-2 py-1 border border-gold-600 bg-gold-700/20 text-xs uppercase font-mono">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="btn-secondary flex items-center gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
            {notifications.some((n) => n.is_read) && (
              <button
                onClick={handleDeleteAllRead}
                disabled={deleteAllReadMutation.isPending}
                className="btn-secondary flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete read
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <div className="flex gap-2 border-b-2 border-black-300">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 border-b-2 -mb-0.5 transition-colors ${
                activeTab === "all"
                  ? "border-gold-400 text-gold-400"
                  : "border-transparent text-black-600 hover:text-black-800"
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-4 py-2 border-b-2 -mb-0.5 transition-colors flex items-center gap-2 ${
                activeTab === "unread"
                  ? "border-gold-400 text-gold-400"
                  : "border-transparent text-black-600 hover:text-black-800"
              }`}
            >
              UNREAD
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 border border-gold-600 bg-gold-700/20 text-xs font-mono">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <CardSkeleton count={5} variant="compact" />
            ) : notifications.length === 0 ? (
              <div className="card-postmodern p-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-black-600 opacity-50" />
                <h3 className="text-heading mb-2">NO NOTIFICATIONS</h3>
                <p className="text-black-600">
                  {activeTab === "unread"
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications yet."}
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`card-postmodern p-4 transition-colors ${
                    !notification.is_read ? "border-l-3 border-gold-400 gold-glow" : "border-l-3 border-black-400"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="flex-shrink-0 w-2 h-2 mt-2 bg-gold-400 gold-glow"></div>
                    )}

                    {/* Sender avatar */}
                    {notification.sender && (
                      <div className="h-10 w-10 flex-shrink-0 border-2 border-gold-700 gold-glow bg-black-200 flex items-center justify-center overflow-hidden relative">
                        {notification.sender.avatar_url ? (
                          <Image
                            src={notification.sender.avatar_url}
                            alt={notification.sender.nickname}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gold-400">
                            {notification.sender.nickname
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 border text-xs uppercase ${notificationTypeColors[notification.type]}`}>
                              {notificationTypeLabels[notification.type]}
                            </span>
                            <p className="text-xs text-black-600 font-mono">
                              {formatNotificationTime(notification.created_at)}
                            </p>
                          </div>
                          <p className="text-sm font-medium mb-1">
                            {notification.title}
                          </p>
                          <p className="text-sm text-black-600">
                            {notification.message}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 flex-shrink-0">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="btn-ghost p-2"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="btn-ghost p-2"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Link */}
                      {notification.link && (
                        <Link href={notification.link}>
                          <button
                            onClick={() => {
                              if (!notification.is_read) {
                                handleMarkAsRead(notification.id)
                              }
                            }}
                            className="text-gold-400 hover:text-gold-300 transition-colors text-xs uppercase"
                          >
                            View →
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
