"use client"

import { useState, useMemo, useEffect } from "react"
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition"
import { AnimatedCard } from "@/components/animated-card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, X, ChevronLeft, ChevronRight, Users } from "lucide-react"
import type { Player } from "@/lib/supabase"
import Link from "next/link"
import { usePlayersQuery } from "@/lib/queries/players-queries"
import { toast } from "sonner"
import { GridSkeleton } from "@/components/skeletons/grid-skeleton"
import { EmptyState } from "@/components/empty-state"

type PlayerWithHandCount = Player & {
  hand_count: number
}

export default function playersClient() {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter states
  const [selectedCountry, setSelectedCountry] = useState<string>("all")
  const [minWinnings, setMinWinnings] = useState<string>("")
  const [maxWinnings, setMaxWinnings] = useState<string>("")
  const [minHands, setMinHands] = useState<string>("")
  const [maxHands, setMaxHands] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)

  // Sort state
  const [sortBy, setSortBy] = useState<string>("winnings-desc")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const PLAYERS_PER_PAGE = 12

  // React Query hook
  const { data: playersData = [], isLoading: loading, error } = usePlayersQuery()
  const players = playersData as PlayerWithHandCount[]

  // Handle query error
  if (error) {
    toast.error('Failed to load players')
  }

  // Get unique countries
  const countries = useMemo(() =>
    Array.from(new Set(players.map(p => p.country).filter(Boolean))).sort(),
    [players]
  )

  // Filter players
  const filteredPlayers = players.filter(player => {
    // Search filter
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      player.country?.toLowerCase().includes(searchQuery.toLowerCase())

    // Country filter
    const matchesCountry = selectedCountry === "all" || player.country === selectedCountry

    // Winnings filter
    const playerWinnings = player.total_winnings || 0
    const matchesMinWinnings = !minWinnings || playerWinnings >= parseInt(minWinnings)
    const matchesMaxWinnings = !maxWinnings || playerWinnings <= parseInt(maxWinnings)

    // Hands filter
    const matchesMinHands = !minHands || player.hand_count >= parseInt(minHands)
    const matchesMaxHands = !maxHands || player.hand_count <= parseInt(maxHands)

    return matchesSearch && matchesCountry && matchesMinWinnings && matchesMaxWinnings && matchesMinHands && matchesMaxHands
  })

  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name)
      case "name-desc":
        return b.name.localeCompare(a.name)
      case "winnings-asc":
        return (a.total_winnings || 0) - (b.total_winnings || 0)
      case "winnings-desc":
        return (b.total_winnings || 0) - (a.total_winnings || 0)
      case "hands-asc":
        return a.hand_count - b.hand_count
      case "hands-desc":
        return b.hand_count - a.hand_count
      default:
        return 0
    }
  })

  // Paginate players
  const totalPages = Math.ceil(sortedPlayers.length / PLAYERS_PER_PAGE)
  const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE
  const endIndex = startIndex + PLAYERS_PER_PAGE
  const paginatedPlayers = sortedPlayers.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCountry, minWinnings, maxWinnings, minHands, maxHands, sortBy])

  const clearFilters = () => {
    setSelectedCountry("all")
    setMinWinnings("")
    setMaxWinnings("")
    setMinHands("")
    setMaxHands("")
    setSearchQuery("")
  }

  const hasActiveFilters = selectedCountry !== "all" || minWinnings || maxWinnings || minHands || maxHands || searchQuery

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
          <GridSkeleton count={9} columns={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageTransition variant="slideUp">
        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Players</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">프로 플레이어 프로필 및 통계</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-6 space-y-4">
          {/* Search and Sort Row */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="플레이어 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 flex-wrap">
              <button className="px-3 py-2 bg-green-600 dark:bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors">
                전체
              </button>
              <button className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                Cash Game
              </button>
              <button className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                Tournament
              </button>
              <button
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-3 w-3" />
                고급 필터
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Country Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">국가</label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent">
                      <SelectValue placeholder="전체 국가" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 국가</SelectItem>
                      {countries.map(country => (
                        <SelectItem key={country} value={country!}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Winnings Range */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">최소 상금</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minWinnings}
                    onChange={(e) => setMinWinnings(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">최대 상금</label>
                  <Input
                    type="number"
                    placeholder="제한 없음"
                    value={maxWinnings}
                    onChange={(e) => setMaxWinnings(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </div>

                {/* Hands Range */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">최소 핸드</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minHands}
                    onChange={(e) => setMinHands(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4" />
                  필터 초기화
                </button>
              )}
            </div>
          )}

          {/* Results Count & Sort */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {startIndex + 1}-{Math.min(endIndex, sortedPlayers.length)}
              </span>
              {' '}/ {sortedPlayers.length} 플레이어
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px] px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="winnings-desc">상금 (높음-낮음)</SelectItem>
                <SelectItem value="winnings-asc">상금 (낮음-높음)</SelectItem>
                <SelectItem value="hands-desc">핸드 (높음-낮음)</SelectItem>
                <SelectItem value="hands-asc">핸드 (낮음-높음)</SelectItem>
                <SelectItem value="name-asc">이름 (A-Z)</SelectItem>
                <SelectItem value="name-desc">이름 (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Players Grid */}
        <ScrollArea className="h-[calc(100vh-460px)]">
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" staggerDelay={0.05}>
            {paginatedPlayers.map((player) => (
              <StaggerItem key={player.id}>
                <Link href={`/players/${player.id}`} className="block">
                  <AnimatedCard>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200">
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
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {paginatedPlayers.length === 0 && (
            <EmptyState
              icon={Users}
              title={searchQuery || hasActiveFilters ? "No Search Results" : "No Players"}
              description={searchQuery || hasActiveFilters ? "Try adjusting search criteria" : "No registered players yet"}
              variant="inline"
              action={searchQuery || hasActiveFilters ? {
                label: "Reset Filters",
                onClick: clearFilters
              } : undefined}
            />
          )}
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            <button
              className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first page, last page, current page, and pages around current
                return page === 1 ||
                       page === totalPages ||
                       Math.abs(page - currentPage) <= 1
              })
              .map((page, index, arr) => {
                // Add ellipsis if there's a gap
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
        )}
        </div>
      </PageTransition>
    </div>
  )
}
