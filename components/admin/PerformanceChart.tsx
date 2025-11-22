"use client"

import { Card } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { type WebVitalMetric, type MetricName, METRIC_THRESHOLDS, getMetricColor } from '@/lib/analytics/metrics'
import { format } from 'date-fns'

interface PerformanceChartProps {
  metrics: WebVitalMetric[]
  metricName: MetricName
  title: string
}

export function PerformanceChart({ metrics, metricName, title }: PerformanceChartProps) {
  // 해당 메트릭만 필터링
  const filteredMetrics = metrics.filter((m) => m.name === metricName)

  // 차트 데이터 준비
  const chartData = filteredMetrics.map((metric) => ({
    timestamp: metric.timestamp,
    value: metric.value,
    formattedTime: format(new Date(metric.timestamp), 'HH:mm:ss'),
    rating: metric.rating,
  }))

  const threshold = METRIC_THRESHOLDS[metricName]

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="formattedTime"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />

          {/* Good threshold line */}
          <ReferenceLine
            y={threshold.good}
            stroke="hsl(var(--chart-2))"
            strokeDasharray="5 5"
            label={{ value: 'Good', position: 'right', fill: 'hsl(var(--chart-2))' }}
          />

          {/* Needs improvement threshold line */}
          <ReferenceLine
            y={threshold.needsImprovement}
            stroke="hsl(var(--chart-3))"
            strokeDasharray="5 5"
            label={{ value: 'Poor', position: 'right', fill: 'hsl(var(--chart-3))' }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
            name={metricName}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
