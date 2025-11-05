"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { ArchiveSearchSort } from "@/components/archive-search-sort"
import { useArchiveUIStore } from "@/stores/archive-ui-store"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { useArchiveData } from "./ArchiveDataContext"
import { useMemo, useCallback } from "react"
import type { FolderItem } from "@/lib/types/archive"
import { Button } from "@/components/ui/button"
import { ChevronRight, Play, Calendar } from "lucide-react"
import { BackgroundGradient } from "@/components/ui/background-gradient"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import type { Tournament, SubEvent, Day } from "@/lib/types/archive"

export function ArchiveMiddlePanel() {
  const { tournaments, tournamentsLoading } = useArchiveData()
  const { selectedDay, setSelectedDay } = useArchiveDataStore()

  const {
    expandedTournament,
    expandedSubEvent,
    selectedCategory,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    advancedFilters,
    toggleTournamentExpand,
    toggleSubEventExpand,
  } = useArchiveUIStore()

  // Build folder items
  const folderItems = useMemo((): FolderItem[] => {
    let items: FolderItem[] = []

    // Filter tournaments by category
    const filteredTournaments =
      selectedCategory === 'All'
        ? tournaments
        : tournaments.filter((t) => t.category === selectedCategory)

    // Build tree structure
    filteredTournaments.forEach((tournament) => {
      items.push({
        id: tournament.id,
        name: tournament.name,
        type: 'tournament' as const,
        itemCount: tournament.sub_events?.length || 0,
        data: tournament,
        level: 0,
        isExpanded: expandedTournament === tournament.id,
      })

      if (expandedTournament === tournament.id) {
        const subEvents = tournament.sub_events || []

        subEvents.forEach((subEvent) => {
          items.push({
            id: subEvent.id,
            name: subEvent.name,
            type: 'subevent' as const,
            itemCount: subEvent.days?.length || 0,
            date: subEvent.date,
            data: subEvent,
            level: 1,
            isExpanded: expandedSubEvent === subEvent.id,
            parentId: tournament.id,
          })

          if (expandedSubEvent === subEvent.id) {
            const days = subEvent.days || []

            days.forEach((day: import('@/lib/supabase').Stream) => {
              items.push({
                id: day.id,
                name: day.name,
                type: 'day' as const,
                data: day,
                level: 2,
                parentId: subEvent.id,
              })
            })
          }
        })
      }
    })

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter((item) => item.name.toLowerCase().includes(query))
    }

    // Apply advanced filters
    if (advancedFilters.tournamentName?.trim()) {
      const tournamentQuery = advancedFilters.tournamentName.toLowerCase()
      items = items.filter((item) => {
        if (item.type === 'tournament' || item.type === 'subevent') {
          return item.name.toLowerCase().includes(tournamentQuery)
        }
        return true
      })
    }

    if (advancedFilters.playerName?.trim()) {
      const playerQuery = advancedFilters.playerName.toLowerCase()
      items = items.filter((item) => {
        if (item.type === 'day') {
          return item.name.toLowerCase().includes(playerQuery)
        }
        return true
      })
    }

    if (advancedFilters.dateRange.start || advancedFilters.dateRange.end) {
      items = items.filter((item) => {
        if (!item.date) return true
        const itemDate = new Date(item.date)

        if (
          advancedFilters.dateRange.start &&
          itemDate < advancedFilters.dateRange.start
        ) {
          return false
        }
        if (
          advancedFilters.dateRange.end &&
          itemDate > advancedFilters.dateRange.end
        ) {
          return false
        }
        return true
      })
    }

    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'date-asc':
          if (!a.date || !b.date) return 0
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'date-desc':
          if (!a.date || !b.date) return 0
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'count-asc':
          return (a.itemCount || 0) - (b.itemCount || 0)
        case 'count-desc':
          return (b.itemCount || 0) - (a.itemCount || 0)
        default:
          return 0
      }
    })

    return items
  }, [
    tournaments,
    expandedTournament,
    expandedSubEvent,
    selectedCategory,
    searchQuery,
    sortBy,
    advancedFilters,
  ])

  const handleToggleExpand = useCallback((item: FolderItem) => {
    if (item.type === 'tournament') {
      toggleTournamentExpand(item.id)
    } else if (item.type === 'subevent') {
      toggleSubEventExpand(item.id)
    }
  }, [toggleTournamentExpand, toggleSubEventExpand])

  const handleSelectDay = useCallback((dayId: string) => {
    console.log('[ArchiveMiddlePanel] Day clicked:', dayId, 'Previous:', selectedDay)
    setSelectedDay(dayId)
  }, [selectedDay, setSelectedDay])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Events</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Browse tournaments and days
        </p>

        {/* Search & Sort */}
        <ArchiveSearchSort
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {tournamentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-muted/20 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : folderItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No events found</p>
            </div>
          ) : (
            folderItems.map((item) => {
              if (item.type === 'tournament') {
                const tournament = item.data as Tournament
                return (
                  <div key={item.id}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-auto py-2 px-3",
                        item.isExpanded && "bg-muted"
                      )}
                      onClick={() => handleToggleExpand(item)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            item.isExpanded && "rotate-90"
                          )}
                        />
                        {tournament.category_logo_url && (
                          <div className="w-6 h-6 flex-shrink-0">
                            <Image
                              src={tournament.category_logo_url}
                              alt={tournament.category}
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm truncate">
                            {tournament.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(tournament.start_date)}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                )
              } else if (item.type === 'subevent') {
                const subEvent = item.data as SubEvent
                return (
                  <div key={item.id} className="ml-4">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-auto py-2 px-3",
                        item.isExpanded && "bg-muted"
                      )}
                      onClick={() => handleToggleExpand(item)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            item.isExpanded && "rotate-90"
                          )}
                        />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm truncate">
                            {subEvent.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {subEvent.event_number && `#${subEvent.event_number}`}
                            {subEvent.buy_in && ` • ${subEvent.buy_in}`}
                          </div>
                        </div>
                      </div>
                    </Button>
                  </div>
                )
              } else if (item.type === 'day') {
                const day = item.data as Day
                const isSelected = selectedDay === day.id
                return (
                  <div key={item.id} className="ml-8">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-auto py-2 px-3",
                        isSelected && "bg-purple-500/20 border-l-2 border-purple-500"
                      )}
                      onClick={() => handleSelectDay(day.id)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {day.video_source === "youtube" && day.video_url ? (
                          <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center flex-shrink-0">
                            <Play className="h-3 w-3 text-white fill-white" />
                          </div>
                        ) : (day.video_file || day.video_nas_path) ? (
                          <div className="w-5 h-5 bg-amber-500 rounded flex items-center justify-center flex-shrink-0">
                            <Play className="h-3 w-3 text-white fill-white" />
                          </div>
                        ) : (
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm truncate">
                            {day.name}
                          </div>
                          {day.player_count !== undefined && day.player_count > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {day.player_count} players
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                  </div>
                )
              }
              return null
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
