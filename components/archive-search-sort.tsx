"use client"

import { Search, X, ArrowUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'count-asc' | 'count-desc'

interface ArchiveSearchSortProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  className?: string
}

export function ArchiveSearchSort({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  className
}: ArchiveSearchSortProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery)

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [localQuery, onSearchChange])

  const getSortLabel = (sort: SortOption): string => {
    switch (sort) {
      case 'name-asc': return 'Name (A-Z)'
      case 'name-desc': return 'Name (Z-A)'
      case 'date-asc': return 'Date (Oldest)'
      case 'date-desc': return 'Date (Newest)'
      case 'count-asc': return 'Items (Least)'
      case 'count-desc': return 'Items (Most)'
      default: return 'Sort'
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tournaments, events, videos..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {localQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocalQuery('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">{getSortLabel(sortBy)}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Sort by Name
          </div>
          <DropdownMenuItem onClick={() => onSortChange('name-asc')}>
            Name (A-Z)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange('name-desc')}>
            Name (Z-A)
          </DropdownMenuItem>

          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
            Sort by Date
          </div>
          <DropdownMenuItem onClick={() => onSortChange('date-desc')}>
            Date (Newest)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange('date-asc')}>
            Date (Oldest)
          </DropdownMenuItem>

          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
            Sort by Items
          </div>
          <DropdownMenuItem onClick={() => onSortChange('count-desc')}>
            Items (Most)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange('count-asc')}>
            Items (Least)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
