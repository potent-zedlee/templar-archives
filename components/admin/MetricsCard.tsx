"use client"

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type MetricName, type MetricRating, METRIC_THRESHOLDS, getMetricIcon } from '@/lib/analytics/metrics'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricsCardProps {
  name: MetricName
  value: number
  rating: MetricRating
  previousValue?: number
  description?: string
}

export function MetricsCard({ name, value, rating, previousValue, description }: MetricsCardProps) {
  const threshold = METRIC_THRESHOLDS[name]

  // 변화율 계산
  const changePercent = previousValue ? ((value - previousValue) / previousValue) * 100 : 0
  const hasImproved = changePercent < 0 // 값이 작을수록 좋음

  // 값 포맷팅
  const formattedValue = name === 'CLS' ? value.toFixed(3) : Math.round(value)

  // 단위
  const unit = name === 'CLS' ? '' : 'ms'

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">{name}</h3>
            <Badge
              variant={
                rating === 'good' ? 'default' : rating === 'needs-improvement' ? 'secondary' : 'destructive'
              }
              className="text-xs"
            >
              {getMetricIcon(rating)} {rating.toUpperCase()}
            </Badge>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold">
            {formattedValue}
            <span className="text-lg text-muted-foreground ml-1">{unit}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Good: ≤ {threshold.good}
            {unit} · Poor: &gt; {threshold.needsImprovement}
            {unit}
          </div>
        </div>

        {previousValue !== undefined && changePercent !== 0 && (
          <div className={`flex items-center gap-1 ${hasImproved ? 'text-green-600' : 'text-red-600'}`}>
            {hasImproved ? (
              <TrendingDown className="h-4 w-4" />
            ) : changePercent > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{Math.abs(changePercent).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </Card>
  )
}
