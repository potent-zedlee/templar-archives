import { useState, useMemo } from 'react'
import type { FolderItem, AdvancedFilters, NavigationLevel, SortOption } from '@/lib/types/archive'

interface UseArchiveNavigationProps {
  tournaments: any[]
  unsortedVideos: any[]
  selectedCategory: string
}

export function useArchiveNavigation({
  tournaments,
  unsortedVideos,
  selectedCategory,
}: UseArchiveNavigationProps) {
  // Navigation state
  const [navigationLevel, setNavigationLevel] = useState<NavigationLevel>('root')
  const [currentTournamentId, setCurrentTournamentId] = useState<string>("")
  const [currentSubEventId, setCurrentSubEventId] = useState<string>("")

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dateRange: { start: undefined, end: undefined },
    handCountRange: [0, 1000],
    videoSources: { youtube: true, upload: true },
    hasHandsOnly: false
  })

  // Filter tournaments by category
  const filteredTournaments = useMemo(() => {
    return selectedCategory === "All"
      ? tournaments
      : tournaments.filter(t => t.category === selectedCategory)
  }, [tournaments, selectedCategory])

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items: Array<{ id: string; name: string; type: 'home' | 'tournament' | 'subevent' }> = []

    if (navigationLevel === 'tournament' || navigationLevel === 'subevent') {
      const tournament = tournaments.find(t => t.id === currentTournamentId)
      if (tournament) {
        items.push({
          id: tournament.id,
          name: tournament.name,
          type: 'tournament'
        })
      }
    }

    if (navigationLevel === 'subevent') {
      const tournament = tournaments.find(t => t.id === currentTournamentId)
      const subEvent = tournament?.sub_events?.find((se: any) => se.id === currentSubEventId)
      if (subEvent) {
        items.push({
          id: subEvent.id,
          name: subEvent.name,
          type: 'subevent'
        })
      }
    }

    return items
  }, [tournaments, navigationLevel, currentTournamentId, currentSubEventId])

  // Build folder items with filters
  const folderItems = useMemo((): FolderItem[] => {
    let items: FolderItem[] = []

    if (navigationLevel === 'root') {
      // Show all tournaments + Unorganized folder
      const tournamentItems = filteredTournaments.map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        type: 'tournament' as const,
        itemCount: tournament.sub_events?.length || 0,
        data: tournament
      }))

      // Add Unorganized folder
      const unorganizedItem: FolderItem = {
        id: 'unorganized',
        name: 'Unorganized',
        type: 'unorganized' as const,
        itemCount: unsortedVideos.length
      }

      items = [unorganizedItem, ...tournamentItems]
    } else if (navigationLevel === 'unorganized') {
      // Show unsorted videos
      items = unsortedVideos.map(video => ({
        id: video.id,
        name: video.name,
        type: 'day' as const,
        date: video.published_at || video.created_at,
        data: video
      }))
    } else if (navigationLevel === 'tournament') {
      // Show sub-events of current tournament
      const tournament = tournaments.find(t => t.id === currentTournamentId)
      const subEvents = tournament?.sub_events || []

      items = subEvents.map((subEvent: any) => ({
        id: subEvent.id,
        name: subEvent.name,
        type: 'subevent' as const,
        itemCount: subEvent.days?.length || 0,
        date: subEvent.date,
        data: subEvent
      }))
    } else if (navigationLevel === 'subevent') {
      // Show days of current sub-event
      const tournament = tournaments.find(t => t.id === currentTournamentId)
      const subEvent = tournament?.sub_events?.find((se: any) => se.id === currentSubEventId)
      items = subEvent?.days?.map((day: any) => ({
        id: day.id,
        name: day.name,
        type: 'day' as const,
        data: day
      })) || []
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(item =>
        item.name.toLowerCase().includes(query)
      )
    }

    // Apply advanced filters
    // Date Range filter
    if (advancedFilters.dateRange.start || advancedFilters.dateRange.end) {
      items = items.filter(item => {
        if (!item.date) return true // Keep items without dates
        const itemDate = new Date(item.date)

        if (advancedFilters.dateRange.start && itemDate < advancedFilters.dateRange.start) {
          return false
        }
        if (advancedFilters.dateRange.end && itemDate > advancedFilters.dateRange.end) {
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
        items = items.filter(item => {
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
  }, [navigationLevel, filteredTournaments, unsortedVideos, tournaments, currentTournamentId, currentSubEventId, searchQuery, advancedFilters, sortBy])

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = (item: { id: string; name: string; type: 'home' | 'tournament' | 'subevent' } | null) => {
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
      // Navigate to subevent level (stay at current level)
      setNavigationLevel('subevent')
      setCurrentSubEventId(item.id)
    }
  }

  // Handle folder navigation
  const handleFolderNavigate = (item: FolderItem) => {
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
    // Day clicks are handled by onSelectDay
  }

  // Navigate back
  const navigateBack = () => {
    if (navigationLevel === 'subevent') {
      setNavigationLevel('tournament')
      setCurrentSubEventId('')
    } else if (navigationLevel === 'tournament' || navigationLevel === 'unorganized') {
      setNavigationLevel('root')
      setCurrentTournamentId('')
      setCurrentSubEventId('')
    }
  }

  return {
    navigationLevel,
    setNavigationLevel,
    currentTournamentId,
    setCurrentTournamentId,
    currentSubEventId,
    setCurrentSubEventId,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    advancedFilters,
    setAdvancedFilters,
    filteredTournaments,
    breadcrumbItems,
    folderItems,
    handleBreadcrumbNavigate,
    handleFolderNavigate,
    navigateBack,
  }
}
