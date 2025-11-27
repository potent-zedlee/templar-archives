"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Users, PlaySquare, Trophy } from "lucide-react"
import type { PlatformStats } from "@/lib/main-page"

interface StatsCounterProps {
  stats: PlatformStats
}

export function StatsCounter({ stats }: StatsCounterProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard
        icon={PlaySquare}
        label="Total Hands"
        value={stats.totalHands}
        color="text-blue-500"
      />
      <StatCard
        icon={Trophy}
        label="Tournaments"
        value={stats.totalTournaments}
        color="text-yellow-500"
      />
      <StatCard
        icon={Users}
        label="Players"
        value={stats.totalPlayers}
        color="text-green-500"
      />
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  color: string
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    const duration = 2000 // 2 seconds
    const increment = end / (duration / 16) // 60fps

    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col items-center text-center gap-3">
        <div className={`p-3 rounded-full bg-muted ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-3xl font-bold mb-1">
            {count.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            {label}
          </div>
        </div>
      </div>
    </Card>
  )
}
