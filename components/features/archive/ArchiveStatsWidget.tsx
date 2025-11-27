"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Video, Target, PlaySquare, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tournament } from "@/lib/types/archive"

interface ArchiveStatsWidgetProps {
  tournaments: Tournament[]
  filteredItemsCount: number
  unsortedVideosCount: number
  totalHandsCount: number
  navigationLevel: string
  className?: string
}

export function ArchiveStatsWidget({
  tournaments,
  filteredItemsCount,
  unsortedVideosCount,
  totalHandsCount,
  navigationLevel,
  className
}: ArchiveStatsWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('archive-stats-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Save collapsed state to localStorage
  const handleToggle = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('archive-stats-collapsed', String(newState))
  }

  // Calculate statistics
  const stats = useMemo(() => {
    // Count total events
    const totalEvents = tournaments.reduce((sum, tournament) => {
      return sum + (tournament.events?.length || 0)
    }, 0)

    // Count total videos (streams)
    const totalVideos = tournaments.reduce((sum, tournament) => {
      const events = tournament.events || []
      return sum + events.reduce((subSum: number, event) => {
        return subSum + (event.streams?.length || 0)
      }, 0)
    }, 0)

    return {
      tournaments: tournaments.length,
      events: totalEvents,
      videos: totalVideos + unsortedVideosCount,
      hands: totalHandsCount
    }
  }, [tournaments, unsortedVideosCount, totalHandsCount])

  return (
    <Card className={cn("mb-4", className)}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Archive Statistics</h3>
          {navigationLevel !== 'root' && (
            <span className="text-xs text-muted-foreground">
              ({navigationLevel === 'unorganized' ? 'Unorganized' :
                navigationLevel === 'tournament' ? 'Tournament' : 'Event'})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          className="h-6 w-6 p-0"
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {/* Stats Grid */}
      {!isCollapsed && (
        <div className="p-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Tournaments */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="shrink-0">
                <Trophy className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold">{stats.tournaments}</div>
                <div className="text-xs text-muted-foreground">Tournaments</div>
              </div>
            </div>

            {/* Videos */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="shrink-0">
                <Video className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold">{stats.videos}</div>
                <div className="text-xs text-muted-foreground">Videos</div>
              </div>
            </div>

            {/* Events */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="shrink-0">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold">{stats.events}</div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
            </div>

            {/* Hands */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="shrink-0">
                <PlaySquare className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold">{stats.hands.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Hands</div>
              </div>
            </div>
          </div>

          {/* Filtered count (if search/filter is active) */}
          {navigationLevel !== 'root' && filteredItemsCount > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs text-muted-foreground text-center">
                Showing <span className="font-semibold text-foreground">{filteredItemsCount}</span> items
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
