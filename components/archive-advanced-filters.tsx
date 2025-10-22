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
import type { AdvancedFilters } from "@/lib/types/archive"

interface ArchiveAdvancedFiltersProps {
  filters: AdvancedFilters
  onFiltersChange: (filters: AdvancedFilters) => void
  className?: string
}

export function ArchiveAdvancedFilters({
  filters,
  onFiltersChange,
  className
}: ArchiveAdvancedFiltersProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('archive-filters-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  const handleStartDateSelect = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: { ...filters.dateRange, start: date }
    })
  }

  const handleEndDateSelect = (date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: { ...filters.dateRange, end: date }
    })
  }

  const handleHandCountRangeChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      handCountRange: [value[0], value[1]]
    })
  }

  const handleVideoSourceChange = (source: 'youtube' | 'upload', checked: boolean) => {
    onFiltersChange({
      ...filters,
      videoSources: {
        ...filters.videoSources,
        [source]: checked
      }
    })
  }

  const handleHasHandsOnlyChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      hasHandsOnly: checked
    })
  }

  const handleReset = () => {
    onFiltersChange({
      dateRange: { start: undefined, end: undefined },
      handCountRange: [0, 1000],
      videoSources: { youtube: true, upload: true },
      hasHandsOnly: false
    })
  }

  const isFiltered =
    filters.dateRange.start !== undefined ||
    filters.dateRange.end !== undefined ||
    filters.handCountRange[0] !== 0 ||
    filters.handCountRange[1] !== 1000 ||
    !filters.videoSources.youtube ||
    !filters.videoSources.upload ||
    filters.hasHandsOnly

  return (
    <Card className={cn("mb-4", className)}>
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Advanced Filters</h3>
          {isFiltered && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newState = !isCollapsed
              setIsCollapsed(newState)
              localStorage.setItem('archive-filters-collapsed', String(newState))
            }}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              {/* Start Date */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateRange.start && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.start ? (
                        format(filters.dateRange.start, "MMM dd, yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.start}
                      onSelect={handleStartDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateRange.end && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.end ? (
                        format(filters.dateRange.end, "MMM dd, yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.end}
                      onSelect={handleEndDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Hand Count Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hand Count Range</Label>
            <div className="space-y-2">
              <Slider
                value={filters.handCountRange}
                onValueChange={handleHandCountRangeChange}
                min={0}
                max={1000}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{filters.handCountRange[0]} hands</span>
                <span>{filters.handCountRange[1]} hands</span>
              </div>
            </div>
          </div>

          {/* Video Sources */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Video Sources</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="source-youtube"
                  checked={filters.videoSources.youtube}
                  onCheckedChange={(checked) =>
                    handleVideoSourceChange('youtube', checked as boolean)
                  }
                />
                <Label
                  htmlFor="source-youtube"
                  className="text-sm font-normal cursor-pointer"
                >
                  YouTube
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="source-upload"
                  checked={filters.videoSources.upload}
                  onCheckedChange={(checked) =>
                    handleVideoSourceChange('upload', checked as boolean)
                  }
                />
                <Label
                  htmlFor="source-upload"
                  className="text-sm font-normal cursor-pointer"
                >
                  Local Upload
                </Label>
              </div>
            </div>
          </div>

          {/* Has Hands Only */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Show videos with hands only</Label>
              <p className="text-xs text-muted-foreground">
                Filter out videos without any analyzed hands
              </p>
            </div>
            <Switch
              checked={filters.hasHandsOnly}
              onCheckedChange={handleHasHandsOnlyChange}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
