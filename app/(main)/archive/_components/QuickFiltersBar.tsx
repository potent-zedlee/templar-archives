/**
 * QuickFiltersBar Component
 *
 * 빠른 필터 토글 바
 * - 날짜 범위 선택
 * - 핸드 카운트 범위
 * - 위치 선택
 * - 비디오 있는 것만 표시
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Filter,
  CalendarDays,
  MapPin,
  Video,
  X,
  ChevronDown,
  RotateCcw,
} from 'lucide-react'
import { format } from 'date-fns'

interface QuickFiltersBarProps {
  // Date range
  selectedDateRange: { start: string | null; end: string | null }
  onDateRangeChange: (range: { start: string | null; end: string | null }) => void

  // Location
  selectedLocation: string | null
  onLocationChange: (location: string | null) => void
  locations: { location: string; count: number }[]

  // Hand count range
  selectedHandRange: { min: number | null; max: number | null }
  onHandRangeChange: (range: { min: number | null; max: number | null }) => void

  // Has hands filter
  hasHandsOnly: boolean
  onHasHandsOnlyChange: (value: boolean) => void

  // Reset
  onReset: () => void

  className?: string
}

export function QuickFiltersBar({
  selectedDateRange,
  onDateRangeChange,
  selectedLocation,
  onLocationChange,
  locations,
  selectedHandRange: _selectedHandRange,
  onHandRangeChange: _onHandRangeChange,
  hasHandsOnly,
  onHasHandsOnlyChange,
  onReset,
  className,
}: QuickFiltersBarProps) {
  const [dateOpen, setDateOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // 활성 필터 개수 계산
  const activeFilterCount = [
    selectedDateRange.start || selectedDateRange.end,
    selectedLocation,
    _selectedHandRange.min || _selectedHandRange.max,
    hasHandsOnly,
  ].filter(Boolean).length

  // 날짜 표시 텍스트
  const getDateRangeText = () => {
    if (selectedDateRange.start && selectedDateRange.end) {
      return `${format(new Date(selectedDateRange.start), 'MMM d')} - ${format(new Date(selectedDateRange.end), 'MMM d')}`
    }
    if (selectedDateRange.start) {
      return `From ${format(new Date(selectedDateRange.start), 'MMM d')}`
    }
    if (selectedDateRange.end) {
      return `Until ${format(new Date(selectedDateRange.end), 'MMM d')}`
    }
    return 'Any date'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* 필터 토글 버튼 */}
      <Button
        variant={filtersOpen ? 'secondary' : 'ghost'}
        size="sm"
        className="h-8"
        onClick={() => setFiltersOpen(!filtersOpen)}
      >
        <Filter className="w-3.5 h-3.5 mr-1.5" />
        Filters
        {activeFilterCount > 0 && (
          <Badge
            variant="default"
            className="ml-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
          >
            {activeFilterCount}
          </Badge>
        )}
        <ChevronDown
          className={cn(
            'w-3 h-3 ml-1 transition-transform',
            filtersOpen && 'rotate-180'
          )}
        />
      </Button>

      {/* 확장된 필터 패널 */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            {/* 날짜 범위 */}
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={
                    selectedDateRange.start || selectedDateRange.end
                      ? 'secondary'
                      : 'outline'
                  }
                  size="sm"
                  className="h-8 text-xs"
                >
                  <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                  {getDateRangeText()}
                  {(selectedDateRange.start || selectedDateRange.end) && (
                    <X
                      className="w-3 h-3 ml-1.5 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDateRangeChange({ start: null, end: null })
                      }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <Calendar
                      mode="single"
                      selected={
                        selectedDateRange.start
                          ? new Date(selectedDateRange.start)
                          : undefined
                      }
                      onSelect={(date) =>
                        onDateRangeChange({
                          ...selectedDateRange,
                          start: date ? date.toISOString().split('T')[0] : null,
                        })
                      }
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Date</Label>
                    <Calendar
                      mode="single"
                      selected={
                        selectedDateRange.end
                          ? new Date(selectedDateRange.end)
                          : undefined
                      }
                      onSelect={(date) =>
                        onDateRangeChange({
                          ...selectedDateRange,
                          end: date ? date.toISOString().split('T')[0] : null,
                        })
                      }
                      className="rounded-md border"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* 위치 선택 */}
            <Popover open={locationOpen} onOpenChange={setLocationOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedLocation ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-8 text-xs max-w-[150px]"
                >
                  <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                  <span className="truncate">
                    {selectedLocation || 'Any location'}
                  </span>
                  {selectedLocation && (
                    <X
                      className="w-3 h-3 ml-1.5 flex-shrink-0 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onLocationChange(null)
                      }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <div className="p-2">
                  <Select
                    value={selectedLocation || ''}
                    onValueChange={(value) =>
                      onLocationChange(value || null)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any location</SelectItem>
                      {locations.map(({ location, count }) => (
                        <SelectItem key={location} value={location}>
                          {location} ({count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>

            {/* 비디오/핸드 필터 */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
              <Video className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground cursor-pointer">
                Has hands
              </Label>
              <Switch
                checked={hasHandsOnly}
                onCheckedChange={onHasHandsOnlyChange}
                className="scale-75"
              />
            </div>

            {/* 리셋 버튼 */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={onReset}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 축소된 상태에서 활성 필터 표시 */}
      {!filtersOpen && activeFilterCount > 0 && (
        <div className="flex items-center gap-1">
          {selectedDateRange.start && (
            <Badge variant="secondary" className="h-6 text-xs">
              <CalendarDays className="w-3 h-3 mr-1" />
              {format(new Date(selectedDateRange.start), 'MMM d')}
              <X
                className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive"
                onClick={() =>
                  onDateRangeChange({ ...selectedDateRange, start: null })
                }
              />
            </Badge>
          )}
          {selectedLocation && (
            <Badge variant="secondary" className="h-6 text-xs max-w-[120px]">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{selectedLocation}</span>
              <X
                className="w-3 h-3 ml-1 flex-shrink-0 cursor-pointer hover:text-destructive"
                onClick={() => onLocationChange(null)}
              />
            </Badge>
          )}
          {hasHandsOnly && (
            <Badge variant="secondary" className="h-6 text-xs">
              <Video className="w-3 h-3 mr-1" />
              Has hands
              <X
                className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive"
                onClick={() => onHasHandsOnlyChange(false)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
