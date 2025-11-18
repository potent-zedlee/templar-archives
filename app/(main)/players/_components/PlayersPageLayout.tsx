"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { PlayersSidebar, type LeaderboardType } from "./PlayersSidebar"
import { PlayersMainPanel } from "./PlayersMainPanel"
import { PlayerDetailPanel } from "./PlayerDetailPanel"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import type { Player } from "@/lib/supabase"
import { usePlayerQuery } from "@/lib/queries/players-queries"

type PlayerWithHandCount = Player & {
  hand_count: number
}

interface PlayersPageLayoutProps {
  players: PlayerWithHandCount[]
  loading: boolean
}

export function PlayersPageLayout({ players, loading }: PlayersPageLayoutProps) {
  const searchParams = useSearchParams()
  const selectedPlayerId = searchParams.get('selected')

  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardType>('all-time')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Load selected player data if ID exists
  const { data: selectedPlayer, isLoading: playerLoading } = usePlayerQuery(selectedPlayerId || '')

  // Get unique countries with player counts
  const countries = Array.from(new Set(players.map(p => p.country).filter(Boolean))).sort() as string[]
  const countryPlayerCounts = countries.reduce((acc, country) => {
    acc[country] = players.filter(p => p.country === country).length
    return acc
  }, {} as Record<string, number>)

  // Filter players based on selected leaderboard
  const filteredPlayers = players.filter(player => {
    // Country filter
    if (selectedLeaderboard === 'country' && selectedCountry) {
      return player.country === selectedCountry
    }

    // Women filter
    if (selectedLeaderboard === 'women') {
      return player.gender === 'female'
    }

    // 2025 filter - TODO: implement when we have year-based data
    // For now, show all players for 2025 as well
    return true
  })

  // Sort by total_winnings descending
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    return (b.total_winnings || 0) - (a.total_winnings || 0)
  })

  const handleReset = () => {
    setSelectedLeaderboard('all-time')
    setSelectedCountry(null)
  }

  const sidebarProps = {
    selectedLeaderboard,
    onLeaderboardChange: setSelectedLeaderboard,
    selectedCountry,
    onCountryChange: setSelectedCountry,
    countries,
    countryPlayerCounts,
    onReset: handleReset
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:block w-80 flex-shrink-0">
        <PlayersSidebar {...sidebarProps} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Mobile Menu Button */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Menu className="h-4 w-4" />
                Leaderboards
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <PlayersSidebar {...sidebarProps} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Panel - Conditional Rendering */}
        <div className="flex-1 overflow-hidden">
          {selectedPlayer ? (
            <PlayerDetailPanel player={selectedPlayer as PlayerWithHandCount} />
          ) : (
            <PlayersMainPanel players={sortedPlayers} loading={loading} />
          )}
        </div>
      </main>
    </div>
  )
}
