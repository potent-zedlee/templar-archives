"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StaggerContainer, StaggerItem } from "@/components/page-transition"
import { AnimatedCard } from "@/components/animated-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react"
import type { Player } from "@/lib/supabase"
import { GridSkeleton } from "@/components/skeletons/grid-skeleton"
import { EmptyState } from "@/components/empty-state"

type PlayerWithHandCount = Player & {
  hand_count: number
}

interface PlayersMainPanelProps {
  players: PlayerWithHandCount[]
  loading: boolean
}

export function PlayersMainPanel({ players, loading }: PlayersMainPanelProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const PLAYERS_PER_PAGE = 12

  const handlePlayerClick = (playerId: string) => {
    router.push(`/players?selected=${playerId}`)
  }

  // Filter players by search
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.country?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Paginate players
  const totalPages = Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE)
  const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE
  const endIndex = startIndex + PLAYERS_PER_PAGE
  const paginatedPlayers = filteredPlayers.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Reset to page 1 when players array changes (e.g., leaderboard filter)
  useEffect(() => {
    setCurrentPage(1)
  }, [players])

  const formatWinnings = (winnings?: number) => {
    if (!winnings) return '$0'
    if (winnings >= 1000000) {
      return `$${(winnings / 1000000).toFixed(1)}M`
    }
    if (winnings >= 1000) {
      return `$${(winnings / 1000).toFixed(0)}K`
    }
    return `$${winnings}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <GridSkeleton count={12} columns={4} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Search Bar - Fixed at top */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="플레이어 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
          />
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {startIndex + 1}-{Math.min(endIndex, filteredPlayers.length)}
          </span>
          {' '}/ {filteredPlayers.length} 플레이어
        </div>
      </div>

      {/* Players Grid - Scrollable */}
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6">
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" staggerDelay={0.05}>
            {paginatedPlayers.map((player) => (
              <StaggerItem key={player.id}>
                <button
                  onClick={() => handlePlayerClick(player.id)}
                  className="block w-full text-left"
                >
                  <AnimatedCard>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200 cursor-pointer">
                      {/* Player Header */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Profile Image */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-16 h-16 rounded-full border-2 border-gray-100 dark:border-gray-700">
                            <AvatarImage src={player.photo_url} alt={player.name} />
                            <AvatarFallback className="text-base font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {player.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                            {player.name}
                          </h3>

                          {/* Country */}
                          {player.country && (
                            <div className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded">
                              {player.country}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Player Stats */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Hands</span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono">
                            {player.hand_count}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">Winnings</span>
                          <span className="text-lg font-semibold text-green-600 dark:text-green-400 font-mono">
                            {formatWinnings(player.total_winnings)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AnimatedCard>
                </button>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {paginatedPlayers.length === 0 && (
            <EmptyState
              icon={Users}
              title={searchQuery ? "No Search Results" : "No Players"}
              description={searchQuery ? "Try adjusting search criteria" : "No registered players yet"}
              variant="inline"
            />
          )}
        </div>
      </ScrollArea>

      {/* Pagination - Fixed at bottom */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page === 1 ||
                       page === totalPages ||
                       Math.abs(page - currentPage) <= 1
              })
              .map((page, index, arr) => {
                const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1
                return (
                  <div key={page} className="flex items-center gap-2">
                    {showEllipsisBefore && <span className="text-gray-400 dark:text-gray-500">...</span>}
                    <button
                      className={currentPage === page
                        ? "px-4 py-2 bg-green-600 dark:bg-green-700 text-white font-medium rounded-lg text-sm"
                        : "px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      }
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </div>
                )
              })}

            <button
              className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
