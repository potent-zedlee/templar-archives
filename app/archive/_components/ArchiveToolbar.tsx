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
import dynamic from 'next/dynamic'
import { Plus, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { ArchiveTournamentLogosBar } from '@/components/archive-tournament-logos-bar'
import { ArchiveUnifiedFilters } from '@/components/archive-unified-filters'
import { ArchiveViewSwitcher } from '@/components/archive-view-switcher'
import { ArchiveSearchSort } from '@/components/archive-search-sort'
import { Button } from '@/components/ui/button'
import { isAdmin } from '@/lib/auth-utils'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { cn } from '@/lib/utils'

const QuickUploadDialog = dynamic(
  () => import('@/components/quick-upload-dialog').then((mod) => ({ default: mod.QuickUploadDialog })),
  { ssr: false }
)

const TournamentDialog = dynamic(
  () => import('@/components/tournament-dialog').then((mod) => ({ default: mod.TournamentDialog })),
  { ssr: false }
)

export function ArchiveToolbar() {
  const { userEmail, loadUnsortedVideos } = useArchiveDataStore()
  const {
    selectedCategory,
    setSelectedCategory,
    advancedFilters,
    setAdvancedFilters,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    openTournamentDialog,
  } = useArchiveUIStore()

  const [showFilters, setShowFilters] = useState(false)
  const isUserAdmin = isAdmin(userEmail)

  // Count active advanced filters
  const activeFilterCount = () => {
    let count = 0
    if (advancedFilters.dateRange.start || advancedFilters.dateRange.end) count++
    if (advancedFilters.handCountRange[0] !== 0 || advancedFilters.handCountRange[1] !== 1000) count++
    if (!advancedFilters.videoSources.youtube || !advancedFilters.videoSources.upload) count++
    if (advancedFilters.hasHandsOnly) count++
    return count
  }

  return (
    <nav className="space-y-0" aria-label="Archive toolbar">
      {/* Tournament Logos Bar */}
      <ArchiveTournamentLogosBar
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Filters, Search, and Controls */}
      <div className="bg-background border-b border-border/40">
        <div className="container max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4" role="toolbar" aria-label="Archive controls">
            {/* Filters Dropdown Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/5",
                activeFilterCount() > 0 && "border-primary"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
              {activeFilterCount() > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
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

            {/* View Mode Switcher */}
            <ArchiveViewSwitcher currentView={viewMode} onViewChange={setViewMode} />

            {/* Quick Upload Button */}
            <QuickUploadDialog onSuccess={loadUnsortedVideos} />

            {/* Add Tournament Button (Admin Only) */}
            {isUserAdmin && (
              <Button
                variant="default"
                size="sm"
                onClick={() => openTournamentDialog()}
                aria-label="Add new tournament"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add Tournament
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters (Collapsible) */}
        {showFilters && (
          <div className="border-t border-border/40 bg-muted/30">
            <div className="container max-w-7xl mx-auto px-4 md:px-6 py-6">
              <ArchiveUnifiedFilters
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                advancedFilters={advancedFilters}
                onAdvancedFiltersChange={setAdvancedFilters}
                showCategoryFilter={false}
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
