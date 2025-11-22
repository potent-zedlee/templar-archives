"use client"

import { LayoutGrid, List, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ViewMode = 'list' | 'grid' | 'timeline'

interface ArchiveViewSwitcherProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  className?: string
}

export function ArchiveViewSwitcher({
  currentView,
  onViewChange,
  className
}: ArchiveViewSwitcherProps) {
  return (
    <div className={cn("flex items-center gap-1 bg-muted/50 rounded-lg p-1", className)}>
      <Button
        variant={currentView === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className={cn(
          "h-8 px-3 transition-all",
          currentView === 'list' && "shadow-sm"
        )}
        title="List View"
      >
        <List className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">List</span>
      </Button>

      <Button
        variant={currentView === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
        className={cn(
          "h-8 px-3 transition-all",
          currentView === 'grid' && "shadow-sm"
        )}
        title="Grid View"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">Grid</span>
      </Button>

      <Button
        variant={currentView === 'timeline' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('timeline')}
        className={cn(
          "h-8 px-3 transition-all",
          currentView === 'timeline' && "shadow-sm"
        )}
        title="Timeline View"
      >
        <Clock className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">Timeline</span>
      </Button>
    </div>
  )
}
