'use client'

import { usePlayerStatsQuery, usePositionalStatsQuery, usePlayStyleQuery, formatStatPercentage, formatPotSize, isStatsEmpty } from '@/lib/queries/player-stats-queries'
import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * 고급 통계 카드 (VPIP, PFR, 3BET, ATS 표시)
 */
export function AdvancedStatsCard({ playerId }: { playerId: string }) {
  const { data: stats, isLoading, error } = usePlayerStatsQuery(playerId)
  const { data: playStyle } = usePlayStyleQuery(playerId)

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">고급 통계</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </Card>
    )
  }

  if (error || isStatsEmpty(stats)) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">고급 통계</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          충분한 핸드 데이터가 없습니다. 최소 20핸드 이상 필요합니다.
        </p>
      </Card>
    )
  }

  const statItems = [
    {
      label: 'VPIP',
      value: stats!.vpip,
      description: 'Voluntarily Put In Pot',
      tooltip: '프리플롭에서 자발적으로 칩을 넣은 비율',
      benchmark: { low: 20, high: 30 }
    },
    {
      label: 'PFR',
      value: stats!.pfr,
      description: 'Pre-Flop Raise',
      tooltip: '프리플롭에서 레이즈한 비율',
      benchmark: { low: 15, high: 25 }
    },
    {
      label: '3BET',
      value: stats!.threeBet,
      description: '3-Bet Percentage',
      tooltip: '3벳 비율',
      benchmark: { low: 5, high: 12 }
    },
    {
      label: 'ATS',
      value: stats!.ats,
      description: 'Attempt To Steal',
      tooltip: 'BTN/CO/SB에서 스틸 시도 비율',
      benchmark: { low: 25, high: 40 }
    },
    {
      label: 'Win Rate',
      value: stats!.winRate,
      description: 'Overall Win Rate',
      tooltip: '전체 승률',
      benchmark: { low: 30, high: 50 }
    },
    {
      label: 'Avg Pot',
      value: stats!.avgPotSize,
      description: 'Average Pot Size',
      tooltip: '평균 팟 크기',
      isNotPercentage: true
    }
  ]

  const getTrendIcon = (value: number, benchmark?: { low: number; high: number }) => {
    if (!benchmark) return <Minus className="h-4 w-4 text-gray-400" />
    if (value > benchmark.high) return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
    if (value < benchmark.low) return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getStatColor = (value: number, benchmark?: { low: number; high: number }) => {
    if (!benchmark) return 'text-gray-900 dark:text-gray-100'
    if (value > benchmark.high) return 'text-green-600 dark:text-green-400'
    if (value < benchmark.low) return 'text-red-600 dark:text-red-400'
    return 'text-gray-900 dark:text-gray-100'
  }

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">고급 통계</h3>
        {playStyle && (
          <div className={`inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg ${playStyle.color}`}>
            <span className="text-sm font-medium">{playStyle.style}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statItems.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{item.label}</span>
              {getTrendIcon(item.value, item.benchmark)}
            </div>
            <div className={`text-2xl font-bold font-mono ${getStatColor(item.value, item.benchmark)}`}>
              {item.isNotPercentage ? formatPotSize(item.value) : formatStatPercentage(item.value)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400" title={item.tooltip}>
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {playStyle && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {playStyle.description}
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Total Hands: <span className="font-mono font-semibold">{stats!.totalHands}</span></span>
          <span>Hands Won: <span className="font-mono font-semibold">{stats!.handsWon}</span></span>
        </div>
      </div>
    </Card>
  )
}

/**
 * 포지션별 통계 카드
 */
export function PositionalStatsCard({ playerId }: { playerId: string }) {
  const { data: positionStats, isLoading, error } = usePositionalStatsQuery(playerId)

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">포지션별 통계</h3>
        <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded" />
      </Card>
    )
  }

  if (error || !positionStats || positionStats.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">포지션별 통계</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          포지션별 데이터가 없습니다.
        </p>
      </Card>
    )
  }

  const chartData = positionStats.map(stat => ({
    position: stat.position,
    VPIP: stat.vpip,
    PFR: stat.pfr,
    'Win Rate': stat.winRate,
    hands: stat.hands
  }))

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">포지션별 통계</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            dataKey="position"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
            formatter={(value: number, name: string) => [
              name === 'hands' ? value : `${value}%`,
              name
            ]}
          />
          <Bar dataKey="VPIP" fill="#10B981" radius={[8, 8, 0, 0]} />
          <Bar dataKey="PFR" fill="#3B82F6" radius={[8, 8, 0, 0]} />
          <Bar dataKey="Win Rate" fill="#F59E0B" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded" />
            <span className="text-gray-600 dark:text-gray-400">VPIP</span>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded" />
            <span className="text-gray-600 dark:text-gray-400">PFR</span>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 bg-yellow-600 dark:bg-yellow-500 rounded" />
            <span className="text-gray-600 dark:text-gray-400">Win Rate</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * 성과 차트 카드 (승률 시각화)
 */
export function PerformanceChartCard({ playerId }: { playerId: string }) {
  const { data: stats, isLoading } = usePlayerStatsQuery(playerId)
  const { data: positionStats } = usePositionalStatsQuery(playerId)

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">성과 분석</h3>
        <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded" />
      </Card>
    )
  }

  if (isStatsEmpty(stats) || !positionStats || positionStats.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">성과 분석</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          성과 데이터가 없습니다.
        </p>
      </Card>
    )
  }

  const performanceData = positionStats.map(stat => ({
    position: stat.position,
    winRate: stat.winRate,
    hands: stat.hands
  }))

  const getBarColor = (winRate: number) => {
    if (winRate >= 50) return '#10B981' // green
    if (winRate >= 40) return '#3B82F6' // blue
    if (winRate >= 30) return '#F59E0B' // yellow
    return '#EF4444' // red
  }

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">성과 분석</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={performanceData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            type="number"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
          />
          <YAxis
            type="category"
            dataKey="position"
            stroke="#9CA3AF"
            style={{ fontSize: '12px' }}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB'
            }}
            formatter={(value: number, name: string) => [
              name === 'hands' ? value : `${value}%`,
              name === 'winRate' ? 'Win Rate' : name
            ]}
          />
          <Bar dataKey="winRate" radius={[0, 8, 8, 0]}>
            {performanceData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.winRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded" />
            <span className="text-gray-600 dark:text-gray-400">≥50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded" />
            <span className="text-gray-600 dark:text-gray-400">40-49%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-600 rounded" />
            <span className="text-gray-600 dark:text-gray-400">30-39%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded" />
            <span className="text-gray-600 dark:text-gray-400">&lt;30%</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
