'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  usePositionalStatsQuery,
  formatStatPercentage,
  formatStatNumber,
} from '@/lib/queries/player-stats-queries'
import { MapPin, TrendingUp } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PositionalStatsCardProps {
  playerId: string
}

export function PositionalStatsCard({ playerId }: PositionalStatsCardProps) {
  const posStatsQuery = usePositionalStatsQuery(playerId)

  if (posStatsQuery.isLoading) {
    return <PositionalStatsCardSkeleton />
  }

  if (posStatsQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>포지션별 통계</CardTitle>
          <CardDescription>통계를 불러오는 중 오류가 발생했습니다</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const posStats = posStatsQuery.data

  if (!posStats || posStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>포지션별 통계</CardTitle>
          <CardDescription>포지션별 성과 분석</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              포지션 데이터가 아직 등록되지 않았습니다.
            </p>
            <p className="text-xs text-muted-foreground">
              핸드 플레이어 포지션 정보가 입력되면 자동으로 통계가 계산됩니다.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalHands = posStats.reduce((sum, stat) => sum + stat.hands, 0)
  const isPremium = posStats.length >= 5 // 5개 이상 포지션 데이터

  return (
    <Card className={isPremium ? 'border-gold-500/50 bg-gradient-to-br from-muted to-background' : undefined}>
      <CardHeader>
        <CardTitle className={isPremium ? 'bg-gradient-to-r from-gold-400 to-gold-600 bg-clip-text text-transparent' : undefined}>
          포지션별 통계
        </CardTitle>
        <CardDescription>
          총 {formatStatNumber(totalHands)}개의 핸드 ({posStats.length}개 포지션)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>포지션</TableHead>
              <TableHead className="text-right">핸드</TableHead>
              <TableHead className="text-right">비율</TableHead>
              <TableHead className="text-right">VPIP</TableHead>
              <TableHead className="text-right">PFR</TableHead>
              <TableHead className="text-right">승률</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posStats.map((stat) => {
              const percentage = totalHands > 0 ? (stat.hands / totalHands) * 100 : 0
              return (
                <TableRow key={stat.position}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${getPositionColor(stat.position)}`}
                      />
                      <span className="font-medium">{stat.position}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatStatNumber(stat.hands)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {percentage.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <span className={getStatColor(stat.vpip, 20, 30)}>
                        {formatStatPercentage(stat.vpip)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <span className={getStatColor(stat.pfr, 15, 25)}>
                        {formatStatPercentage(stat.pfr)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <span className={getWinRateColor(stat.winRate)}>
                        {formatStatPercentage(stat.winRate)}
                      </span>
                      {stat.winRate > 50 && (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <div className="mt-4 text-xs text-muted-foreground">
          <p>• VPIP: 자발적 팟 참여율</p>
          <p>• PFR: 프리플롭 레이즈율</p>
          <p>• 승률: 해당 포지션에서 승리한 핸드 비율</p>
        </div>
      </CardContent>
    </Card>
  )
}

function getPositionColor(position: string): string {
  const colors: Record<string, string> = {
    BTN: 'bg-yellow-500',
    CO: 'bg-orange-500',
    MP: 'bg-blue-500',
    'UTG+1': 'bg-purple-500',
    UTG: 'bg-red-500',
    SB: 'bg-green-500',
    BB: 'bg-cyan-500',
  }
  return colors[position] || 'bg-gray-500'
}

function getStatColor(value: number, low: number, high: number): string {
  if (value > high) return 'text-green-600 dark:text-green-400 font-medium'
  if (value < low) return 'text-red-600 dark:text-red-400'
  return 'text-foreground'
}

function getWinRateColor(winRate: number): string {
  if (winRate >= 60) return 'text-green-600 dark:text-green-400 font-medium'
  if (winRate >= 45) return 'text-foreground'
  return 'text-red-600 dark:text-red-400'
}

function PositionalStatsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
