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
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Filters</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          토너먼트 필터링
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Category Filter */}
          <div>
            <button
              onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
              className="w-full flex items-center justify-between mb-3 text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>Category</span>
              </div>
              {isCategoryExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
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
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="truncate">{category}</span>
                      <Badge
                        variant={isSelected ? "default" : "secondary"}
                        className={`ml-2 ${
                          isSelected
                            ? 'bg-green-600 dark:bg-green-700'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
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

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          {/* Location Filter */}
          <div>
            <button
              onClick={() => setIsLocationExpanded(!isLocationExpanded)}
              className="w-full flex items-center justify-between mb-3 text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>Location</span>
              </div>
              {isLocationExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
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
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="truncate">{location}</span>
                      <Badge
                        variant={isSelected ? "default" : "secondary"}
                        className={`ml-2 ${
                          isSelected
                            ? 'bg-green-600 dark:bg-green-700'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
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

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          {/* Date Range Filter */}
          <div>
            <button
              onClick={() => setIsDateExpanded(!isDateExpanded)}
              className="w-full flex items-center justify-between mb-3 text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>Date Range</span>
              </div>
              {isDateExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>

            {isDateExpanded && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={selectedDateRange.start || ''}
                    onChange={(e) => onDateRangeChange({
                      ...selectedDateRange,
                      start: e.target.value || null
                    })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={selectedDateRange.end || ''}
                    onChange={(e) => onDateRangeChange({
                      ...selectedDateRange,
                      end: e.target.value || null
                    })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          {/* Hand Count Range Filter */}
          <div>
            <button
              onClick={() => setIsHandRangeExpanded(!isHandRangeExpanded)}
              className="w-full flex items-center justify-between mb-3 text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span>Hand Count</span>
              </div>
              {isHandRangeExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>

            {isHandRangeExpanded && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
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
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
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
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <Separator className="bg-gray-200 dark:bg-gray-700" />

      {/* Footer Actions */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Filters
        </Button>
      </div>
    </div>
  )
}
