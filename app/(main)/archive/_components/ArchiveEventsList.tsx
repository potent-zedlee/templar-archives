"use client"

/**
 * Archive Events List
 *
 * 이벤트 목록 표시 컴포넌트
 * - Breadcrumb 네비게이션
 * - 폴더/파일 리스트 (list/grid/timeline 뷰)
 * - 선택 및 멀티 선택
 * - Context 메뉴 액션
 */

import { useArchiveDataStore } from '@/stores/archive-data-store'
import { useArchiveData } from './ArchiveDataContext'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { ArchiveFolderList } from '@/components/archive-folder-list'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { isAdmin } from '@/lib/auth-utils'
import { parseTimeToSeconds } from '@/lib/utils/time-parser'
import type { FolderItem } from '@/lib/types/archive'
import { useMemo, useCallback } from 'react'

interface ArchiveEventsListProps {
  seekTime: number | null
  onSeekToTime: (seconds: number) => void
}

export function ArchiveEventsList({ seekTime, onSeekToTime }: ArchiveEventsListProps) {
  const { tournaments, unsortedVideos, tournamentsLoading } = useArchiveData()
  const { userEmail, selectedDay, setSelectedDay } = useArchiveDataStore()

  const {
    expandedTournament,
    expandedSubEvent,
    selectedCategory,
    searchQuery,
    sortBy,
    advancedFilters,
    selectedVideoIds,
    toggleTournamentExpand,
    toggleSubEventExpand,
    clearSelection,
    openSubEventDialog,
    openInfoDialog,
  } = useArchiveUIStore()

  const isUserAdmin = isAdmin(userEmail)

  // Wrapper function with toggle functionality
  const handleSelectDay = useCallback((streamId: string) => {
    setSelectedDay(selectedDay === streamId ? null : streamId)
  }, [selectedDay, setSelectedDay])

  // Handle seek to time (from hand timestamp to video player)
  const handleSeekToTime = useCallback((timeString: string) => {
    const seconds = parseTimeToSeconds(timeString)
    onSeekToTime(seconds)
  }, [onSeekToTime])

  // Build folder items in tree structure (with expansion)
  const folderItems = useMemo((): FolderItem[] => {
    let items: FolderItem[] = []

    // Filter tournaments by category
    const filteredTournaments =
      selectedCategory === 'All'
        ? tournaments
        : tournaments.filter((t) => t.category === selectedCategory)

    // Build tree structure for tournaments
    filteredTournaments.forEach((tournament) => {
      // Add tournament
      items.push({
        id: tournament.id,
        name: tournament.name,
        type: 'tournament' as const,
        itemCount: tournament.sub_events?.length || 0,
        data: tournament,
        level: 0,
        isExpanded: expandedTournament === tournament.id,
      })

      // If tournament is expanded, add sub-events
      if (expandedTournament === tournament.id) {
        const subEvents = tournament.sub_events || []

        subEvents.forEach((subEvent) => {
          // Add sub-event
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

          // If sub-event is expanded, add days
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

    // Apply Tournament Name filter (search in tournament/subevent names)
    if (advancedFilters.tournamentName?.trim()) {
      const tournamentQuery = advancedFilters.tournamentName.toLowerCase()
      items = items.filter((item) => {
        if (item.type === 'tournament' || item.type === 'subevent') {
          return item.name.toLowerCase().includes(tournamentQuery)
        }
        if (item.type === 'day') {
          // Keep days if their parent subevent/tournament matches
          // This is handled by the tree structure - filtered parents won't render children
          return true
        }
        return true // Keep unorganized
      })
    }

    // Apply Player Name filter (only for day items)
    if (advancedFilters.playerName?.trim()) {
      const playerQuery = advancedFilters.playerName.toLowerCase()
      items = items.filter((item) => {
        if (item.type === 'day') {
          return item.name.toLowerCase().includes(playerQuery)
        }
        return true
      })
    }

    // Apply advanced filters (date range, video sources, etc.)
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

    // Video Source filter is not applicable in tree view
    // (Videos are organized by tournaments, not displayed directly)

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
    unsortedVideos,
    expandedTournament,
    expandedSubEvent,
    selectedCategory,
    searchQuery,
    sortBy,
    advancedFilters,
  ])

  // Handle expansion toggle
  const handleToggleExpand = useCallback((item: FolderItem) => {
    if (item.type === 'tournament') {
      toggleTournamentExpand(item.id)
    } else if (item.type === 'subevent') {
      toggleSubEventExpand(item.id)
    }
  }, [toggleTournamentExpand, toggleSubEventExpand])

  // Context menu handlers
  const handleShowInfo = useCallback((item: FolderItem) => {
    openInfoDialog(item.id)
  }, [openInfoDialog])

  return (
    <>
      {/* Selection Actions for videos */}
      {selectedVideoIds.size > 0 && (
        <div className="mb-3 p-2 bg-primary/10 rounded-md flex items-center justify-between">
          <span className="text-caption font-medium">
            {selectedVideoIds.size} video{selectedVideoIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Folder List (Tree View) */}
      <ArchiveFolderList
        items={folderItems}
        onNavigate={handleToggleExpand}
        onSelectDay={handleSelectDay}
        expandedDayId={selectedDay}
        seekTime={seekTime}
        onSeekToTime={handleSeekToTime}
        loading={tournamentsLoading}
        onShowInfo={handleShowInfo}
        onAddSubEvent={(tournamentId) => openSubEventDialog(tournamentId)}
        isAdmin={isUserAdmin}
      />
    </>
  )
}
