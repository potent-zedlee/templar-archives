/**
 * Archive UI Store
 *
 * UI 상태 관리를 담당하는 Zustand store
 * - Dialog 열기/닫기
 * - 네비게이션 상태
 * - 뷰 모드 (list/grid/timeline)
 * - 필터 및 정렬
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  SortOption,
  FilterState,
  AdvancedFilters,
  DialogState,
  VideoPlayerState,
  UploadState,
} from '@/lib/types/archive'

interface ArchiveUIState {
  // Expansion State (Tree View)
  expandedTournaments: Set<string>
  expandedSubEvents: Set<string>

  // Search & Sort
  searchQuery: string
  sortBy: SortOption

  // Category Filter
  selectedCategory: string

  // Advanced Filters
  advancedFilters: AdvancedFilters

  // Dialogs
  tournamentDialog: DialogState
  subEventDialog: DialogState
  subEventInfoDialog: DialogState
  streamDialog: DialogState
  /** @deprecated Use streamDialog instead */
  dayDialog: DialogState
  videoDialog: VideoPlayerState
  renameDialog: DialogState
  deleteDialog: DialogState
  editEventDialog: DialogState
  moveToEventDialog: DialogState
  moveToNewEventDialog: DialogState
  keyboardShortcutsDialog: DialogState
  infoDialog: DialogState

  // Upload State
  uploadState: UploadState

  // Selection
  selectedVideoIds: Set<string>
  selectedTournamentIdForDialog: string
  selectedSubEventIdForDialog: string
  selectedEventIdForEdit: string | null

  // Menu State
  openMenuId: string

  // Viewing SubEvent (for info dialog)
  viewingSubEventId: string
  viewingSubEvent: any | null
  viewingPayouts: any[]
  loadingViewingPayouts: boolean
  isEditingViewingPayouts: boolean

  // Actions - Expansion (Tree View)
  toggleTournamentExpand: (id: string) => void
  toggleSubEventExpand: (id: string) => void
  expandAllTournaments: () => void
  collapseAllTournaments: () => void
  expandAllSubEvents: () => void
  collapseAllSubEvents: () => void

  // Actions - Search & Sort
  setSearchQuery: (query: string) => void
  setSortBy: (sort: SortOption) => void
  setSelectedCategory: (category: string) => void
  setAdvancedFilters: (filters: AdvancedFilters) => void

  // Actions - Dialogs
  openTournamentDialog: (editingId?: string) => void
  closeTournamentDialog: () => void
  openSubEventDialog: (tournamentId: string, editingId?: string) => void
  closeSubEventDialog: () => void
  openSubEventInfoDialog: (subEventId: string) => void
  closeSubEventInfoDialog: () => void
  openStreamDialog: (subEventId: string, editingId?: string) => void
  closeStreamDialog: () => void
  /** @deprecated Use openStreamDialog instead */
  openDayDialog: (subEventId: string, editingId?: string) => void
  /** @deprecated Use closeStreamDialog instead */
  closeDayDialog: () => void
  openVideoDialog: (startTime?: string) => void
  closeVideoDialog: () => void
  openRenameDialog: (itemId: string) => void
  closeRenameDialog: () => void
  openDeleteDialog: (itemId: string) => void
  closeDeleteDialog: () => void
  openEditEventDialog: (eventId: string) => void
  closeEditEventDialog: () => void
  openMoveToEventDialog: () => void
  closeMoveToEventDialog: () => void
  openMoveToNewEventDialog: () => void
  closeMoveToNewEventDialog: () => void
  openKeyboardShortcutsDialog: () => void
  closeKeyboardShortcutsDialog: () => void
  openInfoDialog: (itemId: string) => void
  closeInfoDialog: () => void

  // Actions - Upload
  setUploadFile: (file: File | null) => void
  setUploading: (uploading: boolean) => void
  setUploadProgress: (progress: number) => void
  resetUploadState: () => void

  // Actions - Selection
  toggleVideoSelection: (videoId: string) => void
  selectAllVideos: (videoIds: string[]) => void
  clearSelection: () => void

  // Actions - Menu
  setOpenMenuId: (id: string) => void

  // Actions - Viewing SubEvent
  setViewingSubEventId: (id: string) => void
  setViewingSubEvent: (subEvent: any | null) => void
  setViewingPayouts: (payouts: any[]) => void
  setLoadingViewingPayouts: (loading: boolean) => void
  setIsEditingViewingPayouts: (editing: boolean) => void
}

const INITIAL_ADVANCED_FILTERS: AdvancedFilters = {
  dateRange: {
    start: undefined,
    end: undefined,
  },
  handCountRange: [0, 1000],
  videoSources: {
    youtube: true,
    upload: true,
  },
  hasHandsOnly: false,
  tournamentName: undefined,
  playerName: undefined,
  holeCards: undefined,
  handValue: undefined,
}

export const useArchiveUIStore = create<ArchiveUIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State - Expansion (Tree View)
        expandedTournaments: new Set<string>(),
        expandedSubEvents: new Set<string>(),

        // Initial State - Search & Sort
        searchQuery: '',
        sortBy: 'date-desc',
        selectedCategory: 'All',
        advancedFilters: INITIAL_ADVANCED_FILTERS,

        // Initial State - Dialogs
        tournamentDialog: { isOpen: false, editingId: null },
        subEventDialog: { isOpen: false, editingId: null },
        subEventInfoDialog: { isOpen: false, editingId: null },
        streamDialog: { isOpen: false, editingId: null },
        dayDialog: { isOpen: false, editingId: null }, // Backward compatibility
        videoDialog: { isOpen: false, startTime: '', stream: null },
        renameDialog: { isOpen: false, editingId: null },
        deleteDialog: { isOpen: false, editingId: null },
        editEventDialog: { isOpen: false, editingId: null },
        moveToEventDialog: { isOpen: false, editingId: null },
        moveToNewEventDialog: { isOpen: false, editingId: null },
        keyboardShortcutsDialog: { isOpen: false, editingId: null },
        infoDialog: { isOpen: false, editingId: null },

        // Initial State - Upload
        uploadState: {
          uploading: false,
          progress: 0,
          file: null,
        },

        // Initial State - Selection
        selectedVideoIds: new Set<string>(),
        selectedTournamentIdForDialog: '',
        selectedSubEventIdForDialog: '',
        selectedEventIdForEdit: null,

        // Initial State - Menu
        openMenuId: '',

        // Initial State - Viewing SubEvent
        viewingSubEventId: '',
        viewingSubEvent: null,
        viewingPayouts: [],
        loadingViewingPayouts: false,
        isEditingViewingPayouts: false,

        // Actions - Expansion (Tree View)
        toggleTournamentExpand: (id) =>
          set((state) => {
            const newSet = new Set(state.expandedTournaments)
            if (newSet.has(id)) {
              newSet.delete(id)
            } else {
              newSet.add(id)
            }
            return { expandedTournaments: newSet }
          }),

        toggleSubEventExpand: (id) =>
          set((state) => {
            const newSet = new Set(state.expandedSubEvents)
            if (newSet.has(id)) {
              newSet.delete(id)
            } else {
              newSet.add(id)
            }
            return { expandedSubEvents: newSet }
          }),

        expandAllTournaments: () =>
          set((state) => {
            // This will be populated with all tournament IDs by the component
            return { expandedTournaments: new Set<string>() }
          }),

        collapseAllTournaments: () =>
          set({ expandedTournaments: new Set<string>() }),

        expandAllSubEvents: () =>
          set((state) => {
            // This will be populated with all subevent IDs by the component
            return { expandedSubEvents: new Set<string>() }
          }),

        collapseAllSubEvents: () =>
          set({ expandedSubEvents: new Set<string>() }),

        // Actions - Search & Sort
        setSearchQuery: (query) => set({ searchQuery: query }),
        setSortBy: (sort) => set({ sortBy: sort }),
        setSelectedCategory: (category) => set({ selectedCategory: category }),
        setAdvancedFilters: (filters) => set({ advancedFilters: filters }),

        // Actions - Dialogs
        openTournamentDialog: (editingId) =>
          set({ tournamentDialog: { isOpen: true, editingId: editingId || null } }),
        closeTournamentDialog: () =>
          set({ tournamentDialog: { isOpen: false, editingId: null } }),

        openSubEventDialog: (tournamentId, editingId) =>
          set({
            subEventDialog: { isOpen: true, editingId: editingId || null },
            selectedTournamentIdForDialog: tournamentId,
          }),
        closeSubEventDialog: () =>
          set({
            subEventDialog: { isOpen: false, editingId: null },
            selectedTournamentIdForDialog: '',
          }),

        openSubEventInfoDialog: (subEventId) =>
          set({
            subEventInfoDialog: { isOpen: true, editingId: subEventId },
            viewingSubEventId: subEventId,
          }),
        closeSubEventInfoDialog: () =>
          set({
            subEventInfoDialog: { isOpen: false, editingId: null },
            viewingSubEventId: '',
            viewingSubEvent: null,
          }),

        openStreamDialog: (subEventId, editingId) =>
          set({
            streamDialog: { isOpen: true, editingId: editingId || null },
            dayDialog: { isOpen: true, editingId: editingId || null }, // Keep in sync
            selectedSubEventIdForDialog: subEventId,
          }),
        closeStreamDialog: () =>
          set({
            streamDialog: { isOpen: false, editingId: null },
            dayDialog: { isOpen: false, editingId: null }, // Keep in sync
            selectedSubEventIdForDialog: '',
          }),

        // Backward compatibility
        openDayDialog: (subEventId, editingId) =>
          set({
            dayDialog: { isOpen: true, editingId: editingId || null },
            streamDialog: { isOpen: true, editingId: editingId || null }, // Keep in sync
            selectedSubEventIdForDialog: subEventId,
          }),
        closeDayDialog: () =>
          set({
            dayDialog: { isOpen: false, editingId: null },
            streamDialog: { isOpen: false, editingId: null }, // Keep in sync
            selectedSubEventIdForDialog: '',
          }),

        openVideoDialog: (startTime = '') =>
          set((state) => ({
            videoDialog: { ...state.videoDialog, isOpen: true, startTime },
          })),
        closeVideoDialog: () =>
          set((state) => ({
            videoDialog: { ...state.videoDialog, isOpen: false, startTime: '' },
          })),

        openRenameDialog: (itemId) =>
          set({ renameDialog: { isOpen: true, editingId: itemId } }),
        closeRenameDialog: () =>
          set({ renameDialog: { isOpen: false, editingId: null } }),

        openDeleteDialog: (itemId) =>
          set({ deleteDialog: { isOpen: true, editingId: itemId } }),
        closeDeleteDialog: () =>
          set({ deleteDialog: { isOpen: false, editingId: null } }),

        openEditEventDialog: (eventId) =>
          set({
            editEventDialog: { isOpen: true, editingId: eventId },
            selectedEventIdForEdit: eventId,
          }),
        closeEditEventDialog: () =>
          set({
            editEventDialog: { isOpen: false, editingId: null },
            selectedEventIdForEdit: null,
          }),

        openMoveToEventDialog: () =>
          set({ moveToEventDialog: { isOpen: true, editingId: null } }),
        closeMoveToEventDialog: () =>
          set({ moveToEventDialog: { isOpen: false, editingId: null } }),

        openMoveToNewEventDialog: () =>
          set({ moveToNewEventDialog: { isOpen: true, editingId: null } }),
        closeMoveToNewEventDialog: () =>
          set({ moveToNewEventDialog: { isOpen: false, editingId: null } }),

        openKeyboardShortcutsDialog: () =>
          set({ keyboardShortcutsDialog: { isOpen: true, editingId: null } }),
        closeKeyboardShortcutsDialog: () =>
          set({ keyboardShortcutsDialog: { isOpen: false, editingId: null } }),

        openInfoDialog: (itemId) =>
          set({ infoDialog: { isOpen: true, editingId: itemId } }),
        closeInfoDialog: () =>
          set({ infoDialog: { isOpen: false, editingId: null } }),

        // Actions - Upload
        setUploadFile: (file) =>
          set((state) => ({
            uploadState: { ...state.uploadState, file },
          })),
        setUploading: (uploading) =>
          set((state) => ({
            uploadState: { ...state.uploadState, uploading },
          })),
        setUploadProgress: (progress) =>
          set((state) => ({
            uploadState: { ...state.uploadState, progress },
          })),
        resetUploadState: () =>
          set({
            uploadState: { uploading: false, progress: 0, file: null },
          }),

        // Actions - Selection
        toggleVideoSelection: (videoId) =>
          set((state) => {
            const newSet = new Set(state.selectedVideoIds)
            if (newSet.has(videoId)) {
              newSet.delete(videoId)
            } else {
              newSet.add(videoId)
            }
            return { selectedVideoIds: newSet }
          }),

        selectAllVideos: (videoIds) =>
          set({ selectedVideoIds: new Set(videoIds) }),

        clearSelection: () => set({ selectedVideoIds: new Set() }),

        // Actions - Menu
        setOpenMenuId: (id) => set({ openMenuId: id }),

        // Actions - Viewing SubEvent
        setViewingSubEventId: (id) => set({ viewingSubEventId: id }),
        setViewingSubEvent: (subEvent) => set({ viewingSubEvent: subEvent }),
        setViewingPayouts: (payouts) => set({ viewingPayouts: payouts }),
        setLoadingViewingPayouts: (loading) => set({ loadingViewingPayouts: loading }),
        setIsEditingViewingPayouts: (editing) => set({ isEditingViewingPayouts: editing }),
      }),
      {
        name: 'ArchiveUIStore',
        // Persist only certain fields
        partialize: (state) => ({
          selectedCategory: state.selectedCategory,
          sortBy: state.sortBy,
        }),
      }
    ),
    { name: 'ArchiveUIStore' }
  )
)
