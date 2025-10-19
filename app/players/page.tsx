"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/page-transition"
import { AnimatedCard } from "@/components/animated-card"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, TrendingUp, Filter, X, ChevronLeft, ChevronRight, Users } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { Player } from "@/lib/supabase"
import Link from "next/link"
import { fetchPlayersWithHandCount } from "@/lib/queries"
import { toast } from "sonner"
import { GridSkeleton } from "@/components/skeletons/grid-skeleton"
import { EmptyState } from "@/components/empty-state"

type PlayerWithHandCount = Player & {
  hand_count: number
}

export default function playersClient() {
  const [players, setPlayers] = useState<PlayerWithHandCount[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    loadPlayers()
  }, [])

  async function loadPlayers() {
    setLoading(true)
    try {
      const playersData = await fetchPlayersWithHandCount()
      setPlayers(playersData as PlayerWithHandCount[])
    } catch (error) {
      console.error('Error loading players:', error)
      toast.error('Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  // Get unique countries
  const countries = Array.from(new Set(players.map(p => p.country).filter(Boolean))).sort()

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
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
          <div className="mb-8">
            <h1 className="text-title-lg mb-2">Poker Players</h1>
            <p className="text-body text-muted-foreground">
              Browse professional poker players and view their hand histories
            </p>
          </div>
          <GridSkeleton count={9} columns={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <PageTransition variant="slideUp">
        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-title-lg mb-2">Poker Players</h1>
          <p className="text-body text-muted-foreground">
            Browse professional poker players and view their hand histories
          </p>
        </div>

        {/* Search and Filter Bar */}
        <Card className="p-3 md:p-4 mb-6 space-y-4">
          {/* Search and Sort Row */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players by name or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="winnings-desc">Winnings (High-Low)</SelectItem>
                <SelectItem value="winnings-asc">Winnings (Low-High)</SelectItem>
                <SelectItem value="hands-desc">Hands (High-Low)</SelectItem>
                <SelectItem value="hands-asc">Hands (Low-High)</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Country Filter */}
                <div>
                  <label className="text-caption font-medium mb-2 block">Country</label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries.map(country => (
                        <SelectItem key={country} value={country!}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Winnings Range */}
                <div>
                  <label className="text-caption font-medium mb-2 block">Min Winnings</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minWinnings}
                    onChange={(e) => setMinWinnings(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-caption font-medium mb-2 block">Max Winnings</label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={maxWinnings}
                    onChange={(e) => setMaxWinnings(e.target.value)}
                  />
                </div>

                {/* Hands Range */}
                <div>
                  <label className="text-caption font-medium mb-2 block">Min Hands</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={minHands}
                    onChange={(e) => setMinHands(e.target.value)}
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {/* Results Count */}
          <div className="text-caption text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedPlayers.length)} of {sortedPlayers.length} players
          </div>
        </Card>

        {/* Players Grid */}
        <ScrollArea className="h-[calc(100vh-460px)]">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.05}>
            {paginatedPlayers.map((player) => (
              <StaggerItem key={player.id}>
                <Link href={`/players/${player.id}`}>
                  <AnimatedCard>
                    <Card className="p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={player.photo_url} alt={player.name} />
                      <AvatarFallback className="text-lg font-bold">
                        {player.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-body font-semibold mb-1 truncate">
                        {player.name}
                      </h3>

                      {player.country && (
                        <Badge variant="secondary" className="text-caption mb-2">
                          {player.country}
                        </Badge>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-caption text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>{formatWinnings(player.total_winnings)} total winnings</span>
                        </div>
                        <div className="text-caption text-muted-foreground">
                          {player.hand_count} {player.hand_count === 1 ? 'hand' : 'hands'} in archive
                        </div>
                      </div>
                    </div>
                  </div>
                    </Card>
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
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

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
                    {showEllipsisBefore && <span className="text-muted-foreground">...</span>}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  </div>
                )
              })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        </div>
      </PageTransition>
    </div>
  )
}
