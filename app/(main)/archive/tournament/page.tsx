"use client"

/**
 * Archive Tournament Page - List Layout with Sidebar Filters
 *
 * 플레이어 페이지 스타일의 리스트 레이아웃:
 * - Left sidebar: Category/Location/Date/HandCount filters (Desktop: fixed, Mobile: Sheet)
 * - Right main panel: Search bar (fixed top) + List view (scrollable) + Pagination (fixed bottom)
 * - Green accent color (consistent with players page)
 */

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StaggerContainer, StaggerItem } from "@/components/page-transition"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Search, ChevronLeft, ChevronRight, Trophy, Filter } from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"
import { TournamentListItem } from "../_components/TournamentListItem"
import { ArchiveFilterSidebar } from "../_components/ArchiveFilterSidebar"
import { useTournamentsQuery } from "@/lib/queries/archive-queries"
import type { TournamentCategory } from "@/lib/types/archive"
import { GridSkeleton } from "@/components/skeletons/grid-skeleton"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"

type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "most-hands"

export default function ArchiveTournamentPage() {
  const router = useRouter()

  // ============================================================
  // 1. Data Fetching (React Query)
  // ============================================================
  const { data: tournaments = [], isLoading } = useTournamentsQuery("tournament")

  // ============================================================
  // 2. UI State (Local)
  // ============================================================
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")
  const [currentPage, setCurrentPage] = useState(1)
  const TOURNAMENTS_PER_PAGE = 20

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: string | null
    end: string | null
  }>({ start: null, end: null })
  const [selectedHandRange, setSelectedHandRange] = useState<{
    min: number | null
    max: number | null
  }>({ min: null, max: null })

  // Mobile sheet state
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // ============================================================
  // 3. Aggregated Data (Categories, Locations)
  // ============================================================
  const categories = useMemo(() => {
    const categoryMap = new Map<TournamentCategory, number>()
    tournaments.forEach(t => {
      if (t.category) {
        categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1)
      }
    })
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }, [tournaments])

  const locations = useMemo(() => {
    const locationMap = new Map<string, number>()
    tournaments.forEach(t => {
      if (t.location) {
        locationMap.set(t.location, (locationMap.get(t.location) || 0) + 1)
      }
    })
    return Array.from(locationMap.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
  }, [tournaments])

  // ============================================================
  // 4. Filtered & Sorted Tournaments
  // ============================================================
  const filteredTournaments = useMemo(() => {
    let filtered = [...tournaments]

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    // Location filter
    if (selectedLocation) {
      filtered = filtered.filter(t => t.location === selectedLocation)
    }

    // Date range filter
    if (selectedDateRange.start) {
      filtered = filtered.filter(t =>
        t.start_date && new Date(t.start_date) >= new Date(selectedDateRange.start!)
      )
    }
    if (selectedDateRange.end) {
      filtered = filtered.filter(t =>
        t.start_date && new Date(t.start_date) <= new Date(selectedDateRange.end!)
      )
    }

    // Hand count range filter
    if (selectedHandRange.min !== null) {
      filtered = filtered.filter(t => (t.hand_count || 0) >= selectedHandRange.min!)
    }
    if (selectedHandRange.max !== null) {
      filtered = filtered.filter(t => (t.hand_count || 0) <= selectedHandRange.max!)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.location?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query)
      )
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.start_date || b.created_at || 0).getTime() -
                 new Date(a.start_date || a.created_at || 0).getTime()
        case "date-asc":
          return new Date(a.start_date || a.created_at || 0).getTime() -
                 new Date(b.start_date || b.created_at || 0).getTime()
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "most-hands":
          return (b.hand_count || 0) - (a.hand_count || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [tournaments, selectedCategory, selectedLocation, selectedDateRange, selectedHandRange, searchQuery, sortBy])

  // ============================================================
  // 5. Pagination
  // ============================================================
  const totalPages = Math.ceil(filteredTournaments.length / TOURNAMENTS_PER_PAGE)
  const startIndex = (currentPage - 1) * TOURNAMENTS_PER_PAGE
  const endIndex = startIndex + TOURNAMENTS_PER_PAGE
  const paginatedTournaments = filteredTournaments.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy, selectedCategory, selectedLocation, selectedDateRange, selectedHandRange])

  // ============================================================
  // 6. Event Handlers
  // ============================================================
  const handleTournamentClick = (tournamentId: string) => {
    router.push(`/archive/tournament?selected=${tournamentId}`)
  }

  const handleResetFilters = () => {
    setSelectedCategory(null)
    setSelectedLocation(null)
    setSelectedDateRange({ start: null, end: null })
    setSelectedHandRange({ min: null, max: null })
  }

  // ============================================================
  // 7. Loading State
  // ============================================================
  if (isLoading) {
    return (
      <div className="p-6">
        <GridSkeleton count={12} columns={4} />
      </div>
    )
  }

  // ============================================================
  // 8. Sidebar Props
  // ============================================================
  const sidebarProps = {
    selectedCategory,
    onCategoryChange: setSelectedCategory,
    selectedDateRange,
    onDateRangeChange: setSelectedDateRange,
    selectedHandRange,
    onHandRangeChange: setSelectedHandRange,
    selectedLocation,
    onLocationChange: setSelectedLocation,
    onReset: handleResetFilters,
    categories,
    locations
  }

  // ============================================================
  // 9. Main Render
  // ============================================================
  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Desktop Sidebar - Fixed */}
        <aside className="hidden lg:block w-80 flex-shrink-0 h-full overflow-hidden">
          <ArchiveFilterSidebar {...sidebarProps} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Mobile Filter Button (lg 미만에서만 표시) */}
          <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3">
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="h-full overflow-hidden">
                  <ArchiveFilterSidebar {...sidebarProps} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Search Bar - Fixed at top */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="토너먼트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Sort Options */}
            <div className="mt-4 flex gap-2 flex-wrap">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md border-none focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="date-desc">최신순</option>
                <option value="date-asc">오래된순</option>
                <option value="name-asc">이름 (A-Z)</option>
                <option value="name-desc">이름 (Z-A)</option>
                <option value="most-hands">핸드 많은순</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {filteredTournaments.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredTournaments.length)}
              </span>
              {' '}/ {filteredTournaments.length} 토너먼트
            </div>
          </div>

          {/* Tournament List - Scrollable */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              <StaggerContainer
                key={`${currentPage}-${filteredTournaments.length}`}
                className="space-y-2"
                staggerDelay={0.03}
              >
                {paginatedTournaments.map((tournament) => (
                  <StaggerItem key={tournament.id}>
                    <TournamentListItem
                      tournament={tournament}
                      onClick={() => handleTournamentClick(tournament.id)}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {paginatedTournaments.length === 0 && (
                <EmptyState
                  icon={Trophy}
                  title={searchQuery ? "검색 결과 없음" : "토너먼트 없음"}
                  description={searchQuery ? "검색 조건을 변경해보세요" : "아직 등록된 토너먼트가 없습니다"}
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
        </main>
      </div>
    </ErrorBoundary>
  )
}
