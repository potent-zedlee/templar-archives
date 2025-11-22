"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { StatsCard } from "@/components/admin/StatsCard"
import { ActivityFeed } from "@/components/admin/ActivityFeed"
import { CardSkeleton } from "@/components/skeletons/CardSkeleton"
import {
  Users,
  FileText,
  MessageSquare,
  PlaySquare,
  Ban,
  AlertCircle,
  TrendingUp,
  Activity,
  Shield,
  Archive,
  UserCheck,
  Settings,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import { isAdmin } from "@/lib/admin"
import { useDashboardStatsQuery, useRecentActivityQuery } from "@/lib/queries/admin-queries"
import { toast } from "sonner"
import {
  useUserGrowthData,
  useContentDistribution,
  useSecurityEvents,
} from "@/hooks/admin/useDashboardChartData"
import Link from "next/link"

// Dynamic imports for chart components to reduce bundle size
const UserGrowthChart = dynamic(
  () => import("@/components/admin/dashboard/UserGrowthChart").then(mod => ({ default: mod.UserGrowthChart })),
  {
    loading: () => (
      <div className="card-postmodern p-6">
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-pulse text-muted-foreground">LOADING CHART...</div>
        </div>
      </div>
    ),
  }
)

const ContentDistributionChart = dynamic(
  () => import("@/components/admin/dashboard/ContentDistributionChart").then(mod => ({ default: mod.ContentDistributionChart })),
  {
    loading: () => (
      <div className="card-postmodern p-6">
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-pulse text-muted-foreground">LOADING CHART...</div>
        </div>
      </div>
    ),
  }
)

const SecurityEventsPanel = dynamic(
  () => import("@/components/admin/dashboard/SecurityEventsPanel").then(mod => ({ default: mod.SecurityEventsPanel })),
  {
    loading: () => (
      <div className="card-postmodern p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">LOADING...</div>
        </div>
      </div>
    ),
  }
)

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)

  // Dashboard stats
  const { data: stats = null, isLoading: statsLoading } = useDashboardStatsQuery()
  const { data: activities = [], isLoading: activitiesLoading } = useRecentActivityQuery(10)

  // Chart data hooks
  const { data: userGrowthData, isLoading: userGrowthLoading } = useUserGrowthData()
  const { data: contentDistribution, isLoading: contentLoading } = useContentDistribution()
  const { data: securityEvents, isLoading: securityLoading } = useSecurityEvents(10)

  const loading = statsLoading || activitiesLoading

  useEffect(() => {
    checkAccess()
  }, [user, authLoading])

  async function checkAccess() {
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
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Section 1: Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-lg mb-2">ADMIN DASHBOARD</h1>
          <p className="text-body text-muted-foreground">플랫폼 통계 및 최근 활동 모니터링</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/security-logs" className="btn-secondary text-sm">
            <Shield className="h-4 w-4 mr-2" />
            SECURITY LOGS
          </Link>
          <Link href="/admin/audit-logs" className="btn-secondary text-sm">
            <Activity className="h-4 w-4 mr-2" />
            AUDIT LOGS
          </Link>
        </div>
      </div>

      {/* Section 2: Primary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Section 3: Secondary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Players"
            value={stats.totalPlayers}
            icon={TrendingUp}
          />
          <StatsCard
            title="Banned Users"
            value={stats.bannedUsers}
            icon={Ban}
            description={stats.bannedUsers > 0 ? "Active bans" : "No bans"}
          />
          <StatsCard
            title="Pending Claims"
            value={stats.pendingClaims}
            icon={AlertCircle}
            description={stats.pendingClaims > 0 ? "Requires review" : "All reviewed"}
          />
        </div>
      )}

      {/* Section 4: Charts */}
      <div className="space-y-4">
        <div className="flex gap-2 border-b-2 border-gold-600">
          <button className="btn-ghost px-4 py-2">
            <BarChart3 className="h-4 w-4 mr-2" />
            USER GROWTH
          </button>
          <button className="btn-ghost px-4 py-2 opacity-50">
            <PieChartIcon className="h-4 w-4 mr-2" />
            CONTENT DISTRIBUTION
          </button>
        </div>

        <UserGrowthChart data={userGrowthData} isLoading={userGrowthLoading} />
      </div>

      {/* Section 5: Security Events */}
      <SecurityEventsPanel events={securityEvents} isLoading={securityLoading} />

      {/* Section 6: Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="card-postmodern p-6">
          <h3 className="text-heading-sm mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            RECENT ADMIN ACTIVITY
          </h3>
          <ActivityFeed activities={activities} />
        </div>

        {/* Quick Actions */}
        <div className="card-postmodern p-6">
          <h3 className="text-heading-sm mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            QUICK ACTIONS
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/admin/users"
              className="card-postmodern-interactive p-4 flex items-center"
            >
              <Users className="h-5 w-5 mr-3 text-gold-400" />
              <div className="text-left">
                <div className="text-caption-lg">USER MANAGEMENT</div>
                <div className="text-caption text-muted-foreground">
                  사용자 관리, 밴, 역할 변경
                </div>
              </div>
            </Link>

            <Link
              href="/admin/claims"
              className="card-postmodern-interactive p-4 flex items-center"
            >
              <UserCheck className="h-5 w-5 mr-3 text-gold-400" />
              <div className="text-left">
                <div className="text-caption-lg">CLAIM MANAGEMENT</div>
                <div className="text-caption text-muted-foreground">
                  플레이어 프로필 클레임 승인
                </div>
              </div>
            </Link>

            <Link
              href="/admin/archive"
              className="card-postmodern-interactive p-4 flex items-center"
            >
              <Archive className="h-5 w-5 mr-3 text-gold-400" />
              <div className="text-left">
                <div className="text-caption-lg">ARCHIVE MANAGEMENT</div>
                <div className="text-caption text-muted-foreground">
                  토너먼트 및 이벤트 관리
                </div>
              </div>
            </Link>

            <Link
              href="/admin/content"
              className="card-postmodern-interactive p-4 flex items-center"
            >
              <FileText className="h-5 w-5 mr-3 text-gold-400" />
              <div className="text-left">
                <div className="text-caption-lg">CONTENT MODERATION</div>
                <div className="text-caption text-muted-foreground">
                  포스트 및 댓글 관리, 신고 처리
                </div>
              </div>
            </Link>

            <Link
              href="/admin/edit-requests"
              className="card-postmodern-interactive p-4 flex items-center"
            >
              <AlertCircle className="h-5 w-5 mr-3 text-gold-400" />
              <div className="text-left">
                <div className="text-caption-lg">EDIT REQUESTS</div>
                <div className="text-caption text-muted-foreground">
                  핸드 수정 요청 검토 및 승인
                </div>
              </div>
            </Link>

            <Link
              href="/admin/performance"
              className="card-postmodern-interactive p-4 flex items-center"
            >
              <Activity className="h-5 w-5 mr-3 text-gold-400" />
              <div className="text-left">
                <div className="text-caption-lg">PERFORMANCE</div>
                <div className="text-caption text-muted-foreground">
                  Web Vitals 및 성능 메트릭
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
