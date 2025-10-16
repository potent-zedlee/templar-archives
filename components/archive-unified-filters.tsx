"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Filter, X, Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AdvancedFilters } from "@/components/archive-advanced-filters"

interface ArchiveUnifiedFiltersProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  advancedFilters: AdvancedFilters
  onAdvancedFiltersChange: (filters: AdvancedFilters) => void
  className?: string
}

const CATEGORIES = [
  "All",
  "WSOP",
  "Triton",
  "EPT",
  "Hustler Casino Live",
  "APT",
  "APL",
  "GGPOKER"
]

export function ArchiveUnifiedFilters({
  selectedCategory,
  onCategoryChange,
  advancedFilters,
  onAdvancedFiltersChange,
  className
}: ArchiveUnifiedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Load open state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('archive-unified-filters-open')
    if (saved !== null) {
      setIsOpen(saved === 'true')
    }
  }, [])

  // Save open state to localStorage
  const toggleOpen = () => {
    const newState = !isOpen
    setIsOpen(newState)
    localStorage.setItem('archive-unified-filters-open', String(newState))
  }

  const handleStartDateSelect = (date: Date | undefined) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      dateRange: { ...advancedFilters.dateRange, start: date }
    })
  }

  const handleEndDateSelect = (date: Date | undefined) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      dateRange: { ...advancedFilters.dateRange, end: date }
    })
  }

  const handleHandCountRangeChange = (value: number[]) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      handCountRange: [value[0], value[1]]
    })
  }

  const handleVideoSourceChange = (source: 'youtube' | 'upload', checked: boolean) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      videoSources: {
        ...advancedFilters.videoSources,
        [source]: checked
      }
    })
  }

  const handleHasHandsOnlyChange = (checked: boolean) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      hasHandsOnly: checked
    })
  }

  const handleReset = () => {
    onCategoryChange("All")
    onAdvancedFiltersChange({
      dateRange: { start: undefined, end: undefined },
      handCountRange: [0, 1000],
      videoSources: { youtube: true, upload: true },
      hasHandsOnly: false
    })
  }

  // Count active filters
  const activeFilterCount = () => {
    let count = 0
    if (selectedCategory !== "All") count++
    if (advancedFilters.dateRange.start || advancedFilters.dateRange.end) count++
    if (advancedFilters.handCountRange[0] !== 0 || advancedFilters.handCountRange[1] !== 1000) count++
    if (!advancedFilters.videoSources.youtube || !advancedFilters.videoSources.upload) count++
    if (advancedFilters.hasHandsOnly) count++
    return count
  }

  const isFiltered = activeFilterCount() > 0

  return (
    <div className={cn("border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        {/* Filter Toggle Button */}
        <div className="flex items-center justify-between py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleOpen}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {isFiltered && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {activeFilterCount()}
              </span>
            )}
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-3 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {isOpen && (
          <div className="pb-4 space-y-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2">
                  {CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => onCategoryChange(category)}
                      className="h-8"
                    >
                      {category === "Hustler Casino Live" ? "Hustler" : category}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Advanced Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="space-y-2">
                  {/* Start Date */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs",
                          !advancedFilters.dateRange.start && "text-muted-foreground"
                        )}
                        size="sm"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {advancedFilters.dateRange.start ? (
                          format(advancedFilters.dateRange.start, "MMM dd, yyyy")
                        ) : (
                          <span>From</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={advancedFilters.dateRange.start}
                        onSelect={handleStartDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {/* End Date */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs",
                          !advancedFilters.dateRange.end && "text-muted-foreground"
                        )}
                        size="sm"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {advancedFilters.dateRange.end ? (
                          format(advancedFilters.dateRange.end, "MMM dd, yyyy")
                        ) : (
                          <span>To</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={advancedFilters.dateRange.end}
                        onSelect={handleEndDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Hand Count Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hand Count</Label>
                <div className="space-y-2 pt-2">
                  <Slider
                    value={advancedFilters.handCountRange}
                    onValueChange={handleHandCountRangeChange}
                    min={0}
                    max={1000}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{advancedFilters.handCountRange[0]}</span>
                    <span>{advancedFilters.handCountRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Video Sources */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Video Sources</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="unified-source-youtube"
                      checked={advancedFilters.videoSources.youtube}
                      onCheckedChange={(checked) =>
                        handleVideoSourceChange('youtube', checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="unified-source-youtube"
                      className="text-xs font-normal cursor-pointer"
                    >
                      YouTube
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="unified-source-upload"
                      checked={advancedFilters.videoSources.upload}
                      onCheckedChange={(checked) =>
                        handleVideoSourceChange('upload', checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="unified-source-upload"
                      className="text-xs font-normal cursor-pointer"
                    >
                      Local Upload
                    </Label>
                  </div>
                </div>
              </div>

              {/* Has Hands Only */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Show videos with hands only</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={advancedFilters.hasHandsOnly}
                    onCheckedChange={handleHasHandsOnlyChange}
                  />
                  <span className="text-xs text-muted-foreground">
                    Filter out videos without analyzed hands
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
