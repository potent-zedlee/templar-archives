"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import nextDynamic from "next/dynamic"
import { Header } from "@/components/header"
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
import { Search, Filter, Star, Play, X, Sparkles, SearchX } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { fetchHandsWithDetails } from "@/lib/queries"
import type { Hand, Player } from "@/lib/supabase"
import Link from "next/link"
import { toast } from "sonner"
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

export default function SearchPage() {
  const [hands, setHands] = useState<HandWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Basic Filters
  const [selectedTournament, setSelectedTournament] = useState<string>("all")
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all")
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Advanced Filters from store
  const filterState = useFilterStore()

  // Available options
  const [tournaments, setTournaments] = useState<{id: string, name: string}[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    loadFiltersData()
    searchHands()
  }, [])

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
    toast.success("필터가 초기화되었습니다")
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={searchHands}
      />

      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-title-lg mb-2">Search Hands</h1>
          <p className="text-body text-muted-foreground">
            Find and analyze poker hands with advanced filters
          </p>
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
              {hands.length} {hands.length === 1 ? 'Hand' : 'Hands'} Found
            </h2>
          </div>

          {loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : hands.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="검색 결과가 없습니다"
              description="검색 조건을 조정하거나 필터를 초기화해보세요."
              variant="inline"
              action={{
                label: "필터 초기화",
                onClick: clearFilters
              }}
            />
          ) : (
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
    </div>
  )
}
