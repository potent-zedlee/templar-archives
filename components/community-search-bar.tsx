"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, SlidersHorizontal } from "lucide-react"

interface CommunitySearchBarProps {
  onSearch: (query: string) => void
  onToggleFilters: () => void
  showFilters: boolean
  initialValue?: string
}

export function CommunitySearchBar({
  onSearch,
  onToggleFilters,
  showFilters,
  initialValue = ""
}: CommunitySearchBarProps) {
  const [searchValue, setSearchValue] = useState(initialValue)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer (500ms delay)
    debounceTimerRef.current = setTimeout(() => {
      onSearch(value)
    }, 500)
  }

  const handleClear = () => {
    setSearchValue("")

    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    onSearch("")
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="포스트 검색... (제목, 내용)"
          value={searchValue}
          onChange={handleChange}
          className="pl-10 pr-10"
        />
        {searchValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Button
        variant={showFilters ? "default" : "outline"}
        size="icon"
        onClick={onToggleFilters}
        title="고급 필터"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
    </div>
  )
}
