'use client'

import { useEffect, useState } from 'react'
import { PlaySquare, Trophy, Users } from 'lucide-react'
import type { PlatformStats } from '@/lib/main-page'

interface StatsSectionProps {
  stats: PlatformStats
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section className="py-12 md:py-16 bg-muted">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={PlaySquare}
            label="Total Hands"
            value={stats.totalHands}
          />
          <StatCard
            icon={Trophy}
            label="Tournaments"
            value={stats.totalTournaments}
          />
          <StatCard icon={Users} label="Players" value={stats.totalPlayers} />
        </div>
      </div>
    </section>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
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
    <div className="group bg-background border border-border rounded-lg p-8 hover:border-gold-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-gold-400/10">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Icon */}
        <div className="p-4 bg-gold-400/10 rounded-full group-hover:bg-gold-400/20 transition-colors">
          <Icon className="w-8 h-8 text-gold-400" />
        </div>

        {/* Number */}
        <div className="text-4xl md:text-5xl font-bold text-foreground tabular-nums">
          {count.toLocaleString()}
        </div>

        {/* Label */}
        <div className="text-sm md:text-base text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </div>
      </div>
    </div>
  )
}
