"use client"

/**
 * Archive Toolbar
 *
 * 상단 툴바 컴포넌트
 * - 카테고리 필터
 * - 고급 필터
 * - 검색/정렬
 * - 뷰 모드 전환
 * - 액션 버튼 (Upload, Add Tournament)
 */

import dynamic from 'next/dynamic'
import { Plus } from 'lucide-react'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { ArchiveUnifiedFilters } from '@/components/archive-unified-filters'
import { ArchiveViewSwitcher } from '@/components/archive-view-switcher'
import { ArchiveSearchSort } from '@/components/archive-search-sort'
import { Button } from '@/components/ui/button'
import { isAdmin } from '@/lib/auth-utils'
import { useArchiveDataStore } from '@/stores/archive-data-store'

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
    tournamentDialog,
  } = useArchiveUIStore()

  const isUserAdmin = isAdmin(userEmail)

  return (
    <nav className="space-y-4" aria-label="Archive toolbar">
      {/* Unified Filters - Top Bar */}
      <ArchiveUnifiedFilters
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        advancedFilters={advancedFilters}
        onAdvancedFiltersChange={setAdvancedFilters}
      />

      {/* Search, Sort, View Mode Row */}
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between gap-4" role="toolbar" aria-label="Archive controls">
          {/* Search and Sort */}
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
    </nav>
  )
}
