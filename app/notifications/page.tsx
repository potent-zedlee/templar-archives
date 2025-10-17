"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Check, Trash2, CheckCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  formatNotificationTime,
  type Notification,
  type NotificationType,
} from "@/lib/notifications"
import { useAuth } from "@/components/auth-provider"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"

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
  comment: "bg-blue-500/10 text-blue-500",
  reply: "bg-purple-500/10 text-purple-500",
  like_post: "bg-pink-500/10 text-pink-500",
  like_comment: "bg-pink-500/10 text-pink-500",
  edit_approved: "bg-green-500/10 text-green-500",
  edit_rejected: "bg-red-500/10 text-red-500",
  claim_approved: "bg-green-500/10 text-green-500",
  claim_rejected: "bg-red-500/10 text-red-500",
  mention: "bg-yellow-500/10 text-yellow-500",
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    loadNotifications()
  }, [user, activeTab, router])

  async function loadNotifications() {
    setLoading(true)
    try {
      const data = await fetchNotifications({
        unreadOnly: activeTab === "unread",
      })
      setNotifications(data)
    } catch (error) {
      console.error("Error loading notifications:", error)
      toast.error("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await markAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      toast.success("Marked as read")
    } catch (error) {
      console.error("Error marking as read:", error)
      toast.error("Failed to mark as read")
    }
  }

  async function handleMarkAllAsRead() {
    setActionLoading(true)
    try {
      await markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success("All notifications marked as read")
    } catch (error) {
      console.error("Error marking all as read:", error)
      toast.error("Failed to mark all as read")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete(notificationId: string) {
    try {
      await deleteNotification(notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      toast.success("Notification deleted")
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
    }
  }

  async function handleDeleteAllRead() {
    setActionLoading(true)
    try {
      await deleteAllRead()
      setNotifications((prev) => prev.filter((n) => !n.is_read))
      toast.success("All read notifications deleted")
    } catch (error) {
      console.error("Error deleting read notifications:", error)
      toast.error("Failed to delete read notifications")
    } finally {
      setActionLoading(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-title-lg mb-2">Notifications</h1>
          <p className="text-body-lg text-muted-foreground">
            Stay updated with your activity and interactions
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="secondary">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {notifications.some((n) => !n.is_read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={actionLoading}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            {notifications.some((n) => n.is_read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteAllRead}
                disabled={actionLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete read
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {loading ? (
              <CardSkeleton count={5} variant="compact" />
            ) : notifications.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-title mb-2">No notifications</h3>
                <p className="text-body text-muted-foreground">
                  {activeTab === "unread"
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications yet."}
                </p>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 transition-colors ${
                    !notification.is_read ? "bg-primary/5 border-primary/20" : ""
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                    )}

                    {/* Sender avatar */}
                    {notification.sender && (
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage
                          src={notification.sender.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {notification.sender.nickname
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={notificationTypeColors[notification.type]}
                            >
                              {notificationTypeLabels[notification.type]}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {formatNotificationTime(notification.created_at)}
                            </p>
                          </div>
                          <p className="text-sm font-medium mb-1">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 flex-shrink-0">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Link */}
                      {notification.link && (
                        <Link href={notification.link}>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => {
                              if (!notification.is_read) {
                                handleMarkAsRead(notification.id)
                              }
                            }}
                          >
                            View →
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
