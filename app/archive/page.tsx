"use client"

export const runtime = 'edge'

import { useState, useEffect } from "react"
import nextDynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ChevronDown, ChevronRight, Star, Download, MessageSquare, Plus, Upload, Server, Youtube, Play, CheckCircle, X, Edit, Trash, MoreVertical, Info, Folder } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { Tournament as TournamentType, SubEvent as SubEventType, Day as DayType, Hand as HandType } from "@/lib/supabase"
import { fetchTournamentsTree } from "@/lib/queries"
import { toast } from "sonner"
import type { HandHistory } from "@/lib/types/hand-history"
import { isAdmin } from "@/lib/auth-utils"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { EmptyState } from "@/components/empty-state"
import { DndContext, useDroppable, DragEndEvent } from '@dnd-kit/core'
import { UnsortedVideosSection } from "@/components/unsorted-videos-section"
import { organizeVideo, organizeVideos, getUnsortedVideos } from "@/lib/unsorted-videos"
import type { UnsortedVideo } from "@/lib/unsorted-videos"
import { useArchiveState, type PayoutRow } from "@/hooks/useArchiveState"
import {
  loadTournamentsHelper,
  loadHandsHelper,
  toggleTournamentHelper,
  toggleSubEventHelper,
  selectDayHelper,
  toggleFavoriteHelper,
  deleteTournamentHelper,
  deleteSubEventHelper,
  deleteDayHelper,
  checkIsUserAdmin,
} from "@/lib/archive-helpers"
import { ArchiveBreadcrumb } from "@/components/archive-breadcrumb"
import { ArchiveFolderList } from "@/components/archive-folder-list"
import type { FolderItem } from "@/components/archive-folder-list"
import { ArchiveViewSwitcher, type ViewMode } from "@/components/archive-view-switcher"
import { ArchiveGridView } from "@/components/archive-grid-view"
import { ArchiveTimelineView } from "@/components/archive-timeline-view"
import { ArchiveSearchSort, type SortOption } from "@/components/archive-search-sort"
import type { AdvancedFilters } from "@/components/archive-advanced-filters"
import { ArchiveUnifiedFilters } from "@/components/archive-unified-filters"
import { QuickUploadDialog } from "@/components/quick-upload-dialog"
import { TournamentDialog } from "@/components/tournament-dialog"
import { EditEventDialog } from "@/components/edit-event-dialog"
import { RenameDialog } from "@/components/archive-dialogs/rename-dialog"
import { DeleteDialog } from "@/components/archive-dialogs/delete-dialog"
import { MoveToExistingEventDialog } from "@/components/archive-dialogs/move-to-existing-event-dialog"
import { MoveToNewEventDialog } from "@/components/archive-dialogs/move-to-new-event-dialog"
import { DayDialog } from "@/components/archive-dialogs/day-dialog"
import { SubEventInfoDialog } from "@/components/archive-dialogs/sub-event-info-dialog"
import { SubEventDialog } from "@/components/archive-dialogs/sub-event-dialog"
import type { FolderItem as DialogFolderItem } from "@/components/archive-dialogs/rename-dialog"
import { useArchiveKeyboard } from "@/hooks/useArchiveKeyboard"
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog"

// Dynamic imports for heavy components
const VideoPlayerDialog = nextDynamic(() => import("@/components/video-player-dialog").then(mod => ({ default: mod.VideoPlayerDialog })), {
  ssr: false
})

const HandListAccordion = nextDynamic(() => import("@/components/hand-list-accordion").then(mod => ({ default: mod.HandListAccordion })), {
  ssr: false,
  loading: () => <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />)}</div>
})

// Create Supabase client
const supabase = createClientSupabaseClient()

// Extended types with UI state
type Tournament = TournamentType & {
  sub_events?: SubEvent[]
  expanded: boolean
}

type SubEvent = SubEventType & {
  days?: Day[]
  expanded: boolean
}

type Day = DayType & {
  selected: boolean
}

type Hand = HandType & {
  checked: boolean
}

// Droppable wrapper for SubEvent nodes
function DroppableSubEvent({
  subEventId,
  children
}: {
  subEventId: string
  children: React.ReactNode
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `subevent-${subEventId}`,
    data: {
      type: 'subevent',
      id: subEventId,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${isOver ? 'bg-primary/10 ring-2 ring-primary rounded-md' : ''}`}
    >
      {children}
    </div>
  )
}

export default function ArchiveClient() {
  // View mode state (list, grid, timeline)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dateRange: { start: undefined, end: undefined },
    handCountRange: [0, 1000],
    videoSources: { youtube: true, upload: true },
    hasHandsOnly: false
  })

  // Multi-select state for unsorted videos
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())

  // Move dialogs state
  const [isMoveToNewEventDialogOpen, setIsMoveToNewEventDialogOpen] = useState(false)
  const [isMoveToEventDialogOpen, setIsMoveToEventDialogOpen] = useState(false)

  // Context menu dialogs state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameItem, setRenameItem] = useState<DialogFolderItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<DialogFolderItem | null>(null)
  const [editEventDialogOpen, setEditEventDialogOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // Keyboard shortcuts dialog
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false)

  // Use archive state hook
  const state = useArchiveState()

  // Destructure all state from hook
  const {
    tournaments,
    setTournaments,
    hands,
    setHands,
    selectedDay,
    setSelectedDay,
    loading,
    setLoading,
    userEmail,
    setUserEmail,
    selectedCategory,
    setSelectedCategory,
    isDialogOpen,
    setIsDialogOpen,
    editingTournamentId,
    setEditingTournamentId,
    newTournamentName,
    setNewTournamentName,
    newCategory,
    setNewCategory,
    newLocation,
    setNewLocation,
    newStartDate,
    setNewStartDate,
    newEndDate,
    setNewEndDate,
    isSubEventDialogOpen,
    setIsSubEventDialogOpen,
    selectedTournamentId,
    setSelectedTournamentId,
    editingSubEventId,
    setEditingSubEventId,
    newSubEventName,
    setNewSubEventName,
    newSubEventDate,
    setNewSubEventDate,
    newSubEventPrize,
    setNewSubEventPrize,
    newSubEventWinner,
    setNewSubEventWinner,
    newSubEventBuyIn,
    setNewSubEventBuyIn,
    newSubEventEntryCount,
    setNewSubEventEntryCount,
    newSubEventBlindStructure,
    setNewSubEventBlindStructure,
    newSubEventLevelDuration,
    setNewSubEventLevelDuration,
    newSubEventStartingStack,
    setNewSubEventStartingStack,
    newSubEventNotes,
    setNewSubEventNotes,
    isSubEventInfoDialogOpen,
    setIsSubEventInfoDialogOpen,
    viewingSubEventId,
    setViewingSubEventId,
    viewingSubEvent,
    setViewingSubEvent,
    viewingPayouts,
    setViewingPayouts,
    loadingViewingPayouts,
    setLoadingViewingPayouts,
    isEditingViewingPayouts,
    setIsEditingViewingPayouts,
    editingViewingPayouts,
    setEditingViewingPayouts,
    savingPayouts,
    setSavingPayouts,
    payouts,
    setPayouts,
    payoutSectionOpen,
    setPayoutSectionOpen,
    hendonMobUrl,
    setHendonMobUrl,
    hendonMobHtml,
    setHendonMobHtml,
    csvText,
    setCsvText,
    loadingPayouts,
    setLoadingPayouts,
    isDayDialogOpen,
    setIsDayDialogOpen,
    selectedSubEventId,
    setSelectedSubEventId,
    editingDayId,
    setEditingDayId,
    newDayName,
    setNewDayName,
    videoSourceTab,
    setVideoSourceTab,
    newDayVideoUrl,
    setNewDayVideoUrl,
    uploadFile,
    setUploadFile,
    uploading,
    setUploading,
    uploadProgress,
    setUploadProgress,
    isVideoDialogOpen,
    setIsVideoDialogOpen,
    videoStartTime,
    setVideoStartTime,
    openMenuId,
    setOpenMenuId,
    navigationLevel,
    setNavigationLevel,
    currentTournamentId,
    setCurrentTournamentId,
    currentSubEventId,
    setCurrentSubEventId,
    unsortedVideos,
    setUnsortedVideos,
  } = state

  // Load view mode from localStorage
  useEffect(() => {
    const savedViewMode = localStorage.getItem('archive-view-mode')
    if (savedViewMode && (savedViewMode === 'list' || savedViewMode === 'grid' || savedViewMode === 'timeline')) {
      setViewMode(savedViewMode as ViewMode)
    }
  }, [])

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('archive-view-mode', viewMode)
  }, [viewMode])

  // Load user session
  useEffect(() => {
    // Listen to auth state changes to avoid session missing errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null)
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Load tournaments with sub_events and days
  const loadTournaments = () => loadTournamentsHelper(setTournaments, setSelectedDay, setLoading)

  useEffect(() => {
    loadTournaments()
    loadUnsortedVideos()
  }, [])

  // Load unsorted videos
  const loadUnsortedVideos = async () => {
    try {
      const videos = await getUnsortedVideos()
      setUnsortedVideos(videos)
    } catch (error) {
      console.error('Error loading unsorted videos:', error)
    }
  }

  // Load hands when day is selected
  const loadHands = (dayId: string) => loadHandsHelper(dayId, setHands)

  useEffect(() => {
    if (selectedDay) {
      loadHands(selectedDay)
    }
  }, [selectedDay])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId("")
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [openMenuId])

  // Filter tournaments by selected category
  const filteredTournaments = selectedCategory === "All"
    ? tournaments
    : tournaments.filter(t => t.category === selectedCategory)

  // Multi-select handlers
  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(videoId)) {
        newSet.delete(videoId)
      } else {
        newSet.add(videoId)
      }
      return newSet
    })
  }

  const selectAllVideos = () => {
    if (selectedVideoIds.size === unsortedVideos.length) {
      setSelectedVideoIds(new Set())
    } else {
      setSelectedVideoIds(new Set(unsortedVideos.map(v => v.id)))
    }
  }

  const clearSelection = () => {
    setSelectedVideoIds(new Set())
  }

  // Handle successful move operations
  const handleMoveSuccess = async () => {
    await loadTournaments()
    await loadUnsortedVideos()
    clearSelection()
  }

  // Context menu handlers
  const handleRename = (item: FolderItem) => {
    setRenameItem(item as DialogFolderItem)
    setRenameDialogOpen(true)
  }

  const handleDelete = (item: FolderItem) => {
    setDeleteItem(item as DialogFolderItem)
    setDeleteDialogOpen(true)
  }

  const handleRenameSuccess = async () => {
    await loadTournaments()
    await loadUnsortedVideos()
    setRenameItem(null)
  }

  const handleDeleteSuccess = async () => {
    await loadTournaments()
    await loadUnsortedVideos()
    setDeleteItem(null)
  }

  const handleEditEvent = (item: FolderItem) => {
    if (item.type === 'subevent') {
      setSelectedEventId(item.id)
      setEditEventDialogOpen(true)
    }
  }

  const handleMoveToEvent = (item: FolderItem) => {
    // Select this video and open the "Move to Existing Event" dialog
    setSelectedVideoIds(new Set([item.id]))
    setIsMoveToEventDialogOpen(true)
  }

  const handleMoveToNewEventSingle = (item: FolderItem) => {
    setSelectedVideoIds(new Set([item.id]))
    setIsMoveToNewEventDialogOpen(true)
  }

  const handleAddSubItem = (item: FolderItem) => {
    if (item.type === 'tournament') {
      // Open SubEvent dialog
      setSelectedTournamentId(item.id)
      setIsSubEventDialogOpen(true)
    }
  }

  // Drag and drop handler (supports multi-select)
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const draggedVideo = active.data.current as { type: string; video: UnsortedVideo }
    const dropTarget = over.data.current as { type: string; id: string }

    if (draggedVideo?.type !== 'unsorted-video') return
    if (!dropTarget) return

    // Determine which videos to move
    let videoIdsToMove: string[] = []
    if (selectedVideoIds.has(draggedVideo.video.id) && selectedVideoIds.size > 0) {
      // Move all selected videos
      videoIdsToMove = Array.from(selectedVideoIds)
    } else {
      // Move only the dragged video
      videoIdsToMove = [draggedVideo.video.id]
    }

    // Handle drop on SubEvent
    if (dropTarget.type === 'subevent') {
      if (videoIdsToMove.length > 1) {
        const result = await organizeVideos(videoIdsToMove, dropTarget.id)
        if (result.success) {
          toast.success(`${videoIdsToMove.length} videos organized successfully`)
          await loadTournaments()
          await loadUnsortedVideos()
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to organize videos')
        }
      } else {
        const result = await organizeVideo(videoIdsToMove[0], dropTarget.id)
        if (result.success) {
          toast.success('Video organized successfully')
          await loadTournaments()
          await loadUnsortedVideos()
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to organize video')
        }
      }
    }
    // Handle drop on Day
    else if (dropTarget.type === 'day') {
      if (videoIdsToMove.length > 1) {
        const result = await organizeVideos(videoIdsToMove, dropTarget.id)
        if (result.success) {
          toast.success(`${videoIdsToMove.length} videos moved successfully`)
          await loadTournaments()
          await loadUnsortedVideos()
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to move videos')
        }
      } else {
        const result = await organizeVideo(videoIdsToMove[0], dropTarget.id)
        if (result.success) {
          toast.success('Video moved successfully')
          await loadTournaments()
          await loadUnsortedVideos()
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to move video')
        }
      }
    }
  }

  // Helper function wrappers
  const toggleTournament = (tournamentId: string) =>
    toggleTournamentHelper(tournamentId, setTournaments)

  const toggleSubEvent = (tournamentId: string, subEventId: string) =>
    toggleSubEventHelper(tournamentId, subEventId, setTournaments)

  const selectDay = (dayId: string) =>
    selectDayHelper(dayId, setSelectedDay, setTournaments)

  const toggleFavorite = (handId: string) =>
    toggleFavoriteHelper(handId, hands, setHands)

  const toggleChecked = (handId: string) => {
    setHands((prev) =>
      prev.map((h) => (h.id === handId ? { ...h, checked: !h.checked } : h))
    )
  }

  // Breadcrumb navigation logic
  const buildBreadcrumbItems = () => {
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
      const subEvent = tournament?.sub_events?.find(se => se.id === currentSubEventId)
      if (subEvent) {
        items.push({
          id: subEvent.id,
          name: subEvent.name,
          type: 'subevent'
        })
      }
    }

    return items
  }

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

  // Folder navigation logic with search/sort
  const buildFolderItems = (): FolderItem[] => {
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

      items = subEvents.map(subEvent => ({
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
      const subEvent = tournament?.sub_events?.find(se => se.id === currentSubEventId)
      items = subEvent?.days?.map(day => ({
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
  }

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

  // Keyboard shortcuts handlers
  useArchiveKeyboard({
    onBackspace: () => {
      // Navigate to parent folder
      if (navigationLevel === 'subevent') {
        setNavigationLevel('tournament')
        setCurrentSubEventId('')
      } else if (navigationLevel === 'tournament' || navigationLevel === 'unorganized') {
        setNavigationLevel('root')
        setCurrentTournamentId('')
        setCurrentSubEventId('')
      }
    },
    onSpace: () => {
      // Play video if day is selected
      if (selectedDay) {
        setVideoStartTime("")
        setIsVideoDialogOpen(true)
      }
    },
    onSelectAll: () => {
      // Select all videos in unorganized view
      if (navigationLevel === 'unorganized') {
        selectAllVideos()
      }
    },
    onEscape: () => {
      // Clear selection or close dialogs
      if (selectedVideoIds.size > 0) {
        clearSelection()
      }
    },
    onFocusSearch: () => {
      // Focus search input
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    },
    onViewModeChange: (mode) => {
      setViewMode(mode)
    },
    onShowHelp: () => {
      setKeyboardShortcutsOpen(true)
    },
    enabled: !isDialogOpen && !isSubEventDialogOpen && !isDayDialogOpen && !isVideoDialogOpen,
  })

  const addNewTournament = async () => {
    if (!newTournamentName.trim() || !newLocation.trim() || !newStartDate || !newEndDate) return

    // Call updateTournament if in edit mode
    if (editingTournamentId) {
      return updateTournament()
    }

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          name: newTournamentName,
          category: newCategory,
          location: newLocation,
          start_date: newStartDate,
          end_date: newEndDate,
        })
        .select()
        .single()

      if (error) throw error

      await loadTournaments()

      setNewTournamentName("")
      setNewCategory("WSOP")
      setNewLocation("")
      setNewStartDate("")
      setNewEndDate("")
      setEditingTournamentId("")
      setIsDialogOpen(false)
      toast.success('Tournament added successfully')
    } catch (error) {
      console.error('Error adding tournament:', error)
      toast.error('Failed to add tournament')
    }
  }

  // Load payouts from Hendon Mob URL
  const loadPayoutsFromUrl = async () => {
    if (!hendonMobUrl.trim()) return

    setLoadingPayouts(true)
    try {
      const response = await fetch('/api/parse-hendon-mob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: hendonMobUrl.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse URL')
      }

      if (data.payouts && data.payouts.length > 0) {
        const loadedPayouts = data.payouts.map((p: any) => ({
          rank: p.rank,
          playerName: p.playerName,
          prizeAmount: p.prizeAmount, // Already in display format from API
        }))
        setPayouts(loadedPayouts)
        setHendonMobUrl("") // Clear URL after successful load
        toast.success(`${loadedPayouts.length} payouts loaded successfully`)
      } else {
        toast.error('Payout information not found')
      }
    } catch (error: any) {
      console.error('Error loading payouts from URL:', error)
      toast.error(error.message || 'Failed to load payouts')
    } finally {
      setLoadingPayouts(false)
    }
  }

  const addDay = async () => {
    try {
      // Call updateDay if in edit mode
      if (editingDayId) {
        return updateDay()
      }

      let videoData: any = {
        sub_event_id: selectedSubEventId,
        name: newDayName.trim() || `Day ${new Date().toISOString()}`,
        video_source: videoSourceTab,
      }

      // YouTube source
      if (videoSourceTab === 'youtube') {
        if (!newDayVideoUrl.trim()) {
          alert('Please enter YouTube URL')
          return
        }
        videoData.video_url = newDayVideoUrl.trim()
      }

      // File upload source
      if (videoSourceTab === 'upload') {
        if (!uploadFile) {
          alert('Please select a file to upload')
          return
        }

        setUploading(true)

        // Upload to Supabase Storage
        const fileName = `${selectedSubEventId}-${Date.now()}-${uploadFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, uploadFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert('Failed to upload file')
          setUploading(false)
          return
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(fileName)

        videoData.video_file = publicUrl
        setUploading(false)
      }

      // Create Day
      const { data, error } = await supabase
        .from('days')
        .insert(videoData)
        .select()
        .single()

      if (error) throw error

      await loadTournaments()

      // Reset states
      setNewDayName("")
      setNewDayVideoUrl("")
      setUploadFile(null)
      setVideoSourceTab('youtube')
      setEditingDayId("")
      setIsDayDialogOpen(false)
    } catch (error) {
      console.error('Error adding day:', error)
      setUploading(false)
    }
  }

  // Update functions
  const updateTournament = async () => {
    if (!editingTournamentId || !newTournamentName.trim()) return

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          name: newTournamentName,
          category: newCategory,
          location: newLocation,
          start_date: newStartDate,
          end_date: newEndDate,
        })
        .eq('id', editingTournamentId)

      if (error) throw error

      await loadTournaments()
      setEditingTournamentId("")
      setNewTournamentName("")
      setNewCategory("WSOP")
      setNewLocation("")
      setNewStartDate("")
      setNewEndDate("")
      setIsDialogOpen(false)
      toast.success('Tournament updated successfully')
    } catch (error) {
      console.error('Error updating tournament:', error)
      toast.error('Failed to update tournament')
    }
  }

  const updateDay = async () => {
    if (!editingDayId || !newDayName.trim()) return

    try {
      let videoData: any = {
        name: newDayName.trim(),
        video_source: videoSourceTab,
      }

      if (videoSourceTab === 'youtube') {
        videoData.video_url = newDayVideoUrl.trim()
        videoData.video_file = null
      }

      const { error } = await supabase
        .from('days')
        .update(videoData)
        .eq('id', editingDayId)

      if (error) throw error

      await loadTournaments()
      setEditingDayId("")
      setNewDayName("")
      setNewDayVideoUrl("")
      setIsDayDialogOpen(false)
      toast.success('Day updated successfully')
    } catch (error) {
      console.error('Error updating day:', error)
      toast.error('Failed to update day')
    }
  }

  // Delete functions
  const deleteTournament = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to delete this tournament and all its data?')) return
    await deleteTournamentHelper(tournamentId, setTournaments)
  }

  const deleteSubEvent = async (subEventId: string) => {
    if (!confirm('Are you sure you want to delete this event and all its data?')) return
    await deleteSubEventHelper(subEventId, setTournaments)
  }

  const deleteDay = async (dayId: string) => {
    if (!confirm('Are you sure you want to delete this day and all hand data?')) return
    await deleteDayHelper(dayId, setTournaments)
    if (selectedDay === dayId) {
      setSelectedDay("")
      setHands([])
    }
  }

  // Functions to open edit dialogs
  const openEditTournament = (tournament: Tournament) => {
    setEditingTournamentId(tournament.id)
    setNewTournamentName(tournament.name)
    setNewCategory(tournament.category)
    setNewLocation(tournament.location || "")
    setNewStartDate(tournament.start_date || "")
    setNewEndDate(tournament.end_date || "")
    setIsDialogOpen(true)
  }

  const openEditDay = (day: Day, subEventId: string) => {
    setEditingDayId(day.id)
    setSelectedSubEventId(subEventId)
    setIsDayDialogOpen(true)
  }

  // Check if user is admin
  const isUserAdmin = isAdmin(userEmail)

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
          <ResizablePanelGroup direction="horizontal" className="gap-6">
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <CardSkeleton count={1} variant="compact" />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={75} minSize={60}>
              <CardSkeleton count={2} variant="detailed" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    )
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-muted/30">
        <Header />

        {/* Unsorted Videos Section - NOW INTEGRATED INTO FOLDER NAVIGATION */}
        {false && (
        <div className="container max-w-7xl mx-auto px-4 md:px-6 py-6">
          <UnsortedVideosSection onVideoPlay={(video) => {
            // Debug: Log video data
            console.log('Video object:', video)
            console.log('Video URL:', video.video_url)

            // Open video in new tab (YouTube) or show message for local files
            if (video.video_url) {
              console.log('Opening URL:', video.video_url)

              // Use anchor tag method to bypass popup blockers
              const link = document.createElement('a')
              link.href = video.video_url
              link.target = '_blank'
              link.rel = 'noopener noreferrer'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)

              toast.success('Opening video...')
            } else {
              console.log('No video_url found')
              toast.error('Video URL is missing')
            }
          }} />
        </div>
        )}

      {/* Unified Filters - Top Bar */}
      <ArchiveUnifiedFilters
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        advancedFilters={advancedFilters}
        onAdvancedFiltersChange={setAdvancedFilters}
      />

      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <ResizablePanelGroup direction="horizontal" className="gap-6">
          {/* Left: Hierarchical tree structure */}
          <ResizablePanel defaultSize={35} minSize={20} maxSize={50}>
            <Card className="p-4 bg-card/95 backdrop-blur-md h-full border-2 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="space-y-4 mb-4">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <h2 className="text-title">Events</h2>
                  <div className="flex items-center gap-2">
                    {/* View Mode Switcher */}
                    <ArchiveViewSwitcher
                      currentView={viewMode}
                      onViewChange={setViewMode}
                    />

                    {/* Quick Upload Button */}
                    <QuickUploadDialog onSuccess={loadUnsortedVideos} />

                    {/* Add Tournament Button (Admin Only) */}
                    <TournamentDialog
                      isOpen={isDialogOpen}
                      onOpenChange={setIsDialogOpen}
                      editingTournamentId={editingTournamentId}
                      onSave={addNewTournament}
                      onCancel={() => {
                        setIsDialogOpen(false)
                        setEditingTournamentId("")
                      }}
                      newTournamentName={newTournamentName}
                      setNewTournamentName={setNewTournamentName}
                      newCategory={newCategory}
                      setNewCategory={setNewCategory}
                      newLocation={newLocation}
                      setNewLocation={setNewLocation}
                      newStartDate={newStartDate}
                      setNewStartDate={setNewStartDate}
                      newEndDate={newEndDate}
                      setNewEndDate={setNewEndDate}
                      isUserAdmin={isUserAdmin}
                    />
                  </div>
                </div>

                {/* Search and Sort Row */}
                <ArchiveSearchSort
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                />
              </div>

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
                      onClick={() => setIsMoveToNewEventDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Move to New Event
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Breadcrumb Navigation */}
              <ArchiveBreadcrumb
                items={buildBreadcrumbItems()}
                onNavigate={handleBreadcrumbNavigate}
              />

              {/* Folder List/Grid/Timeline - Conditional Rendering based on viewMode */}
              {viewMode === 'list' && (
                <ArchiveFolderList
                  items={buildFolderItems()}
                  onNavigate={handleFolderNavigate}
                  onSelectDay={selectDay}
                  loading={loading}
                  isUnorganized={navigationLevel === 'unorganized'}
                  selectedIds={selectedVideoIds}
                  onToggleSelect={toggleVideoSelection}
                  onSelectAll={selectAllVideos}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onMoveToEvent={handleMoveToEvent}
                  onMoveToNewEvent={handleMoveToNewEventSingle}
                  onAddSubItem={handleAddSubItem}
                  onEditEvent={handleEditEvent}
                  isAdmin={isUserAdmin}
                />
              )}

              {viewMode === 'grid' && (
                <ArchiveGridView
                  items={buildFolderItems()}
                  onNavigate={handleFolderNavigate}
                  onSelectDay={selectDay}
                  loading={loading}
                  isUnorganized={navigationLevel === 'unorganized'}
                  selectedIds={selectedVideoIds}
                  onToggleSelect={toggleVideoSelection}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onMoveToEvent={handleMoveToEvent}
                  onMoveToNewEvent={handleMoveToNewEventSingle}
                  onAddSubItem={handleAddSubItem}
                  onEditEvent={handleEditEvent}
                  isAdmin={isUserAdmin}
                />
              )}

              {viewMode === 'timeline' && (
                <ArchiveTimelineView
                  items={buildFolderItems()}
                  onNavigate={handleFolderNavigate}
                  onSelectDay={selectDay}
                  loading={loading}
                  isUnorganized={navigationLevel === 'unorganized'}
                  selectedIds={selectedVideoIds}
                  onToggleSelect={toggleVideoSelection}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onMoveToEvent={handleMoveToEvent}
                  onMoveToNewEvent={handleMoveToNewEventSingle}
                  onAddSubItem={handleAddSubItem}
                  onEditEvent={handleEditEvent}
                  isAdmin={isUserAdmin}
                />
              )}
            </Card>

            {/* SubEvent Dialog */}
            <SubEventDialog
              isOpen={isSubEventDialogOpen}
              onOpenChange={setIsSubEventDialogOpen}
              selectedTournamentId={selectedTournamentId}
              editingSubEventId={editingSubEventId}
              onSuccess={loadTournaments}
            />

            {/* SubEvent Info Dialog */}
            <SubEventInfoDialog
              isOpen={isSubEventInfoDialogOpen}
              onOpenChange={setIsSubEventInfoDialogOpen}
              subEventId={viewingSubEventId}
              subEvent={viewingSubEvent}
              isUserAdmin={isUserAdmin}
              onSuccess={loadTournaments}
            />

            {/* Day/Video Dialog */}
            <DayDialog
              isOpen={isDayDialogOpen}
              onOpenChange={setIsDayDialogOpen}
              selectedSubEventId={selectedSubEventId}
              editingDayId={editingDayId}
              onSuccess={async () => {
                await loadTournaments()
                setEditingDayId("")
                setSelectedSubEventId("")
              }}
            />

            {/* Move to Existing Event Dialog */}
            <MoveToExistingEventDialog
              isOpen={isMoveToEventDialogOpen}
              onOpenChange={setIsMoveToEventDialogOpen}
              tournaments={filteredTournaments}
              selectedVideoIds={selectedVideoIds}
              onSuccess={handleMoveSuccess}
            />

            {/* Move to New Event Dialog */}
            <MoveToNewEventDialog
              isOpen={isMoveToNewEventDialogOpen}
              onOpenChange={setIsMoveToNewEventDialogOpen}
              tournaments={filteredTournaments}
              selectedVideoIds={selectedVideoIds}
              onSuccess={handleMoveSuccess}
            />

            {/* Rename Dialog */}
            <RenameDialog
              isOpen={renameDialogOpen}
              onOpenChange={setRenameDialogOpen}
              item={renameItem}
              onSuccess={handleRenameSuccess}
            />

            {/* Delete Confirmation Dialog */}
            <DeleteDialog
              isOpen={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              item={deleteItem}
              onSuccess={handleDeleteSuccess}
            />

            {/* Edit Event Dialog */}
            <EditEventDialog
              isOpen={editEventDialogOpen}
              onOpenChange={setEditEventDialogOpen}
              subEventId={selectedEventId}
              onSuccess={async () => {
                await loadTournaments()
                setSelectedEventId(null)
              }}
            />
          </ResizablePanel>

          {/* Only show right panel when a day is selected */}
          {selectedDay && (
            <>
              <ResizableHandle withHandle />

              {/* Right: Video + Hand List */}
              <ResizablePanel defaultSize={65} minSize={50}>
            <div className="space-y-6">
            {/* Video Header */}
            <Card className="p-5 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-md border-2 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    {(() => {
                      const selectedDayObj = tournaments
                        .flatMap(t => t.sub_events || [])
                        .flatMap(se => se.days || [])
                        .find(d => d.selected)

                      const selectedSubEventObj = tournaments
                        .flatMap(t => t.sub_events || [])
                        .find(se => se.days?.some(d => d.selected))

                      const selectedTournamentObj = tournaments.find(t =>
                        t.sub_events?.some(se => se.days?.some(d => d.selected))
                      )

                      if (!selectedTournamentObj) return "Select a day"

                      const parts = []
                      if (selectedTournamentObj.name) parts.push(selectedTournamentObj.name)
                      if (selectedSubEventObj?.name) parts.push(selectedSubEventObj.name)
                      if (selectedDayObj?.name) parts.push(selectedDayObj.name)

                      return parts.join(" › ") || "Select a day"
                    })()}
                  </h2>
                  {selectedDay && hands.length > 0 && (
                    <div className="flex items-center gap-2 text-caption text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{hands.length} hands</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedDay && (
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => {
                        setVideoStartTime("")
                        setIsVideoDialogOpen(true)
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Hand List */}
            <Card className="p-6 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-md border-2 shadow-lg hover:shadow-xl transition-all duration-300">
              <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Hand History</h2>
              <div>
                {hands.length > 0 ? (
                  (() => {
                    // Find selected day, subEvent, tournament
                    const selectedDayObj = tournaments
                      .flatMap(t => t.sub_events || [])
                      .flatMap(se => se.days || [])
                      .find(d => d.selected)

                    const selectedSubEventObj = tournaments
                      .flatMap(t => t.sub_events || [])
                      .find(se => se.days?.some(d => d.selected))

                    const selectedTournamentObj = tournaments.find(t =>
                      t.sub_events?.some(se => se.days?.some(d => d.selected))
                    )

                    return (
                      <HandListAccordion
                        handIds={hands.map((hand: any) => hand.id)}
                        hands={hands.map((hand: any) => {
                          // Parse timestamp: Supports "MM:SS-MM:SS" or "MM:SS" format
                          const timestamp = hand.timestamp || ""
                          const parts = timestamp.split('-')
                          const startTime = parts[0] || "00:00"
                          const endTime = parts[1] || parts[0] || "00:00"

                          return {
                            handNumber: hand.number || "???",
                            summary: hand.description || "Hand Info",
                            timestamp: 0,
                            startTime,
                            endTime,
                            duration: 0,
                            winner: hand.hand_players?.find((hp: any) => hp.position === "BTN")?.player?.name || "Unknown",
                            potSize: hand.pot_size || 0,
                            players: hand.hand_players?.map((hp: any) => ({
                              name: hp.player?.name || "Unknown",
                              position: hp.position || "Unknown",
                              cards: hp.cards || [],
                              stackBefore: 0,
                              stackAfter: 0,
                              stackChange: 0,
                            })) || [],
                            communityCards: {
                              preflop: [],
                              flop: hand.board_cards?.slice(0, 3) || [],
                              turn: hand.board_cards?.slice(3, 4) || [],
                              river: hand.board_cards?.slice(4, 5) || [],
                            },
                            actions: {
                              preflop: [],
                              flop: [],
                              turn: [],
                              river: [],
                            },
                            streets: {
                              preflop: { actions: [], pot: 0 },
                              flop: { actions: [], pot: 0 },
                              turn: { actions: [], pot: 0 },
                              river: { actions: [], pot: 0 },
                            },
                            confidence: 0.8,
                          }
                        })}
                        onPlayHand={(startTime) => {
                          setVideoStartTime(startTime)
                          setIsVideoDialogOpen(true)
                        }}
                      />
                    )
                  })()

                ) : (
                  <EmptyState
                    icon={Folder}
                    title="No Hands Available"
                    description="Import hands from external systems. API: POST /api/import-hands"
                    variant="inline"
                  />
                )}
                {/* Removed redundant text and closing tags */}
                {false && (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-body text-muted-foreground">
                      No hands available. Import hands from external systems.
                      <br />
                      <span className="text-caption">API: POST /api/import-hands</span>
                    </p>
                  </div>
                )}
              </div>
            </Card>
            </div>
          </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Video Player Dialog */}
      <VideoPlayerDialog
        day={tournaments
          .flatMap(t => t.sub_events || [])
          .flatMap(se => se.days || [])
          .find(d => d.selected) || null}
        isOpen={isVideoDialogOpen}
        onOpenChange={setIsVideoDialogOpen}
        initialTime={videoStartTime}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={keyboardShortcutsOpen}
        onOpenChange={setKeyboardShortcutsOpen}
      />

      {/* Hand History import is performed by external systems */}
      {/* API: POST /api/import-hands */}
    </div>
    </DndContext>
  )
}
