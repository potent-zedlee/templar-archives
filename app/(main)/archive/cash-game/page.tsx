"use client"

/**
 * Archive Cash Game Page - Phase 42 Refactor
 *
 * Discovery Layout 제거 → 단일 페이지 Accordion 구조
 * Flowbite 컴포넌트 100% 사용
 */

import { useState, useMemo } from "react"
import { TextInput, Dropdown, Button, Badge, Spinner } from "flowbite-react"
import { DollarSign, Search, Plus } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageTransition } from "@/components/page-transition"
import { ArchiveAccordion } from "../_components/ArchiveAccordion"
import { useTournamentsQuery } from "@/lib/queries/archive-queries"
import type { Tournament, Hand } from "@/lib/types/archive"

type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "most-hands"

export default function ArchiveCashGamePage() {
  // ============================================================
  // 1. Auth & User
  // ============================================================
  const { user } = useAuth()
  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  // ============================================================
  // 2. Data Fetching (React Query)
  // ============================================================
  const { data: tournaments = [], isLoading: tournamentsLoading } = useTournamentsQuery("cash-game")

  // ============================================================
  // 3. UI State (Local)
  // ============================================================
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")
  const [selectedCategory, setSelectedCategory] = useState("All")

  // ============================================================
  // 4. Hands Data (Map - streamId → hands[])
  // ============================================================
  const allStreams = useMemo(() => {
    return tournaments.flatMap((t) =>
      (t.events || []).flatMap((e) => e.streams || [])
    )
  }, [tournaments])

  const handsMap = useMemo(() => {
    const map = new Map<string, Hand[]>()
    allStreams.forEach((stream) => {
      map.set(stream.id, stream.hands || [])
    })
    return map
  }, [allStreams])

  // ============================================================
  // 5. Filtered & Sorted Tournaments
  // ============================================================
  const filteredTournaments = useMemo(() => {
    let filtered = [...tournaments]

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.location?.toLowerCase().includes(query)
      )
    }

    // 카테고리 필터
    if (selectedCategory !== "All") {
      filtered = filtered.filter((t) => t.category === selectedCategory)
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        case "date-asc":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "most-hands":
          const aHands = (a.events || []).reduce((sum, e) =>
            sum + (e.streams || []).reduce((s, st) => s + (st.hands?.length || 0), 0), 0
          )
          const bHands = (b.events || []).reduce((sum, e) =>
            sum + (e.streams || []).reduce((s, st) => s + (st.hands?.length || 0), 0), 0
          )
          return bHands - aHands
        default:
          return 0
      }
    })

    return filtered
  }, [tournaments, searchQuery, selectedCategory, sortBy])

  // ============================================================
  // 6. Categories (from data)
  // ============================================================
  const categories = useMemo(() => {
    const cats = new Set<string>()
    tournaments.forEach((t) => {
      if (t.category) cats.add(t.category)
    })
    return ["All", ...Array.from(cats)]
  }, [tournaments])

  // ============================================================
  // 7. Event Handlers
  // ============================================================
  const handleAddTournament = () => {
    console.log("Add Cash Game")
  }

  const handleAddEvent = (tournamentId: string) => {
    console.log("Add Event to cash game:", tournamentId)
  }

  const handleAddStream = (eventId: string) => {
    console.log("Add Stream to event:", eventId)
  }

  const handleHandClick = (hand: Hand) => {
    console.log("Hand clicked:", hand)
  }

  const handleSeekToTime = (timeString: string) => {
    console.log("Seek to time:", timeString)
  }

  // ============================================================
  // 8. Loading State
  // ============================================================
  if (tournamentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="xl" />
        <span className="ml-3 text-lg">Loading cash games...</span>
      </div>
    )
  }

  // ============================================================
  // 9. Main Render
  // ============================================================
  return (
    <ErrorBoundary>
      <PageTransition variant="slideUp">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-10 h-10 text-green-500" />
              <div>
                <h1 className="text-4xl font-bold text-gold-400">Cash Game Archive</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {filteredTournaments.length} cash games • {allStreams.length} streams
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <TextInput
                type="search"
                placeholder="Search cash games..."
                icon={Search}
                className="w-full lg:w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <Dropdown label="Sort by" dismissOnClick={false}>
                <Dropdown.Item onClick={() => setSortBy("date-desc")}>
                  Most Recent
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setSortBy("date-asc")}>
                  Oldest First
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setSortBy("name-asc")}>
                  Name (A-Z)
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setSortBy("name-desc")}>
                  Name (Z-A)
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setSortBy("most-hands")}>
                  Most Hands
                </Dropdown.Item>
              </Dropdown>

              <Dropdown label={selectedCategory} dismissOnClick={false}>
                {categories.map((cat) => (
                  <Dropdown.Item key={cat} onClick={() => setSelectedCategory(cat)}>
                    {cat}
                  </Dropdown.Item>
                ))}
              </Dropdown>

              {isAdmin && (
                <Button color="warning" onClick={handleAddTournament}>
                  <Plus className="w-5 h-5 mr-2" />
                  Add Cash Game
                </Button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex gap-4 mb-6">
            <Badge color="info" size="lg">
              {filteredTournaments.length} Cash Games
            </Badge>
            <Badge color="success" size="lg">
              {filteredTournaments.reduce((sum, t) => sum + (t.events?.length || 0), 0)} Events
            </Badge>
            <Badge color="warning" size="lg">
              {allStreams.length} Streams
            </Badge>
          </div>

          {/* Main Content - ArchiveAccordion */}
          {filteredTournaments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <DollarSign className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">No cash games found</p>
              {isAdmin && (
                <Button color="light" className="mt-4" onClick={handleAddTournament}>
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Cash Game
                </Button>
              )}
            </div>
          ) : (
            <ArchiveAccordion
              tournaments={filteredTournaments}
              hands={handsMap}
              onAddEvent={handleAddEvent}
              onAddStream={handleAddStream}
              onHandClick={handleHandClick}
              onSeekToTime={handleSeekToTime}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </PageTransition>
    </ErrorBoundary>
  )
}
