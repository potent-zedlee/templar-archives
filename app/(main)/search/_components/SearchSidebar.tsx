"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { RotateCcw } from "lucide-react"
import { FilterPanel } from "@/components/common/FilterPanel"

interface SearchSidebarProps {
  onApplyFilters?: () => void
}

export function SearchSidebar({ onApplyFilters }: SearchSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Filters</h2>
        <p className="text-sm text-muted-foreground">
          Refine your search results
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <FilterPanel
            isOpen={true}
            onClose={() => {}}
            onApply={onApplyFilters}
            className="border-0 shadow-none"
          />
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-4 space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => window.location.reload()}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All Filters
        </Button>
      </div>
    </div>
  )
}
