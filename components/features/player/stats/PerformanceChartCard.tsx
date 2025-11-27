'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  usePlayerStatsQuery,
  usePositionalStatsQuery,
  formatStatPercentage,
} from '@/lib/queries/player-stats-queries'
import { LineChart } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

interface PerformanceChartCardProps {
  playerId: string
}

export function PerformanceChartCard({ playerId }: PerformanceChartCardProps) {
  const statsQuery = usePlayerStatsQuery(playerId)
  const posStatsQuery = usePositionalStatsQuery(playerId)

  if (statsQuery.isLoading || posStatsQuery.isLoading) {
    return <PerformanceChartCardSkeleton />
  }

  if (statsQuery.error || posStatsQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>성과 차트</CardTitle>
          <CardDescription>차트를 불러오는 중 오류가 발생했습니다</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const stats = statsQuery.data
  const posStats = posStatsQuery.data

  if (!stats || !posStats || posStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>성과 차트</CardTitle>
          <CardDescription>시각화된 통계 분석</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              차트를 생성할 데이터가 아직 없습니다.
            </p>
            <p className="text-xs text-muted-foreground">
              핸드 데이터가 입력되면 자동으로 차트가 생성됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const posChartData = posStats.map((stat) => ({
    position: stat.position,
    VPIP: stat.vpip,
    PFR: stat.pfr,
    승률: stat.winRate,
    핸드수: stat.hands,
  }))

  const radarChartData = [
    { stat: 'VPIP', value: stats.vpip, fullMark: 100 },
    { stat: 'PFR', value: stats.pfr, fullMark: 100 },
    { stat: '3-Bet', value: stats.threeBet, fullMark: 100 },
    { stat: 'ATS', value: stats.ats, fullMark: 100 },
    { stat: '승률', value: stats.winRate, fullMark: 100 },
  ]

  const isPremium = posStats.length >= 5 // 5개 이상 포지션 데이터

  return (
    <Card className={isPremium ? 'border-gold-500/50 bg-gradient-to-br from-gray-800 to-gray-900' : undefined}>
      <CardHeader>
        <CardTitle className={isPremium ? 'bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent' : undefined}>
          성과 차트
        </CardTitle>
        <CardDescription>시각화된 통계 분석</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="positional" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="positional">포지션별 통계</TabsTrigger>
            <TabsTrigger value="radar">종합 통계</TabsTrigger>
          </TabsList>

          <TabsContent value="positional" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={posChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="position"
                  className="text-xs text-gray-600 dark:text-gray-400"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis className="text-xs text-gray-600 dark:text-gray-400" tick={{ fill: 'currentColor' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tw-bg-opacity, 1)',
                    border: '1px solid',
                    borderColor: 'var(--tw-border-opacity, 1)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="VPIP" fill="#3b82f6" name="VPIP (%)" />
                <Bar dataKey="PFR" fill="#10b981" name="PFR (%)" />
                <Bar dataKey="승률" fill="#f59e0b" name="승률 (%)" />
              </RechartsBarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-medium mb-1 text-gray-900 dark:text-gray-100">차트 설명</p>
                <ul className="space-y-1">
                  <li>• 파란색: VPIP (자발적 팟 참여율)</li>
                  <li>• 초록색: PFR (프리플롭 레이즈율)</li>
                  <li>• 주황색: 승률</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1 text-gray-900 dark:text-gray-100">분석 포인트</p>
                <ul className="space-y-1">
                  <li>• BTN, CO: 높은 VPIP/PFR 권장</li>
                  <li>• UTG: 낮은 VPIP/PFR 권장</li>
                  <li>• 승률 50% 이상 목표</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="radar" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarChartData}>
                <PolarGrid className="stroke-gray-200 dark:stroke-gray-700" />
                <PolarAngleAxis
                  dataKey="stat"
                  className="text-xs text-gray-600 dark:text-gray-400"
                  tick={{ fill: 'currentColor' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  className="text-xs text-gray-600 dark:text-gray-400"
                  tick={{ fill: 'currentColor' }}
                />
                <Radar
                  name="통계"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tw-bg-opacity, 1)',
                    border: '1px solid',
                    borderColor: 'var(--tw-border-opacity, 1)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatStatPercentage(value)}
                />
              </RadarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div>
                <p className="font-medium mb-1 text-gray-900 dark:text-gray-100">현재 통계</p>
                <ul className="space-y-1">
                  <li>• VPIP: {formatStatPercentage(stats.vpip)}</li>
                  <li>• PFR: {formatStatPercentage(stats.pfr)}</li>
                  <li>• 3-Bet: {formatStatPercentage(stats.threeBet)}</li>
                  <li>• ATS: {formatStatPercentage(stats.ats)}</li>
                  <li>• 승률: {formatStatPercentage(stats.winRate)}</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1 text-gray-900 dark:text-gray-100">권장 범위</p>
                <ul className="space-y-1">
                  <li>• VPIP: 20-30%</li>
                  <li>• PFR: 15-25%</li>
                  <li>• 3-Bet: 5-10%</li>
                  <li>• ATS: 20-35%</li>
                  <li>• 승률: 50% 이상</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function PerformanceChartCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full mb-6" />
        <Skeleton className="h-[300px] w-full" />
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </CardContent>
    </Card>
  )
}
