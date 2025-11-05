"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PageTransition } from "@/components/page-transition"
import { DiscoveryLayout } from "@/components/discovery-layout"
import { SearchSidebar } from "./_components/SearchSidebar"
import { SearchHistory } from "./_components/SearchHistory"
import { SearchMainPanel } from "./_components/SearchMainPanel"
import { fetchHandsWithDetails } from "@/lib/queries"
import { useTournamentsQuery, usePlayersQuery } from "@/lib/queries/search-queries"
import type { Hand, Player } from "@/lib/supabase"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"
import { useFilterStore } from "@/lib/filter-store"
import { applyClientSideFilters } from "@/lib/filter-utils"

type HandWithDetails = Hand & {
  tournament_name?: string
  player_names?: string[]
  day_name?: string
}

type ViewMode = "table" | "card"

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [hands, setHands] = useState<HandWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || "")
  const [viewMode, setViewMode] = useState<ViewMode>("table")

  // Filter state
  const [selectedTournament, setSelectedTournament] = useState<string>(searchParams.get('tournament') || "all")
  const [selectedPlayer, setSelectedPlayer] = useState<string>(searchParams.get('player') || "all")
  const [favoriteOnly, setFavoriteOnly] = useState(searchParams.get('favorite') === 'true')
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || "")
  const [dateTo, setDateTo] = useState(searchParams.get('to') || "")

  // Filter store
  const filterState = useFilterStore()

  // React Query hooks
  const { data: tournamentsData = [] } = useTournamentsQuery()
  const { data: playersData = [] } = usePlayersQuery()

  const tournaments = tournamentsData.map(t => ({ id: t.id, name: t.name }))
  const players = playersData as Player[]

  // Save search to history
  const saveSearchToHistory = useCallback((query: string, isAI: boolean) => {
    const historyItem = {
      id: Date.now().toString(),
      query,
      timestamp: Date.now(),
      isAI
    }

    const saved = localStorage.getItem("search_history")
    const history = saved ? JSON.parse(saved) : []
    const updated = [historyItem, ...history.slice(0, 19)] // Keep last 20

    localStorage.setItem("search_history", JSON.stringify(updated))
  }, [])

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

  // Search hands
  const searchHands = useCallback(async () => {
    if (!searchQuery.trim()) {
      setHands([])
      return
    }

    setLoading(true)
    try {
      // Check if search query looks like natural language
      const isNaturalLanguage = searchQuery.trim().split(' ').length > 2

      if (isNaturalLanguage) {
        // Use Claude AI natural language search
        const response = await fetch('/api/natural-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery })
        })

        const data = await response.json()

        if (response.ok) {
          let filteredHands = data.results || []
          filteredHands = applyClientSideFilters(filteredHands, filterState)
          setHands(filteredHands)

          saveSearchToHistory(searchQuery, true)

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

        let filteredHands = handsData as HandWithDetails[]

        // Basic text search
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          filteredHands = filteredHands.filter(hand =>
            hand.description?.toLowerCase().includes(query) ||
            hand.player_names?.some(name => name.toLowerCase().includes(query))
          )
        }

        // Tournament filter
        if (selectedTournament !== 'all') {
          filteredHands = filteredHands.filter(hand =>
            hand.tournament_name?.includes(selectedTournament)
          )
        }

        // Player filter
        if (selectedPlayer !== 'all') {
          filteredHands = filteredHands.filter(hand =>
            hand.player_names?.includes(selectedPlayer)
          )
        }

        // Apply advanced filters
        filteredHands = applyClientSideFilters(filteredHands, filterState)

        setHands(filteredHands)
        saveSearchToHistory(searchQuery, false)
        toast.success(`Found ${filteredHands.length} hands`)
      }
    } catch (error) {
      console.error('Error searching hands:', error)
      toast.error('Failed to search hands')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, favoriteOnly, selectedTournament, selectedPlayer, filterState, saveSearchToHistory])

  // Auto-search on filter changes
  useEffect(() => {
    if (searchQuery.trim()) {
      searchHands()
    }
    updateURL()
  }, [selectedTournament, selectedPlayer, favoriteOnly, dateFrom, dateTo])

  // Handle query selection from history
  const handleSelectQuery = (query: string) => {
    setSearchQuery(query)
    // Auto-search will be triggered by useEffect
  }

  return (
    <ErrorBoundary>
      <PageTransition variant="slideUp">
        <DiscoveryLayout
          sidebar={
            <SearchSidebar onApplyFilters={searchHands} />
          }
          middlePanel={
            <SearchHistory onSelectQuery={handleSelectQuery} />
          }
          mainPanel={
            <SearchMainPanel
              hands={hands}
              loading={loading}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSearch={searchHands}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          }
        />
      </PageTransition>
    </ErrorBoundary>
  )
}
