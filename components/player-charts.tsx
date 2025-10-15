"use client"

import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area } from "recharts"

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

type PrizeHistoryChartProps = {
  data: any[]
}

export function PrizeHistoryChart({ data }: PrizeHistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <p>No prize history available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorPrize" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          }}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickFormatter={(value) => {
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
            return `$${value}`
          }}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value: any) => [`$${value.toLocaleString()}`, 'Prize']}
          labelFormatter={(label) => {
            const item = data.find(p => p.date === label)
            return item ? `${item.eventName} (Rank ${item.rank})` : label
          }}
        />
        <Area
          type="monotone"
          dataKey="prize"
          stroke="#8884d8"
          fillOpacity={1}
          fill="url(#colorPrize)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

type TournamentCategoryChartProps = {
  data: { name: string; value: number }[]
}

export function TournamentCategoryChart({ data }: TournamentCategoryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </RechartsPie>
    </ResponsiveContainer>
  )
}
