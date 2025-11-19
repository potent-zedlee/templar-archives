"use client"

/**
 * Archive Cash Game Page - Redesigned (Players Page Style)
 *
 * 플레이어 페이지와 동일한 레이아웃 및 색상 팔레트 적용:
 * - Fixed search bar (top)
 * - Scrollable grid content (middle)
 * - Fixed pagination (bottom)
 * - Green accent color (player page style)
 */

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StaggerContainer, StaggerItem } from "@/components/page-transition"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, ChevronLeft, ChevronRight, DollarSign } from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"
import { TournamentCard } from "../_components/TournamentCard"
import { useTournamentsQuery } from "@/lib/queries/archive-queries"
// import type { Tournament } from "@/lib/types/archive"
import { GridSkeleton } from "@/components/skeletons/grid-skeleton"
import { EmptyState } from "@/components/empty-state"

type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "most-hands"

export default function ArchiveCashGamePage() {
  const router = useRouter()

  // ============================================================
  // 1. Data Fetching (React Query)
  // ============================================================
  const { data: tournaments = [], isLoading } = useTournamentsQuery("cash-game")

  // ============================================================
  // 2. UI State (Local)
  // ============================================================
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")
  const [currentPage, setCurrentPage] = useState(1)
  const TOURNAMENTS_PER_PAGE = 12

  // ============================================================
  // 3. Filtered & Sorted Tournaments
  // ============================================================
  const filteredTournaments = useMemo(() => {
    let filtered = [...tournaments]

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.location?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query)
      )
    }

    // 정렬
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
        case "most-hands": {
          // hand_count는 서버에서 계산된 값 사용
          return (b.hand_count || 0) - (a.hand_count || 0)
        }
        default:
          return 0
      }
    })

    return filtered
  }, [tournaments, searchQuery, sortBy])

  // ============================================================
  // 4. Pagination
  // ============================================================
  const totalPages = Math.ceil(filteredTournaments.length / TOURNAMENTS_PER_PAGE)
  const startIndex = (currentPage - 1) * TOURNAMENTS_PER_PAGE
  const endIndex = startIndex + TOURNAMENTS_PER_PAGE
  const paginatedTournaments = filteredTournaments.slice(startIndex, endIndex)

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy])

  // ============================================================
  // 5. Event Handlers
  // ============================================================
  const handleTournamentClick = (tournamentId: string) => {
    router.push(`/archive/cash-game?selected=${tournamentId}`)
  }

  // ============================================================
  // 6. Loading State
  // ============================================================
  if (isLoading) {
    return (
      <div className="p-6">
        <GridSkeleton count={12} columns={4} />
      </div>
    )
  }

  // ============================================================
  // 7. Main Render
  // ============================================================
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        {/* Search Bar - Fixed at top */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="캐시 게임 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
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
              {startIndex + 1}-{Math.min(endIndex, filteredTournaments.length)}
            </span>
            {' '}/ {filteredTournaments.length} 캐시 게임
          </div>
        </div>

        {/* Cash Games Grid - Scrollable */}
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6">
            <StaggerContainer
              key={`${currentPage}-${filteredTournaments.length}`}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
              staggerDelay={0.05}
            >
              {paginatedTournaments.map((tournament) => (
                <StaggerItem key={tournament.id}>
                  <TournamentCard
                    tournament={tournament}
                    onClick={() => handleTournamentClick(tournament.id)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {paginatedTournaments.length === 0 && (
              <EmptyState
                icon={DollarSign}
                title={searchQuery ? "검색 결과 없음" : "캐시 게임 없음"}
                description={searchQuery ? "검색 조건을 변경해보세요" : "아직 등록된 캐시 게임이 없습니다"}
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
    </ErrorBoundary>
  )
}
