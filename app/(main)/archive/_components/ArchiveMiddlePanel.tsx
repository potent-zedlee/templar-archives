"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { ArchiveSearchSort } from "@/components/archive-search-sort"
import { useArchiveUIStore } from "@/stores/archive-ui-store"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { useArchiveData } from "./ArchiveDataContext"
import { useMemo, useCallback, useState, useEffect } from "react"
import type { FolderItem } from "@/lib/types/archive"
import { Button } from "@/components/ui/button"
import { ChevronRight, Play, Calendar, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import type { Tournament, Event, Stream } from "@/lib/types/archive"
import { hasArbiterPermission } from "@/lib/types/users"
import { createClientSupabaseClient } from "@/lib/supabase-client"

interface ArchiveMiddlePanelProps {
  onHandInputClick?: (stream: Stream) => void
}

export function ArchiveMiddlePanel({ onHandInputClick }: ArchiveMiddlePanelProps) {
  const { tournaments, tournamentsLoading } = useArchiveData()
  const { selectedDay, setSelectedDay } = useArchiveDataStore()

  const {
    expandedTournament,
    expandedEvent,
    selectedCategory,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    advancedFilters,
    toggleTournamentExpand,
    toggleSubEventExpand,
  } = useArchiveUIStore()

  // Hand Input Mode permission check
  const [canUseHandInput, setCanUseHandInput] = useState(false)

  useEffect(() => {
    const checkPermissions = async () => {
      const supabase = createClientSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setCanUseHandInput(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData && hasArbiterPermission(userData.role)) {
        setCanUseHandInput(true)
      }
    }

    checkPermissions()
  }, [])

  // Build folder items
  const folderItems = useMemo((): FolderItem[] => {
    let items: FolderItem[] = []

    // Filter tournaments by category
    const filteredTournaments =
      selectedCategory === 'All'
        ? tournaments
        : tournaments.filter((t) => t.category_id === selectedCategory)

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
    expandedEvent,
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

  const handleSelectDay = useCallback((streamId: string) => {
    console.log('[ArchiveMiddlePanel] Stream clicked:', streamId, 'Previous:', selectedDay)
    setSelectedDay(streamId)
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
      {/* Header Section */}
      <div className="p-6 border-b bg-gradient-to-br from-background/50 to-muted/20">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Events</h2>
            <p className="text-sm text-muted-foreground">
              Browse tournaments and days
            </p>
          </div>

          {/* Search & Sort */}
          <div className="pt-2 border-t border-border/50">
            <ArchiveSearchSort
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-hidden">
        <div className="p-4 space-y-1.5">
          {tournamentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/20 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : folderItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-block p-8 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-xl">
                <p className="text-lg font-semibold text-muted-foreground">No events found</p>
                <p className="text-sm text-muted-foreground/60 mt-2">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            folderItems.map((item) => {
              if (item.type === 'tournament') {
                const tournament = item.data as Tournament
                return (
                  <div key={item.id} className="group">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-auto py-3 px-4 rounded-lg transition-all duration-200",
                        "border border-transparent hover:border-border/50",
                        "hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30",
                        "hover:shadow-sm",
                        item.isExpanded && "bg-gradient-to-r from-muted/70 to-muted/50 border-border/60 shadow-sm"
                      )}
                      onClick={() => handleToggleExpand(item)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-all duration-200 flex-shrink-0",
                            "text-muted-foreground group-hover:text-foreground",
                            item.isExpanded && "rotate-90 text-foreground"
                          )}
                        />
                        {tournament.category_logo_url && (
                          <div className="w-7 h-7 flex-shrink-0 rounded-md overflow-hidden bg-background/50 p-0.5">
                            <Image
                              src={tournament.category_logo_url}
                              alt={tournament.category}
                              width={28}
                              height={28}
                              className="object-contain"
                            />
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-semibold text-sm truncate mb-0.5">
                            {tournament.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
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
                  <div key={item.id} className="ml-6 group">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-auto py-2.5 px-3 rounded-lg transition-all duration-200",
                        "border border-transparent hover:border-border/40",
                        "hover:bg-gradient-to-r hover:from-muted/40 hover:to-muted/20",
                        item.isExpanded && "bg-gradient-to-r from-muted/60 to-muted/40 border-border/50"
                      )}
                      onClick={() => handleToggleExpand(item)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition-all duration-200 flex-shrink-0",
                            "text-muted-foreground group-hover:text-foreground",
                            item.isExpanded && "rotate-90 text-foreground"
                          )}
                        />
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium text-sm truncate mb-0.5">
                            {subEvent.name}
                          </div>
                          {(subEvent.event_number || subEvent.buy_in) && (
                            <div className="text-xs text-muted-foreground font-medium">
                              {subEvent.event_number && `#${subEvent.event_number}`}
                              {subEvent.buy_in && (subEvent.event_number ? ` • ${subEvent.buy_in}` : subEvent.buy_in)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                  </div>
                )
              } else if (item.type === 'day') {
                const day = item.data as Stream
                const isSelected = selectedDay === day.id
                return (
                  <div key={item.id} className="ml-12 group">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start h-auto py-2.5 px-3 rounded-lg transition-all duration-200",
                          "border border-transparent hover:border-border/30",
                          "hover:bg-gradient-to-r hover:from-muted/30 hover:to-muted/10",
                          "hover:shadow-sm",
                          isSelected && "bg-gradient-to-r from-purple-500/20 via-purple-500/10 to-purple-500/5 border-l-4 border-l-purple-500 shadow-md shadow-purple-500/10",
                          isSelected && "hover:from-purple-500/25 hover:via-purple-500/15 hover:to-purple-500/10"
                        )}
                        onClick={() => handleSelectDay(day.id)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          {day.video_source === "youtube" && day.video_url ? (
                            <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-red-600 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Play className="h-3 w-3 text-white fill-white" />
                            </div>
                          ) : (day.video_file || day.video_nas_path) ? (
                            <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Play className="h-3 w-3 text-white fill-white" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-gradient-to-br from-muted to-muted/80 rounded-md flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 text-left min-w-0">
                            <div className={cn(
                              "font-medium text-sm truncate mb-0.5",
                              isSelected && "font-semibold"
                            )}>
                              {day.name}
                            </div>
                            {day.player_count !== undefined && day.player_count > 0 && (
                              <div className="text-xs text-muted-foreground font-medium">
                                {day.player_count} players
                              </div>
                            )}
                          </div>
                        </div>
                      </Button>

                      {/* Hand Input Mode Button (Arbiter+ only) */}
                      {canUseHandInput && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "absolute right-1 top-1/2 -translate-y-1/2",
                            "h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                            "hover:bg-purple-500/20 hover:text-purple-600 dark:hover:text-purple-400"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onHandInputClick) {
                              onHandInputClick(day)
                            }
                          }}
                          title="Hand Input Mode"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
