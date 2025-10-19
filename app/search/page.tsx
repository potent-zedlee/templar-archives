"use client"

import { useState, useEffect, useCallback } from "react"
import nextDynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { useIsMobile } from "@/hooks/use-media-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Filter, Star, Play, X, Sparkles, SearchX, TrendingUp } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { fetchHandsWithDetails } from "@/lib/queries"
import type { Hand, Player } from "@/lib/supabase"
import Link from "next/link"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"
import { useFilterStore } from "@/lib/filter-store"
import { applyClientSideFilters, matchesHandRange, analyzeBoardTexture } from "@/lib/filter-utils"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import { EmptyState } from "@/components/empty-state"

// Dynamic import for heavy components
const FilterPanel = nextDynamic(() => import("@/components/filter-panel").then(mod => ({ default: mod.FilterPanel })), {
  ssr: false,
})

type HandWithDetails = Hand & {
  tournament_name?: string
  player_names?: string[]
  day_name?: string
}

export default function SearchClient() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [hands, setHands] = useState<HandWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || "")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Basic Filters
  const [selectedTournament, setSelectedTournament] = useState<string>(searchParams.get('tournament') || "all")
  const [selectedPlayer, setSelectedPlayer] = useState<string>(searchParams.get('player') || "all")
  const [favoriteOnly, setFavoriteOnly] = useState(searchParams.get('favorite') === 'true')
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || "")
  const [dateTo, setDateTo] = useState(searchParams.get('to') || "")

  // Advanced Filters from store
  const filterState = useFilterStore()

  // Available options
  const [tournaments, setTournaments] = useState<{id: string, name: string}[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  // Update URL with current search params
  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedTournament !== 'all') params.set('tournament', selectedTournament)
    if (selectedPlayer !== 'all') params.set('player', selectedPlayer)
    if (favoriteOnly) params.set('favorite', 'true')
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)

    const queryString = params.toString()
    router.push(queryString ? `/search?${queryString}` : '/search', { scroll: false })
  }, [searchQuery, selectedTournament, selectedPlayer, favoriteOnly, dateFrom, dateTo, router])

  useEffect(() => {
    loadFiltersData()
  }, [])

  useEffect(() => {
    searchHands()
    updateURL()
  }, [searchQuery, selectedTournament, selectedPlayer, favoriteOnly, dateFrom, dateTo])

  async function loadFiltersData() {
    const supabase = createClientSupabaseClient()
    // Load tournaments
    const { data: tournamentsData } = await supabase
      .from('tournaments')
      .select('id, name')
      .order('created_at', { ascending: false })

    setTournaments(tournamentsData || [])

    // Load players
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .order('name')

    setPlayers(playersData || [])
  }

  async function searchHands() {
    setLoading(true)
    try {
      // Check if search query looks like natural language (not just keywords)
      const isNaturalLanguage = searchQuery.trim().split(' ').length > 2

      if (isNaturalLanguage && searchQuery.trim()) {
        // Use Claude AI natural language search
        const response = await fetch('/api/natural-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery })
        })

        const data = await response.json()

        if (response.ok) {
          // Apply advanced filters to AI search results
          let filteredHands = data.results || []
          filteredHands = applyClientSideFilters(filteredHands, filterState)
          setHands(filteredHands)

          if (data.method === 'fallback') {
            toast.info('Using basic search. For AI-powered search, configure Claude API key.')
          } else {
            toast.success(`AI search completed! Found ${filteredHands.length} hands.`)
          }
        } else {
          throw new Error(data.error || 'Search failed')
        }
      } else {
        // Use traditional search
        const { hands: handsData } = await fetchHandsWithDetails({
          limit: 100,
          favoriteOnly
        })

        // Apply client-side filters
        let filteredHands = handsData as HandWithDetails[]

        // Basic text search
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          filteredHands = filteredHands.filter(hand =>
            hand.description.toLowerCase().includes(query) ||
            hand.player_names?.some(name => name.toLowerCase().includes(query))
          )
        }

        // Tournament filter
        if (selectedTournament !== 'all') {
          filteredHands = filteredHands.filter(hand =>
            hand.tournament_name?.includes(selectedTournament)
          )
        }

        // Player filter (basic)
        if (selectedPlayer !== 'all') {
          filteredHands = filteredHands.filter(hand =>
            hand.player_names?.includes(selectedPlayer)
          )
        }

        // Apply advanced filters from filter store
        filteredHands = applyClientSideFilters(filteredHands, filterState)

        setHands(filteredHands)
        toast.success(`Found ${filteredHands.length} hands`)
      }
    } catch (error) {
      console.error('Error searching hands:', error)
      toast.error('Failed to search hands')
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedTournament("all")
    setSelectedPlayer("all")
    setFavoriteOnly(false)
    setDateFrom("")
    setDateTo("")
    // Clear filter store
    filterState.resetFilters()
    toast.success("Filters have been reset")
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-muted/30">
        <Header />

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={searchHands}
      />

      <PageTransition variant="slideUp">
        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-title-lg mb-2">Search Hands</h1>
          <p className="text-body text-muted-foreground">
            Find and analyze poker hands with advanced filters
          </p>
        </div>

        {/* Filter Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearFilters()
              setSearchQuery("big pot")
            }}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Big Pots
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearFilters()
              setSearchQuery("all-in")
            }}
          >
            All-In Hands
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearFilters()
              setSearchQuery("river decision")
            }}
          >
            River Decisions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearFilters()
              setFavoriteOnly(true)
            }}
          >
            <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
            My Favorites
          </Button>
        </div>

        {/* Search & Filters */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            {/* Natural Language Search */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI-Powered Search (Claude)
              </Label>
              <div className="relative flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFilterOpen(true)}
                  className="h-10 w-10 shrink-0"
                >
                  <Filter className="h-4 w-4" />
                </Button>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Try 'Show me hands where someone folded pocket aces' (AI-powered)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchHands()}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Tournament</Label>
                <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Tournaments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tournaments</SelectItem>
                    {tournaments.map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Player</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Players" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Players</SelectItem>
                    {players.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Additional Filters */}
            <div className="flex items-center gap-4">
              <Button
                variant={favoriteOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFavoriteOnly(!favoriteOnly)}
                className="gap-2"
              >
                <Star className={`h-4 w-4 ${favoriteOnly ? 'fill-current' : ''}`} />
                Favorites Only
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>

              <div className="flex-1" />

              <Button onClick={searchHands} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-title">
              {loading ? 'Searching...' : `${hands.length} ${hands.length === 1 ? 'Hand' : 'Hands'} Found`}
            </h2>
          </div>

          {/* Active Filters Badges */}
          {(searchQuery || selectedTournament !== 'all' || selectedPlayer !== 'all' || favoriteOnly || dateFrom || dateTo) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {searchQuery && (
                <Badge variant="secondary" className="gap-2">
                  Query: {searchQuery}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {selectedTournament !== 'all' && (
                <Badge variant="secondary" className="gap-2">
                  Tournament: {tournaments.find(t => t.id === selectedTournament)?.name || selectedTournament}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setSelectedTournament("all")}
                  />
                </Badge>
              )}
              {selectedPlayer !== 'all' && (
                <Badge variant="secondary" className="gap-2">
                  Player: {players.find(p => p.id === selectedPlayer)?.name || selectedPlayer}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setSelectedPlayer("all")}
                  />
                </Badge>
              )}
              {favoriteOnly && (
                <Badge variant="secondary" className="gap-2">
                  Favorites Only
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setFavoriteOnly(false)}
                  />
                </Badge>
              )}
              {dateFrom && (
                <Badge variant="secondary" className="gap-2">
                  From: {dateFrom}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setDateFrom("")}
                  />
                </Badge>
              )}
              {dateTo && (
                <Badge variant="secondary" className="gap-2">
                  To: {dateTo}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => setDateTo("")}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-caption"
                onClick={clearFilters}
              >
                Clear All
              </Button>
            </div>
          )}

          {loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : hands.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No Search Results"
              description="Try adjusting search criteria or reset filters."
              variant="inline"
              action={{
                label: "Reset Filters",
                onClick: clearFilters
              }}
            />
          ) : isMobile ? (
            // Mobile Card Layout
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {hands.map((hand) => (
                  <Card key={hand.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {hand.favorite && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                          <span className="font-semibold text-body">#{hand.number}</span>
                        </div>
                        <Badge variant="secondary" className="text-caption">
                          {hand.timestamp}
                        </Badge>
                      </div>

                      <p className="text-body">{hand.description}</p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-caption text-muted-foreground">
                          <span className="font-medium">Tournament:</span>
                          <span>{hand.tournament_name || 'Unknown'}</span>
                        </div>

                        {hand.day_name && (
                          <div className="text-caption text-muted-foreground">
                            {hand.day_name}
                          </div>
                        )}

                        {hand.player_names && hand.player_names.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {hand.player_names.slice(0, 2).map((name, i) => (
                              <Badge key={i} variant="secondary" className="text-caption">
                                {name}
                              </Badge>
                            ))}
                            {hand.player_names.length > 2 && (
                              <Badge variant="secondary" className="text-caption">
                                +{hand.player_names.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            // Desktop Table Layout
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hand #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hands.map((hand) => (
                    <TableRow key={hand.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{hand.number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {hand.favorite && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                          <span>{hand.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-caption">
                          {hand.tournament_name || 'Unknown'}
                          {hand.day_name && <div className="text-muted-foreground">{hand.day_name}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hand.player_names && hand.player_names.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {hand.player_names.slice(0, 2).map((name, i) => (
                              <Badge key={i} variant="secondary" className="text-caption">
                                {name}
                              </Badge>
                            ))}
                            {hand.player_names.length > 2 && (
                              <Badge variant="secondary" className="text-caption">
                                +{hand.player_names.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-caption text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-caption text-muted-foreground">
                        {hand.timestamp}
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Hand detail page removed */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </Card>
        </div>
      </PageTransition>
    </div>
    </ErrorBoundary>
  )
}
