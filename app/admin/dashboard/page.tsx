"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  TrendingUp,
  Activity
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { isAdmin } from "@/lib/admin"
import { useDashboardStatsQuery, useRecentActivityQuery } from "@/lib/queries/admin-queries"
import { toast } from "sonner"

export default function dashboardClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)

  // React Query hooks
  const { data: stats = null, isLoading: statsLoading } = useDashboardStatsQuery()
  const { data: activities = [], isLoading: activitiesLoading } = useRecentActivityQuery(10)

  const loading = statsLoading || activitiesLoading

  useEffect(() => {
    checkAccess()
  }, [user, authLoading])

  async function checkAccess() {
    // Wait for auth loading to complete
    if (authLoading) return

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
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("Error checking permissions")
      router.push("/")
    }
  }

  if (!hasAccess || loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <CardSkeleton count={4} />
      </div>
    )
  }

  return (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            href="/admin/performance"
            variant="outline"
            className="h-20 justify-start"
          >
            <Activity className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="text-body font-semibold">Performance</div>
              <div className="text-caption text-muted-foreground">
                View Web Vitals & metrics
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
              <div className="text-body font-semibold">Community</div>
              <div className="text-caption text-muted-foreground">
                Moderate posts and comments
              </div>
            </div>
          </LinkButton>
        </div>
      </div>
  )
}
