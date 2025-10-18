"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Filter, X, Calendar as CalendarIcon, ChevronDown, ChevronUp, Search, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AdvancedFilters } from "@/components/archive-advanced-filters"
import { CategoryLogo } from "@/components/category-logo"
import {
  TOURNAMENT_CATEGORIES,
  POPULAR_CATEGORIES,
  CATEGORIES_BY_REGION,
  searchCategories,
  type TournamentCategory
} from "@/lib/tournament-categories"

interface ArchiveUnifiedFiltersProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  advancedFilters: AdvancedFilters
  onAdvancedFiltersChange: (filters: AdvancedFilters) => void
  showCategoryFilter?: boolean
  className?: string
}

export function ArchiveUnifiedFilters({
  selectedCategory,
  onCategoryChange,
  advancedFilters,
  onAdvancedFiltersChange,
  showCategoryFilter = true,
  className
}: ArchiveUnifiedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showOnlyPopular, setShowOnlyPopular] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['premier']))

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
    setSearchQuery("")
    setShowOnlyPopular(false)
  }

  // 그룹 토글 핸들러
  const toggleGroup = (region: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(region)) {
      newExpanded.delete(region)
    } else {
      newExpanded.add(region)
    }
    setExpandedGroups(newExpanded)
  }

  // 필터링된 카테고리 목록
  const filteredCategories = useMemo(() => {
    // 검색어가 있으면 검색 결과 반환
    if (searchQuery.trim()) {
      return searchCategories(searchQuery)
    }

    // 인기 투어만 표시
    if (showOnlyPopular) {
      return POPULAR_CATEGORIES
    }

    // 모든 활성 투어 반환
    return TOURNAMENT_CATEGORIES.filter(cat => cat.isActive)
  }, [searchQuery, showOnlyPopular])

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
    <div className={cn("border-b bg-gradient-to-b from-background/98 to-background/95 backdrop-blur-lg shadow-lg supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        {/* Filter Toggle Button */}
        <div className="flex items-center justify-between py-5">
          <Button
            variant="outline"
            size="default"
            onClick={toggleOpen}
            className="gap-2 hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/5 hover:scale-105 hover:shadow-md transition-all duration-200"
          >
            <Filter className="h-5 w-5" />
            <span className="font-semibold">Filters</span>
            {isFiltered && (
              <span className="ml-1 text-xs bg-gradient-to-r from-primary to-purple-600 text-white px-2.5 py-1 rounded-full font-bold shadow-sm">
                {activeFilterCount()}
              </span>
            )}
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>

          {isFiltered && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              className="h-9 px-4 text-sm font-medium hover:scale-105 hover:shadow-md transition-all duration-200"
            >
              <X className="h-4 w-4 mr-1.5" />
              Clear All
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {isOpen && (
          <div className="pb-6 pt-4 space-y-6 bg-muted/30 border-t border-primary/10 -mx-4 md:-mx-6 px-4 md:px-6 rounded-b-lg">
            {/* Category Filter */}
            {showCategoryFilter && (
              <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground">Tournament Category ({filteredCategories.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOnlyPopular(!showOnlyPopular)}
                  className="h-7 text-xs gap-1.5"
                >
                  <Star className={cn("h-3.5 w-3.5", showOnlyPopular && "fill-current")} />
                  {showOnlyPopular ? "Show All" : "Popular Only"}
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tournaments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {/* All Category Button */}
              <Button
                variant={selectedCategory === "All" ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange("All")}
                className={cn(
                  "w-full h-10 justify-start font-medium transition-all duration-200",
                  selectedCategory === "All"
                    ? "bg-gradient-to-r from-primary to-purple-600 shadow-md"
                    : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/5"
                )}
              >
                All Tournaments
              </Button>

              {/* Category List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {!searchQuery && !showOnlyPopular ? (
                    // Grouped by region
                    Object.entries(CATEGORIES_BY_REGION).map(([region, categories]) => (
                      <div key={region} className="space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroup(region)}
                          className="w-full justify-between h-8 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                        >
                          <span>{region} ({categories.length})</span>
                          {expandedGroups.has(region) ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {expandedGroups.has(region) && (
                          <div className="space-y-1 pl-2">
                            {categories.map((cat) => (
                              <Button
                                key={cat.id}
                                variant={selectedCategory === cat.id || selectedCategory === cat.name ? "default" : "ghost"}
                                size="sm"
                                onClick={() => onCategoryChange(cat.id)}
                                className={cn(
                                  "w-full justify-start h-9 gap-2 text-sm",
                                  (selectedCategory === cat.id || selectedCategory === cat.name)
                                    ? "bg-primary/90 text-primary-foreground"
                                    : "hover:bg-muted"
                                )}
                              >
                                <CategoryLogo category={cat.id} size="sm" />
                                <span className="flex-1 text-left truncate">{cat.displayName}</span>
                                {cat.priority <= 10 && <Star className="h-3 w-3 fill-current text-yellow-500" />}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    // Flat list (search or popular)
                    <div className="space-y-1">
                      {filteredCategories.map((cat) => (
                        <Button
                          key={cat.id}
                          variant={selectedCategory === cat.id || selectedCategory === cat.name ? "default" : "ghost"}
                          size="sm"
                          onClick={() => onCategoryChange(cat.id)}
                          className={cn(
                            "w-full justify-start h-9 gap-2 text-sm",
                            (selectedCategory === cat.id || selectedCategory === cat.name)
                              ? "bg-primary/90 text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <CategoryLogo category={cat.id} size="sm" />
                          <span className="flex-1 text-left truncate">{cat.displayName}</span>
                          <span className="text-xs text-muted-foreground capitalize">{cat.region}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
              </div>
            )}

            {/* Advanced Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date Range */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Date Range</Label>
                <div className="space-y-2">
                  {/* Start Date */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-medium text-sm h-10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-purple-500/5 transition-all",
                          !advancedFilters.dateRange.start && "text-muted-foreground"
                        )}
                        size="default"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
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
                          "w-full justify-start text-left font-medium text-sm h-10 hover:bg-gradient-to-r hover:from-primary/5 hover:to-purple-500/5 transition-all",
                          !advancedFilters.dateRange.end && "text-muted-foreground"
                        )}
                        size="default"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
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
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Hand Count</Label>
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
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Video Sources</Label>
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
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Show videos with hands only</Label>
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
