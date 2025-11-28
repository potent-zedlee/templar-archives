'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  usePlayerStatsQuery,
  usePlayStyleQuery,
  formatStatPercentage,
  formatStatNumber,
  formatPotSize,
  isStatsEmpty,
} from '@/lib/queries/player-stats-queries'
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Zap, DollarSign } from 'lucide-react'

interface AdvancedStatsCardProps {
  playerId: string
}

export function AdvancedStatsCard({ playerId }: AdvancedStatsCardProps) {
  const statsQuery = usePlayerStatsQuery(playerId)
  const playStyleQuery = usePlayStyleQuery(playerId)

  if (statsQuery.isLoading) {
    return <AdvancedStatsCardSkeleton />
  }

  if (statsQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>고급 통계</CardTitle>
          <CardDescription>통계를 불러오는 중 오류가 발생했습니다</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const stats = statsQuery.data
  const playStyle = playStyleQuery.data

  if (!stats || isStatsEmpty(stats)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>고급 통계</CardTitle>
          <CardDescription>분석할 핸드 데이터가 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              이 플레이어의 핸드 데이터가 아직 등록되지 않았습니다.
            </p>
            <p className="text-xs text-muted-foreground">
              핸드 액션이 입력되면 자동으로 통계가 계산됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Premium styling if player has significant stats
  const isPremium = stats.totalHands > 50

  return (
    <Card className={isPremium ? 'border-gold-500/50 bg-gradient-to-br from-gray-800 to-gray-900' : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={isPremium ? 'bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent' : undefined}>
              고급 통계
            </CardTitle>
            <CardDescription>
              {formatStatNumber(stats.totalHands)}개의 핸드 기준
            </CardDescription>
          </div>
          {playStyle && (
            <Badge variant="outline" className={playStyle.color}>
              {playStyle.style}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatItem
            icon={<Target className="h-4 w-4" />}
            label="VPIP"
            value={formatStatPercentage(stats.vpip)}
            description="자발적 팟 참여율"
            trend={getTrend(stats.vpip, 20, 30)}
          />
          <StatItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="PFR"
            value={formatStatPercentage(stats.pfr)}
            description="프리플롭 레이즈율"
            trend={getTrend(stats.pfr, 15, 25)}
          />
          <StatItem
            icon={<Zap className="h-4 w-4" />}
            label="3-Bet"
            value={formatStatPercentage(stats.threeBet)}
            description="3벳 비율"
            trend={getTrend(stats.threeBet, 5, 10)}
          />
          <StatItem
            icon={<Trophy className="h-4 w-4" />}
            label="ATS"
            value={formatStatPercentage(stats.ats)}
            description="스틸 시도율"
            trend={getTrend(stats.ats, 20, 35)}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="flex items-center space-x-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-sm font-medium">승률</p>
              <p className="text-2xl font-bold">{formatStatPercentage(stats.winRate)}</p>
              <p className="text-xs text-muted-foreground">
                {formatStatNumber(stats.handsWon)} / {formatStatNumber(stats.totalHands)} 핸드
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium">평균 팟 크기</p>
              <p className="text-2xl font-bold">{formatPotSize(stats.avgPotSize)}</p>
              <p className="text-xs text-muted-foreground">참여한 핸드 기준</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">쇼다운 승률</p>
              <p className="text-2xl font-bold">{formatStatPercentage(stats.showdownWinRate)}</p>
              <p className="text-xs text-muted-foreground">쇼다운 도달 시</p>
            </div>
          </div>
        </div>

        {playStyle && (
          <div className="mt-6 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium mb-1 text-foreground">플레이 스타일</p>
            <p className="text-xs text-muted-foreground">{playStyle.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string
  description: string
  trend?: 'up' | 'down' | 'neutral'
}

function StatItem({ icon, label, value, description, trend }: StatItemProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className="rounded-lg bg-muted p-2">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center space-x-1">
          <p className="text-sm font-medium">{label}</p>
          {trend && <TrendIcon trend={trend} />}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') {
    return <TrendingUp className="h-3 w-3 text-green-500" />
  }
  if (trend === 'down') {
    return <TrendingDown className="h-3 w-3 text-red-500" />
  }
  return <Minus className="h-3 w-3 text-muted-foreground" />
}

function getTrend(value: number, low: number, high: number): 'up' | 'down' | 'neutral' {
  if (value > high) return 'up'
  if (value < low) return 'down'
  return 'neutral'
}

function AdvancedStatsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
