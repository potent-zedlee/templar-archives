"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button, buttonVariants } from "@/components/ui/button"
import { StatsCard } from "@/components/admin/stats-card"
import { ActivityFeed } from "@/components/admin/activity-feed"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
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
import Link from "next/link"

export default function AdminDashboard() {
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
        toast.error("관리자 권한이 필요합니다")
        router.push("/")
        return
      }

      setHasAccess(true)
      loadDashboardData()
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("권한 확인 중 오류가 발생했습니다")
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
      toast.error("대시보드 데이터를 불러오는데 실패했습니다")
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
            <h1 className="text-title-lg mb-2">관리자 대시보드</h1>
            <p className="text-body text-muted-foreground">
              플랫폼 전체 통계 및 최근 활동을 확인하세요
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>
              사용자 관리
            </Link>
            <Link href="/admin/claims" className={buttonVariants({ variant: "outline" })}>
              클레임 관리
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="전체 사용자"
              value={stats.totalUsers}
              icon={Users}
              description={`오늘 ${stats.newUsersToday}명 가입`}
            />
            <StatsCard
              title="전체 게시글"
              value={stats.totalPosts}
              icon={FileText}
              description={`오늘 ${stats.newPostsToday}개 작성`}
            />
            <StatsCard
              title="전체 댓글"
              value={stats.totalComments}
              icon={MessageSquare}
            />
            <StatsCard
              title="전체 핸드"
              value={stats.totalHands}
              icon={PlaySquare}
            />
          </div>
        )}

        {/* Secondary Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatsCard
              title="전체 플레이어"
              value={stats.totalPlayers}
              icon={TrendingUp}
            />
            <StatsCard
              title="차단된 사용자"
              value={stats.bannedUsers}
              icon={Ban}
            />
            <StatsCard
              title="대기 중인 클레임"
              value={stats.pendingClaims}
              icon={AlertCircle}
            />
          </div>
        )}

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-title mb-4">최근 관리자 활동</h2>
          <ActivityFeed activities={activities} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className={buttonVariants({ variant: "outline", className: "h-20 justify-start" })}
          >
            <Users className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="text-body font-semibold">사용자 관리</div>
              <div className="text-caption text-muted-foreground">
                사용자 목록, 차단, 역할 변경
              </div>
            </div>
          </Link>

          <Link
            href="/admin/claims"
            className={buttonVariants({ variant: "outline", className: "h-20 justify-start" })}
          >
            <AlertCircle className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="text-body font-semibold">클레임 관리</div>
              <div className="text-caption text-muted-foreground">
                플레이어 프로필 클레임 승인
              </div>
            </div>
          </Link>

          <Link
            href="/community"
            className={buttonVariants({ variant: "outline", className: "h-20 justify-start" })}
          >
            <FileText className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="text-body font-semibold">커뮤니티 관리</div>
              <div className="text-caption text-muted-foreground">
                게시글 및 댓글 모더레이션
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
