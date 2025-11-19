"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useTournamentsQuery, usePlayersQuery } from "@/lib/queries/search-queries"

export interface SearchFilters {
  searchType: "natural" | "basic"
  tournament: string
  player: string
  positions: {
    BTN: boolean
    SB: boolean
    BB: boolean
    UTG: boolean
    MP: boolean
    CO: boolean
  }
  potSizeRange: [number, number]
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  boardCards: string[]
}

const DEFAULT_FILTERS: SearchFilters = {
  searchType: "basic",
  tournament: "all",
  player: "all",
  positions: {
    BTN: false,
    SB: false,
    BB: false,
    UTG: false,
    MP: false,
    CO: false,
  },
  potSizeRange: [0, 10000000], // 0 to 100,000 (in cents)
  dateRange: {
    from: undefined,
    to: undefined,
  },
  boardCards: [],
}

interface SearchFilterSidebarProps {
  onApplyFilters: (filters: SearchFilters) => void
}

export function SearchFilterSidebar({ onApplyFilters }: SearchFilterSidebarProps) {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("search_filters")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Convert date strings back to Date objects
        if (parsed.dateRange?.from) {
          parsed.dateRange.from = new Date(parsed.dateRange.from)
        }
        if (parsed.dateRange?.to) {
          parsed.dateRange.to = new Date(parsed.dateRange.to)
        }
        setFilters(parsed)
      } catch (error) {
        console.error("Failed to parse saved filters:", error)
      }
    }
  }, [])

  // Save filters to localStorage
  const saveFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters)
    localStorage.setItem("search_filters", JSON.stringify(newFilters))
  }

  // Query hooks
  const { data: tournaments = [] } = useTournamentsQuery()
  const { data: players = [] } = usePlayersQuery()

  // Reset filters
  const resetFilters = () => {
    saveFilters(DEFAULT_FILTERS)
    onApplyFilters(DEFAULT_FILTERS)
  }

  // Apply filters
  const applyFilters = () => {
    onApplyFilters(filters)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">검색 필터</h2>
      </div>

      {/* Scrollable Filters */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Search Type */}
        <div className="space-y-2">
          <Label>검색 타입</Label>
          <Select
            value={filters.searchType}
            onValueChange={(value: "natural" | "basic") =>
              saveFilters({ ...filters, searchType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">기본 검색</SelectItem>
              <SelectItem value="natural">자연어 검색</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tournament Filter */}
        <div className="space-y-2">
          <Label>토너먼트</Label>
          <Select
            value={filters.tournament}
            onValueChange={(value) => saveFilters({ ...filters, tournament: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="모든 토너먼트" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 토너먼트</SelectItem>
              {tournaments.map((tournament: any) => (
                <SelectItem key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Player Filter */}
        <div className="space-y-2">
          <Label>플레이어</Label>
          <Select
            value={filters.player}
            onValueChange={(value) => saveFilters({ ...filters, player: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="모든 플레이어" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">모든 플레이어</SelectItem>
              {players.slice(0, 100).map((player: any) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Position Filter */}
        <div className="space-y-3">
          <Label>포지션</Label>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(filters.positions) as Array<keyof typeof filters.positions>).map(
              (position) => (
                <div key={position} className="flex items-center space-x-2">
                  <Checkbox
                    id={`position-${position}`}
                    checked={filters.positions[position]}
                    onCheckedChange={(checked) =>
                      saveFilters({
                        ...filters,
                        positions: {
                          ...filters.positions,
                          [position]: checked === true,
                        },
                      })
                    }
                  />
                  <label
                    htmlFor={`position-${position}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {position}
                  </label>
                </div>
              )
            )}
          </div>
        </div>

        {/* Pot Size Range */}
        <div className="space-y-3">
          <Label>팟 크기 범위</Label>
          <div className="px-2">
            <Slider
              min={0}
              max={10000000}
              step={100000}
              value={filters.potSizeRange}
              onValueChange={(value) =>
                saveFilters({ ...filters, potSizeRange: value as [number, number] })
              }
            />
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>${(filters.potSizeRange[0] / 100).toLocaleString()}</span>
            <span>${(filters.potSizeRange[1] / 100).toLocaleString()}</span>
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-3">
          <Label>날짜 범위</Label>
          <div className="grid gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    format(filters.dateRange.from, "PPP")
                  ) : (
                    <span>시작일</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.from}
                  onSelect={(date) =>
                    saveFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, from: date },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.to ? (
                    format(filters.dateRange.to, "PPP")
                  ) : (
                    <span>종료일</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.to}
                  onSelect={(date) =>
                    saveFilters({
                      ...filters,
                      dateRange: { ...filters.dateRange, to: date },
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="p-4 border-t space-y-2">
        <Button onClick={applyFilters} className="w-full" size="lg">
          필터 적용
        </Button>
        <Button onClick={resetFilters} variant="outline" className="w-full" size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          초기화
        </Button>
      </div>
    </div>
  )
}
