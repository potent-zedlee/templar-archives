"use client"

/**
 * Archive Toolbar
 *
 * 재디자인된 상단 툴바
 * - 투어 로고 바 (수평 스크롤)
 * - 필터 드롭다운
 * - 검색/정렬
 * - 뷰 모드 전환
 * - 액션 버튼 (Upload, Add Tournament)
 */

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Plus, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { archiveKeys } from '@/lib/queries/archive-queries'
import { ArchiveTournamentLogosBar } from '@/components/features/archive/ArchiveTournamentLogosBar'
import { ArchiveUnifiedFilters } from '@/components/features/archive/ArchiveUnifiedFilters'
import { ArchiveSearchSort } from '@/components/features/archive/ArchiveSearchSort'
import { QuickUploadDialog } from '@/components/features/admin/upload/QuickUploadDialog'
import { Button } from '@/components/ui/button'
import { isAdmin } from '@/lib/auth-utils'
import { cn } from '@/lib/utils'
import type { GameType } from '@/lib/tournament-categories'

export function ArchiveToolbar() {
  const { userEmail } = useArchiveDataStore()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const {
    selectedCategory,
    setSelectedCategory,
    advancedFilters,
    setAdvancedFilters,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    openTournamentDialog,
  } = useArchiveUIStore()

  const [showFilters, setShowFilters] = useState(false)
  const isUserAdmin = isAdmin(userEmail)

  // Determine game type based on current route
  const gameType: GameType | undefined = pathname.includes('/tournament')
    ? 'tournament'
    : pathname.includes('/cash-game')
    ? 'cash_game'
    : undefined

  // Count active advanced filters
  const activeFilterCount = () => {
    let count = 0
    if (advancedFilters.dateRange.start || advancedFilters.dateRange.end) count++
    return count
  }

  return (
    <nav className="sticky top-0 z-40 space-y-0" aria-label="Archive toolbar">
      {/* Tournament Logos Bar */}
      <div className="backdrop-blur-xl bg-slate-900/80 border-b border-white/10 shadow-xl">
        <ArchiveTournamentLogosBar
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          gameType={gameType}
        />
      </div>

      {/* Filters, Search, and Controls */}
      <div className="backdrop-blur-xl bg-slate-900/90 border-b border-white/10 shadow-2xl">
        <div className="container max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4" role="toolbar" aria-label="Archive controls">
            {/* Filters Dropdown Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 border-white/20 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105",
                activeFilterCount() > 0 && "border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 ring-2 ring-blue-500/30"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="font-semibold">Filters</span>
              {activeFilterCount() > 0 && (
                <span className="ml-1 text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-0.5 rounded-full font-bold shadow-lg">
                  {activeFilterCount()}
                </span>
              )}
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* Search Bar (Wide) */}
            <div className="flex-1">
              <ArchiveSearchSort
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
              />
            </div>

            {/* Quick Upload Button */}
            <QuickUploadDialog
              onSuccess={() => {
                // React Query: Invalidate unsorted videos cache
                queryClient.invalidateQueries({ queryKey: archiveKeys.unsortedVideos() })
              }}
            />

            {/* Add Tournament Button (Admin Only) */}
            {isUserAdmin && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => openTournamentDialog()}
                aria-label="Add new tournament"
                className="backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 border-white/20 hover:border-blue-500/40 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters (Collapsible) */}
        {showFilters && (
          <div className="border-t border-white/10 backdrop-blur-xl bg-white/5 dark:bg-black/5 shadow-inner">
            <div className="container max-w-7xl mx-auto px-4 md:px-6 py-6">
              <ArchiveUnifiedFilters
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                advancedFilters={advancedFilters as any}
                onAdvancedFiltersChange={setAdvancedFilters as any}
                showCategoryFilter={false}
                showToggleButton={false}
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
