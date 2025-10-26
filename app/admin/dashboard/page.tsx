"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { StatsCard } from "@/components/admin/stats-card"
import { ActivityFeed } from "@/components/admin/activity-feed"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { LinkButton } from "@/components/ui/link-button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { useAuth } from "@/components/auth-provider"
import { isAdmin } from "@/lib/admin"
import { useDashboardStatsQuery, useRecentActivityQuery } from "@/lib/queries/admin-queries"
import { toast } from "sonner"
import {
  useUserGrowthData,
  useContentDistribution,
  useSecurityEvents,
} from "@/hooks/admin/useDashboardChartData"

// Dynamic imports for chart components to reduce bundle size
const UserGrowthChart = dynamic(
  () => import("@/components/admin/dashboard/UserGrowthChart").then(mod => ({ default: mod.UserGrowthChart })),
  {
    loading: () => (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </Card>
    ),
  }
)

const ContentDistributionChart = dynamic(
  () => import("@/components/admin/dashboard/ContentDistributionChart").then(mod => ({ default: mod.ContentDistributionChart })),
  {
    loading: () => (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </Card>
    ),
  }
)

const SecurityEventsPanel = dynamic(
  () => import("@/components/admin/dashboard/SecurityEventsPanel").then(mod => ({ default: mod.SecurityEventsPanel })),
  {
    loading: () => (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Card>
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
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">플랫폼 통계 및 최근 활동 모니터링</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/admin/security-logs" variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Security Logs
          </LinkButton>
          <LinkButton href="/admin/audit-logs" variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Audit Logs
          </LinkButton>
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
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="growth">
            <BarChart3 className="h-4 w-4 mr-2" />
            User Growth
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Content Distribution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="growth">
          <UserGrowthChart data={userGrowthData} isLoading={userGrowthLoading} />
        </TabsContent>

        <TabsContent value="distribution">
          <ContentDistributionChart data={contentDistribution} isLoading={contentLoading} />
        </TabsContent>
      </Tabs>

      {/* Section 5: Security Events */}
      <SecurityEventsPanel events={securityEvents} isLoading={securityLoading} />

      {/* Section 6: Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Admin Activity
          </h3>
          <ActivityFeed activities={activities} />
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <LinkButton
              href="/admin/users"
              variant="outline"
              className="h-16 justify-start"
            >
              <Users className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">User Management</div>
                <div className="text-xs text-muted-foreground">
                  사용자 관리, 밴, 역할 변경
                </div>
              </div>
            </LinkButton>

            <LinkButton
              href="/admin/claims"
              variant="outline"
              className="h-16 justify-start"
            >
              <UserCheck className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Claim Management</div>
                <div className="text-xs text-muted-foreground">
                  플레이어 프로필 클레임 승인
                </div>
              </div>
            </LinkButton>

            <LinkButton
              href="/admin/archive"
              variant="outline"
              className="h-16 justify-start"
            >
              <Archive className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Archive Management</div>
                <div className="text-xs text-muted-foreground">
                  토너먼트 및 이벤트 관리
                </div>
              </div>
            </LinkButton>

            <LinkButton
              href="/admin/content"
              variant="outline"
              className="h-16 justify-start"
            >
              <FileText className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Content Moderation</div>
                <div className="text-xs text-muted-foreground">
                  포스트 및 댓글 관리, 신고 처리
                </div>
              </div>
            </LinkButton>

            <LinkButton
              href="/admin/edit-requests"
              variant="outline"
              className="h-16 justify-start"
            >
              <AlertCircle className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Edit Requests</div>
                <div className="text-xs text-muted-foreground">
                  핸드 수정 요청 검토 및 승인
                </div>
              </div>
            </LinkButton>

            <LinkButton
              href="/admin/performance"
              variant="outline"
              className="h-16 justify-start"
            >
              <Activity className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Performance</div>
                <div className="text-xs text-muted-foreground">
                  Web Vitals 및 성능 메트릭
                </div>
              </div>
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  )
}
