"use client"

/**
 * Archive Tournament Page - 2-Column Layout (VSCode Style)
 *
 * Desktop (lg+):
 * - Header: Category Tabs + Search + Breadcrumb
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
import { useTournamentsQuery } from "@/lib/queries/archive-queries"
import type { Tournament, Event, Stream, BreadcrumbItem, TournamentCategory } from "@/lib/types/archive"
import { GridSkeleton } from "@/components/ui/skeletons/GridSkeleton"
import { MobileArchiveView } from "../_components/MobileArchiveView"
import { ArchiveBreadcrumb } from "@/components/features/archive/ArchiveBreadcrumb"
import { useArchiveTreeStore, type TreeNodeType } from "@/stores/archive-tree-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PanelLeftClose, PanelLeft, Filter } from "lucide-react"

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

  // Filter states (임시 - Phase 3에서 QuickFiltersBar로 이동)
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(null)

  // ============================================================
  // 4. Filtered Tournaments
  // ============================================================
  const filteredTournaments = useMemo(() => {
    let filtered = [...tournaments]

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    return filtered
  }, [tournaments, selectedCategory])

  // ============================================================
  // 5. Aggregated Categories for Quick Filter
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
        <header className="hidden lg:flex flex-shrink-0 h-12 items-center justify-between px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Left: Sidebar toggle + Breadcrumb */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>

            <div className="h-4 w-px bg-border" />

            <ArchiveBreadcrumb
              items={breadcrumbPath}
              onNavigate={handleBreadcrumbNavigate}
            />
          </div>

          {/* Right: Quick Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-1 overflow-x-auto max-w-[500px] scrollbar-hide">
              <Button
                variant={selectedCategory === null ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs whitespace-nowrap"
                onClick={() => setSelectedCategory(null)}
              >
                All
                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                  {tournaments.length}
                </Badge>
              </Button>
              {categories.slice(0, 6).map(({ category, count }) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs whitespace-nowrap"
                  onClick={() => setSelectedCategory(
                    selectedCategory === category ? null : category
                  )}
                >
                  {category}
                  <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                    {count}
                  </Badge>
                </Button>
              ))}
            </div>
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
