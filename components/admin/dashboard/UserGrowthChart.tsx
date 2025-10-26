/**
 * User Growth Chart Component
 *
 * Displays user growth over the last 7 days using a line chart
 */

'use client'

import { Card } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type UserGrowthData = {
  date: string
  users: number
}

type Props = {
  data: UserGrowthData[]
  isLoading?: boolean
}

export function UserGrowthChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">User Growth (Last 7 Days)</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">User Growth (Last 7 Days)</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          데이터가 없습니다
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">User Growth (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="users"
            stroke="#8884d8"
            strokeWidth={2}
            name="New Users"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
