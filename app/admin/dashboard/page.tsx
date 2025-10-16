"use client"

export const runtime = 'edge'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { StatsCard } from "@/components/admin/stats-card"
import { ActivityFeed } from "@/components/admin/activity-feed"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { LinkButton } from "@/components/ui/link-button"
import {
  Users,
  FileText,
  MessageSquare,
  PlaySquare,
  UserPlus,
  Ban,
  AlertCircle,
  TrendingUp
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { isAdmin, getDashboardStats, getRecentActivity, type DashboardStats, type AdminLog } from "@/lib/admin"
import { toast } from "sonner"

export default function dashboardClient() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<AdminLog[]>([])
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [user])

  async function checkAccess() {
    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        toast.error("Admin privileges required")
        router.push("/")
        return
      }

      setHasAccess(true)
      loadDashboardData()
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("Error checking permissions")
      router.push("/")
    }
  }

  async function loadDashboardData() {
    try {
      const [statsData, activityData] = await Promise.all([
        getDashboardStats(),
        getRecentActivity(10)
      ])

      setStats(statsData)
      setActivities(activityData)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  if (!hasAccess || loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-7xl mx-auto py-8 px-4">
          <CardSkeleton count={4} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-title-lg mb-2">Admin Dashboard</h1>
            <p className="text-body text-muted-foreground">
              View platform statistics and recent activity
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton href="/admin/users" variant="outline">
              User Management
            </LinkButton>
            <LinkButton href="/admin/claims" variant="outline">
              Claim Management
            </LinkButton>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              description={`${stats.newUsersToday} joined today`}
            />
            <StatsCard
              title="Total Posts"
              value={stats.totalPosts}
              icon={FileText}
              description={`${stats.newPostsToday} created today`}
            />
            <StatsCard
              title="Total Comments"
              value={stats.totalComments}
              icon={MessageSquare}
            />
            <StatsCard
              title="Total Hands"
              value={stats.totalHands}
              icon={PlaySquare}
            />
          </div>
        )}

        {/* Secondary Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatsCard
              title="Total Players"
              value={stats.totalPlayers}
              icon={TrendingUp}
            />
            <StatsCard
              title="Banned Users"
              value={stats.bannedUsers}
              icon={Ban}
            />
            <StatsCard
              title="Pending Claims"
              value={stats.pendingClaims}
              icon={AlertCircle}
            />
          </div>
        )}

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-title mb-4">Recent Admin Activity</h2>
          <ActivityFeed activities={activities} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <LinkButton
            href="/admin/users"
            variant="outline"
            className="h-20 justify-start"
          >
            <Users className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="text-body font-semibold">User Management</div>
              <div className="text-caption text-muted-foreground">
                View users, ban, change roles
              </div>
            </div>
          </LinkButton>

          <LinkButton
            href="/admin/claims"
            variant="outline"
            className="h-20 justify-start"
          >
            <AlertCircle className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="text-body font-semibold">Claim Management</div>
              <div className="text-caption text-muted-foreground">
                Approve player profile claims
              </div>
            </div>
          </LinkButton>

          <LinkButton
            href="/community"
            variant="outline"
            className="h-20 justify-start"
          >
            <FileText className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="text-body font-semibold">Community Management</div>
              <div className="text-caption text-muted-foreground">
                Moderate posts and comments
              </div>
            </div>
          </LinkButton>
        </div>
      </div>
    </div>
  )
}
