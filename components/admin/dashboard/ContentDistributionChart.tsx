/**
 * Content Distribution Chart Component
 *
 * Displays distribution of content types (Posts, Comments, Hands, Tournaments) using a pie chart
 */

'use client'

import { Card } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

type ContentData = {
  name: string
  value: number
}

type Props = {
  data: ContentData[]
  isLoading?: boolean
}

export function ContentDistributionChart({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Content Distribution</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Content Distribution</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          데이터가 없습니다
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Content Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}
