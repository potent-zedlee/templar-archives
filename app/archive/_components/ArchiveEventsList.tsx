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

import { Plus } from 'lucide-react'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { useArchiveData } from './ArchiveDataContext'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { ArchiveBreadcrumb } from '@/components/archive-breadcrumb'
import { ArchiveFolderList } from '@/components/archive-folder-list'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { isAdmin } from '@/lib/auth-utils'
import type { FolderItem, BreadcrumbItem } from '@/lib/types/archive'
import { useMemo, useCallback } from 'react'

export function ArchiveEventsList() {
  const { tournaments, unsortedVideos, tournamentsLoading } = useArchiveData()
  const { userEmail, setSelectedDay } = useArchiveDataStore()

  const {
    navigationLevel,
    currentTournamentId,
    currentSubEventId,
    selectedCategory,
    searchQuery,
    sortBy,
    advancedFilters,
    selectedVideoIds,
    setNavigationLevel,
    setCurrentTournamentId,
    setCurrentSubEventId,
    toggleVideoSelection,
    clearSelection,
    openRenameDialog,
    openDeleteDialog,
    openMoveToEventDialog,
    openMoveToNewEventDialog,
    openSubEventDialog,
    openEditEventDialog,
    selectAllVideos,
    openMoveToNewEventDialog: setIsMoveToNewEventDialogOpen,
  } = useArchiveUIStore()

  const isUserAdmin = isAdmin(userEmail)

  // Wrapper function to match expected type signature
  const handleSelectDay = useCallback((dayId: string) => {
    setSelectedDay(dayId)
  }, [setSelectedDay])

  // Build breadcrumb items
  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = []

    if (navigationLevel === 'tournament' || navigationLevel === 'subevent') {
      const tournament = tournaments.find((t) => t.id === currentTournamentId)
      if (tournament) {
        items.push({
          id: tournament.id,
          name: tournament.name,
          type: 'tournament',
        })
      }
    }

    if (navigationLevel === 'subevent') {
      const tournament = tournaments.find((t) => t.id === currentTournamentId)
      const subEvent = tournament?.sub_events?.find((se) => se.id === currentSubEventId)
      if (subEvent) {
        items.push({
          id: subEvent.id,
          name: subEvent.name,
          type: 'subevent',
        })
      }
    }

    return items
  }, [navigationLevel, currentTournamentId, currentSubEventId, tournaments])

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback((item: BreadcrumbItem | null) => {
    // Clear selected day when navigating
    setSelectedDay(null)

    if (!item) {
      // Navigate to root
      setNavigationLevel('root')
      setCurrentTournamentId('')
      setCurrentSubEventId('')
    } else if (item.type === 'tournament') {
      // Navigate to tournament level
      setNavigationLevel('tournament')
      setCurrentTournamentId(item.id)
      setCurrentSubEventId('')
    } else if (item.type === 'subevent') {
      // Navigate to subevent level
      setNavigationLevel('subevent')
      setCurrentSubEventId(item.id)
    }
  }, [setSelectedDay, setNavigationLevel, setCurrentTournamentId, setCurrentSubEventId])

  // Build folder items with filtering and sorting
  const folderItems = useMemo((): FolderItem[] => {
    let items: FolderItem[] = []

    // Filter tournaments by category
    const filteredTournaments =
      selectedCategory === 'All'
        ? tournaments
        : tournaments.filter((t) => t.category === selectedCategory)

    if (navigationLevel === 'root') {
      // Show all tournaments + Unorganized folder
      const tournamentItems = filteredTournaments.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        type: 'tournament' as const,
        itemCount: tournament.sub_events?.length || 0,
        data: tournament,
      }))

      const unorganizedItem: FolderItem = {
        id: 'unorganized',
        name: 'Unorganized',
        type: 'unorganized' as const,
        itemCount: unsortedVideos.length,
      }

      items = [unorganizedItem, ...tournamentItems]
    } else if (navigationLevel === 'unorganized') {
      // Show unsorted videos
      items = unsortedVideos.map((video) => ({
        id: video.id,
        name: video.name,
        type: 'day' as const,
        date: video.published_at || video.created_at,
        data: video,
      }))
    } else if (navigationLevel === 'tournament') {
      // Show sub-events of current tournament
      const tournament = tournaments.find((t) => t.id === currentTournamentId)
      const subEvents = tournament?.sub_events || []

      items = subEvents.map((subEvent) => ({
        id: subEvent.id,
        name: subEvent.name,
        type: 'subevent' as const,
        itemCount: subEvent.days?.length || 0,
        date: subEvent.date,
        data: subEvent,
      }))
    } else if (navigationLevel === 'subevent') {
      // Show days of current sub-event
      const tournament = tournaments.find((t) => t.id === currentTournamentId)
      const subEvent = tournament?.sub_events?.find((se) => se.id === currentSubEventId)
      items =
        subEvent?.days?.map((day) => ({
          id: day.id,
          name: day.name,
          type: 'day' as const,
          data: day,
        })) || []
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter((item) => item.name.toLowerCase().includes(query))
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

    // Video Source filter (only for unorganized videos)
    if (navigationLevel === 'unorganized') {
      const selectedSources = Object.entries(advancedFilters.videoSources)
        .filter(([_, enabled]) => enabled)
        .map(([source]) => source)

      if (selectedSources.length > 0 && selectedSources.length < 2) {
        items = items.filter((item) => {
          const video = item.data as any
          return selectedSources.includes(video?.video_source || 'youtube')
        })
      }
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
    navigationLevel,
    tournaments,
    unsortedVideos,
    currentTournamentId,
    currentSubEventId,
    selectedCategory,
    searchQuery,
    sortBy,
    advancedFilters,
  ])

  // Handle folder navigation
  const handleFolderNavigate = useCallback((item: FolderItem) => {
    setSelectedDay(null)

    if (item.type === 'tournament') {
      setNavigationLevel('tournament')
      setCurrentTournamentId(item.id)
      setCurrentSubEventId('')
    } else if (item.type === 'subevent') {
      setNavigationLevel('subevent')
      setCurrentSubEventId(item.id)
    } else if (item.type === 'unorganized') {
      setNavigationLevel('unorganized')
      setCurrentTournamentId('')
      setCurrentSubEventId('')
    }
  }, [setSelectedDay, setNavigationLevel, setCurrentTournamentId, setCurrentSubEventId])

  // Context menu handlers
  const handleRename = useCallback((item: FolderItem) => {
    openRenameDialog(item.id)
  }, [openRenameDialog])

  const handleDelete = useCallback((item: FolderItem) => {
    openDeleteDialog(item.id)
  }, [openDeleteDialog])

  const handleEditEvent = useCallback((item: FolderItem) => {
    if (item.type === 'subevent') {
      openEditEventDialog(item.id)
    }
  }, [openEditEventDialog])

  const handleMoveToEvent = useCallback((item: FolderItem) => {
    useArchiveUIStore.getState().toggleVideoSelection(item.id)
    openMoveToEventDialog()
  }, [openMoveToEventDialog])

  const handleMoveToNewEventSingle = useCallback((item: FolderItem) => {
    useArchiveUIStore.getState().toggleVideoSelection(item.id)
    setIsMoveToNewEventDialogOpen()
  }, [setIsMoveToNewEventDialogOpen])

  const handleAddSubItem = useCallback((item: FolderItem) => {
    if (item.type === 'tournament') {
      openSubEventDialog(item.id)
    }
  }, [openSubEventDialog])

  const handleSelectAllVideos = useCallback(() => {
    if (selectedVideoIds.size === unsortedVideos.length) {
      clearSelection()
    } else {
      selectAllVideos(unsortedVideos.map((v) => v.id))
    }
  }, [selectedVideoIds, unsortedVideos, clearSelection, selectAllVideos])

  return (
    <Card className="p-4 bg-card/95 backdrop-blur-md h-full border-2 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Selection Actions (only show in unorganized view) */}
      {navigationLevel === 'unorganized' && selectedVideoIds.size > 0 && (
        <div className="mb-3 p-2 bg-primary/10 rounded-md flex items-center justify-between">
          <span className="text-caption font-medium">
            {selectedVideoIds.size} video{selectedVideoIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsMoveToNewEventDialogOpen()}
            >
              <Plus className="mr-2 h-3 w-3" />
              Move to New Event
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <ArchiveBreadcrumb items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />

      {/* Folder List */}
      <ArchiveFolderList
        items={folderItems}
        onNavigate={handleFolderNavigate}
        onSelectDay={handleSelectDay}
        loading={tournamentsLoading}
        isUnorganized={navigationLevel === 'unorganized'}
        selectedIds={selectedVideoIds}
        onToggleSelect={toggleVideoSelection}
        onSelectAll={handleSelectAllVideos}
        onRename={handleRename}
        onDelete={handleDelete}
        onMoveToEvent={handleMoveToEvent}
        onMoveToNewEvent={handleMoveToNewEventSingle}
        onAddSubItem={handleAddSubItem}
        onEditEvent={handleEditEvent}
        isAdmin={isUserAdmin}
      />
    </Card>
  )
}
