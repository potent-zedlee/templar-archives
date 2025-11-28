"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Trophy, Calendar, MapPin, Hash, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import type { TournamentCategory } from "@/lib/types/archive"

interface DateRange {
  start: string | null
  end: string | null
}

interface HandRange {
  min: number | null
  max: number | null
}

interface ArchiveFilterSidebarProps {
  selectedCategory: TournamentCategory | null
  onCategoryChange: (category: TournamentCategory | null) => void
  selectedDateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  selectedHandRange: HandRange
  onHandRangeChange: (range: HandRange) => void
  selectedLocation: string | null
  onLocationChange: (location: string | null) => void
  onReset: () => void
  categories: { category: TournamentCategory; count: number }[]
  locations: { location: string; count: number }[]
}

export function ArchiveFilterSidebar({
  selectedCategory,
  onCategoryChange,
  selectedDateRange,
  onDateRangeChange,
  selectedHandRange,
  onHandRangeChange,
  selectedLocation,
  onLocationChange,
  onReset,
  categories,
  locations
}: ArchiveFilterSidebarProps) {
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(true)
  const [isLocationExpanded, setIsLocationExpanded] = useState(false)
  const [isDateExpanded, setIsDateExpanded] = useState(false)
  const [isHandRangeExpanded, setIsHandRangeExpanded] = useState(false)

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg text-foreground">Filters</h2>
        <p className="text-sm text-muted-foreground">
          토너먼트 필터링
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Category Filter */}
          <div>
            <button
              onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
              className="w-full flex items-center justify-between mb-3 text-sm font-medium text-foreground"
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span>Category</span>
              </div>
              {isCategoryExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isCategoryExpanded && (
              <div className="space-y-1">
                {categories.map(({ category, count }) => {
                  const isSelected = selectedCategory === category

                  return (
                    <button
                      key={category}
                      onClick={() => onCategoryChange(isSelected ? null : category)}
                      className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                        isSelected
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <span className="truncate">{category}</span>
                      <Badge
                        variant={isSelected ? "default" : "secondary"}
                        className={`ml-2 ${
                          isSelected
                            ? 'bg-green-600 dark:bg-green-700'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {count}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Location Filter */}
          <div>
            <button
              onClick={() => setIsLocationExpanded(!isLocationExpanded)}
              className="w-full flex items-center justify-between mb-3 text-sm font-medium text-foreground"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Location</span>
              </div>
              {isLocationExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isLocationExpanded && (
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {locations.map(({ location, count }) => {
                  const isSelected = selectedLocation === location

                  return (
                    <button
                      key={location}
                      onClick={() => onLocationChange(isSelected ? null : location)}
                      className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                        isSelected
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <span className="truncate">{location}</span>
                      <Badge
                        variant={isSelected ? "default" : "secondary"}
                        className={`ml-2 ${
                          isSelected
                            ? 'bg-green-600 dark:bg-green-700'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {count}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Date Range Filter */}
          <div>
            <button
              onClick={() => setIsDateExpanded(!isDateExpanded)}
              className="w-full flex items-center justify-between mb-3 text-sm font-medium text-foreground"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Date Range</span>
              </div>
              {isDateExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isDateExpanded && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={selectedDateRange.start || ''}
                    onChange={(e) => onDateRangeChange({
                      ...selectedDateRange,
                      start: e.target.value || null
                    })}
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={selectedDateRange.end || ''}
                    onChange={(e) => onDateRangeChange({
                      ...selectedDateRange,
                      end: e.target.value || null
                    })}
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Hand Count Range Filter */}
          <div>
            <button
              onClick={() => setIsHandRangeExpanded(!isHandRangeExpanded)}
              className="w-full flex items-center justify-between mb-3 text-sm font-medium text-foreground"
            >
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span>Hand Count</span>
              </div>
              {isHandRangeExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isHandRangeExpanded && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Min Hands
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={selectedHandRange.min ?? ''}
                    onChange={(e) => onHandRangeChange({
                      ...selectedHandRange,
                      min: e.target.value ? parseInt(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Max Hands
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="999999"
                    value={selectedHandRange.max ?? ''}
                    onChange={(e) => onHandRangeChange({
                      ...selectedHandRange,
                      max: e.target.value ? parseInt(e.target.value) : null
                    })}
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <Separator className="bg-border" />

      {/* Footer Actions */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full rounded-lg hover:bg-accent text-foreground"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Filters
        </Button>
      </div>
    </div>
  )
}
