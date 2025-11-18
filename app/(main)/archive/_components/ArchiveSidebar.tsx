"use client"

/**
 * Archive Sidebar - Flowbite Enhanced
 *
 * Flowbite 패턴을 활용한 개선:
 * - Sidebar 구조 최적화
 * - 접근성 개선 (ARIA 레이블)
 * - 반응형 개선
 */

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, RotateCcw, Upload } from "lucide-react"
import { ArchiveSidebarCategories } from "./ArchiveSidebarCategories"
import { ArchiveUnifiedFilters } from "@/components/archive-unified-filters"
import { QuickUploadDialog } from "@/components/upload/QuickUploadDialog"
import { useQueryClient } from "@tanstack/react-query"
import { useArchiveUIStore } from "@/stores/archive-ui-store"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { archiveKeys } from "@/lib/queries/archive-queries"
import { isAdmin } from "@/lib/auth-utils"
import type { GameType } from "@/lib/tournament-categories"
import { cn } from "@/lib/utils"

interface ArchiveSidebarProps {
  gameType?: GameType
}

export function ArchiveSidebar({ gameType }: ArchiveSidebarProps) {
  const queryClient = useQueryClient()
  const { userEmail } = useArchiveDataStore()
  const {
    selectedCategory,
    setSelectedCategory,
    advancedFilters,
    setAdvancedFilters,
    openTournamentDialog,
    resetAllFilters,
  } = useArchiveUIStore()

  const isUserAdmin = isAdmin(userEmail)

  const handleReset = () => {
    resetAllFilters()
    setSelectedCategory("All")
  }

  return (
    <aside
      className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-sm"
      aria-label="Archive sidebar"
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">Archive</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Browse & Filter
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Tournament Categories */}
          <section aria-labelledby="categories-heading">
            <h3
              id="categories-heading"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-2"
            >
              Categories
            </h3>
            <ArchiveSidebarCategories
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              gameType={gameType}
            />
          </section>

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          {/* Advanced Filters */}
          <section aria-labelledby="filters-heading">
            <h3
              id="filters-heading"
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-2"
            >
              Filters
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <ArchiveUnifiedFilters
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                advancedFilters={advancedFilters as any}
                onAdvancedFiltersChange={setAdvancedFilters as any}
                showCategoryFilter={false}
                showToggleButton={false}
              />
            </div>
          </section>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 space-y-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {/* Quick Upload */}
        <div className="w-full">
          <QuickUploadDialog
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: archiveKeys.unsortedVideos() })
            }}
          />
        </div>

        {/* Add Tournament (Admin Only) */}
        {isUserAdmin && (
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 rounded-lg",
              "border-gold-600 dark:border-gold-500 text-gold-600 dark:text-gold-400",
              "hover:bg-gold-50 dark:hover:bg-gold-950 hover:border-gold-700 dark:hover:border-gold-400",
              "focus:ring-4 focus:ring-gold-300 dark:focus:ring-gold-800",
              "transition-all duration-200"
            )}
            onClick={() => openTournamentDialog()}
            aria-label="Add new tournament"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium">Add Tournament</span>
          </Button>
        )}

        {/* Reset All */}
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 rounded-lg",
            "text-gray-700 dark:text-gray-300",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            "focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-700",
            "transition-all duration-200"
          )}
          onClick={handleReset}
          aria-label="Reset all filters"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="font-medium">Reset All</span>
        </Button>
      </div>
    </aside>
  )
}
