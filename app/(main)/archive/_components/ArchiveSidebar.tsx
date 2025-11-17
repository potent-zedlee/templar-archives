"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, RotateCcw } from "lucide-react"
import { ArchiveSidebarCategories } from "./ArchiveSidebarCategories"
import { ArchiveUnifiedFilters } from "@/components/archive-unified-filters"
import { QuickUploadDialog } from "@/components/upload/QuickUploadDialog"
import { useQueryClient } from "@tanstack/react-query"
import { useArchiveUIStore } from "@/stores/archive-ui-store"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { archiveKeys } from "@/lib/queries/archive-queries"
import { isAdmin } from "@/lib/auth-utils"
import type { GameType } from "@/lib/tournament-categories"

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
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg text-gray-900">Archive</h2>
        <p className="text-sm text-gray-600">
          Filter tournaments and events
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Tournament Categories */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
            <ArchiveSidebarCategories
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              gameType={gameType}
            />
          </div>

          <Separator className="bg-gray-200" />

          {/* Advanced Filters */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Filters</h3>
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
      </ScrollArea>

      <Separator className="bg-gray-200" />

      <div className="p-4 space-y-2">
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
            className="w-full rounded-lg border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            onClick={() => openTournamentDialog()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tournament
          </Button>
        )}

        {/* Reset All */}
        <Button
          variant="ghost"
          className="w-full rounded-lg hover:bg-gray-100 text-gray-700"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All
        </Button>
      </div>
    </div>
  )
}
