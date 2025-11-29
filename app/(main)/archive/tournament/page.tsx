"use client"

/**
 * Archive Tournament Page - 2-Column Layout (VSCode Style)
 *
 * Desktop (lg+):
 * - Header: Category Tabs + QuickFilters + Breadcrumb
 * - Left: Tree Explorer (280px)
 * - Right: Main panel - Dashboard or Hands List
 *
 * Mobile (< lg): Card-based tournament list
 */

import { useState, useMemo } from "react"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { FileTreeExplorer } from "../_components/FileTreeExplorer"
import { ArchiveDashboard } from "../_components/ArchiveDashboard"
import { HandsListPanel } from "../_components/HandsListPanel"
import { CategoryTabs } from "../_components/CategoryTabs"
import { QuickFiltersBar } from "../_components/QuickFiltersBar"
import { useTournamentsQuery } from "@/lib/queries/archive-queries"
import type { Tournament, Event, Stream, BreadcrumbItem, TournamentCategory } from "@/lib/types/archive"
import { GridSkeleton } from "@/components/ui/skeletons/GridSkeleton"
import { MobileArchiveView } from "../_components/MobileArchiveView"
import { ArchiveBreadcrumb } from "@/components/features/archive/ArchiveBreadcrumb"
import { useArchiveTreeStore, type TreeNodeType } from "@/stores/archive-tree-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PanelLeftClose, PanelLeft } from "lucide-react"

export default function ArchiveTournamentPage() {
  // ============================================================
  // 1. Data Fetching (React Query)
  // ============================================================
  const { data: tournaments = [], isLoading } = useTournamentsQuery("tournament")

  // ============================================================
  // 2. Tree Store State
  // ============================================================
  const {
    breadcrumbPath,
    selectedNodeType,
    navigateToBreadcrumb,
  } = useArchiveTreeStore()

  // ============================================================
  // 3. Local UI State
  // ============================================================
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
  const [hasHandsOnly, setHasHandsOnly] = useState(false)

  // ============================================================
  // 4. Filtered Tournaments
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

    // Has hands only filter
    if (hasHandsOnly) {
      filtered = filtered.filter(t =>
        t.events?.some(e => e.streams?.some(s => (s.hand_count || 0) > 0))
      )
    }

    return filtered
  }, [tournaments, selectedCategory, selectedLocation, selectedDateRange, hasHandsOnly])

  // ============================================================
  // 5. Aggregated Data for Filters
  // ============================================================
  const categories = useMemo(() => {
    const categoryMap = new Map<TournamentCategory, { count: number; logoUrl?: string }>()
    tournaments.forEach(t => {
      if (t.category) {
        const existing = categoryMap.get(t.category) || { count: 0 }
        categoryMap.set(t.category, {
          count: existing.count + 1,
          logoUrl: t.category_logo_url || t.category_logo || existing.logoUrl,
        })
      }
    })
    return Array.from(categoryMap.entries())
      .map(([category, { count, logoUrl }]) => ({ category, count, logoUrl }))
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
  // 6. Event Handlers
  // ============================================================
  const handleNodeSelect = (
    _nodeId: string,
    nodeType: TreeNodeType,
    data: Tournament | Event | Stream | null
  ) => {
    if (nodeType === 'stream' && data) {
      setSelectedStream(data as Stream)
    } else {
      setSelectedStream(null)
    }
  }

  const handleBreadcrumbNavigate = (item: BreadcrumbItem | null) => {
    navigateToBreadcrumb(item)
    setSelectedStream(null)
  }

  const handleResetFilters = () => {
    setSelectedCategory(null)
    setSelectedLocation(null)
    setSelectedDateRange({ start: null, end: null })
    setSelectedHandRange({ min: null, max: null })
    setHasHandsOnly(false)
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
  // 8. Main Render
  // ============================================================
  return (
    <ErrorBoundary>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* ========== Desktop Header ========== */}
        <header className="hidden lg:block flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Top Row: Sidebar Toggle + Breadcrumb + Quick Filters */}
          <div className="flex items-center justify-between h-11 px-4">
            {/* Left: Sidebar toggle + Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              >
                {sidebarCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>

              <div className="h-4 w-px bg-border flex-shrink-0" />

              <div className="min-w-0 overflow-hidden">
                <ArchiveBreadcrumb
                  items={breadcrumbPath}
                  onNavigate={handleBreadcrumbNavigate}
                />
              </div>
            </div>

            {/* Right: Quick Filters */}
            <QuickFiltersBar
              selectedDateRange={selectedDateRange}
              onDateRangeChange={setSelectedDateRange}
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
              locations={locations}
              selectedHandRange={selectedHandRange}
              onHandRangeChange={setSelectedHandRange}
              hasHandsOnly={hasHandsOnly}
              onHasHandsOnlyChange={setHasHandsOnly}
              onReset={handleResetFilters}
            />
          </div>

          {/* Bottom Row: Category Tabs */}
          <div className="px-4 pb-2">
            <CategoryTabs
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              totalCount={tournaments.length}
            />
          </div>
        </header>

        {/* ========== Desktop: 2-Column Layout ========== */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* Left: Tree Explorer (280px, collapsible) */}
          <aside
            className={cn(
              "flex-shrink-0 h-full transition-all duration-300 ease-in-out overflow-hidden",
              sidebarCollapsed ? "w-0" : "w-72"
            )}
          >
            <FileTreeExplorer
              tournaments={filteredTournaments}
              onNodeSelect={handleNodeSelect}
              className={cn(
                "transition-opacity duration-200",
                sidebarCollapsed && "opacity-0"
              )}
            />
          </aside>

          {/* Right: Main Panel (flex-1) */}
          <main className="flex-1 overflow-hidden">
            {selectedNodeType === 'stream' && selectedStream ? (
              <HandsListPanel
                streamId={selectedStream.id}
                stream={selectedStream}
              />
            ) : (
              <ArchiveDashboard tournaments={filteredTournaments} />
            )}
          </main>
        </div>

        {/* ========== Mobile: Card-based tournament list ========== */}
        <div className="lg:hidden h-full w-full">
          <MobileArchiveView
            tournaments={filteredTournaments}
            isLoading={isLoading}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}
