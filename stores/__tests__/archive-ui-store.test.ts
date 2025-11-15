import { describe, it, expect, beforeEach } from 'vitest'
import { useArchiveUIStore } from '../archive-ui-store'
import type { Stream } from '@/lib/types/archive'

describe('Archive UI Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useArchiveUIStore.setState({
      expandedTournament: null,
      expandedSubEvent: null,
      searchQuery: '',
      sortBy: 'date-desc',
      selectedCategory: 'All',
      tournamentDialog: { isOpen: false, editingId: null },
      subEventDialog: { isOpen: false, editingId: null },
      streamDialog: { isOpen: false, editingId: null },
      analyzeDialog: { isOpen: false, editingId: null },
      videoDialog: { isOpen: false, startTime: '', stream: null },
      selectedVideoIds: new Set<string>(),
      selectedTournamentIdForDialog: '',
      selectedSubEventIdForDialog: '',
      analyzeDayForDialog: null,
      openMenuId: '',
    })
  })

  describe('Expansion State (Single Mode)', () => {
    it('should expand tournament', () => {
      const { toggleTournamentExpand } = useArchiveUIStore.getState()
      toggleTournamentExpand('tournament-1')

      const { expandedTournament } = useArchiveUIStore.getState()
      expect(expandedTournament).toBe('tournament-1')
    })

    it('should collapse tournament when clicked again', () => {
      const { toggleTournamentExpand } = useArchiveUIStore.getState()
      toggleTournamentExpand('tournament-1')
      toggleTournamentExpand('tournament-1')

      const { expandedTournament } = useArchiveUIStore.getState()
      expect(expandedTournament).toBeNull()
    })

    it('should close previous tournament when opening new one (Single Mode)', () => {
      const { toggleTournamentExpand } = useArchiveUIStore.getState()
      toggleTournamentExpand('tournament-1')
      toggleTournamentExpand('tournament-2')

      const { expandedTournament } = useArchiveUIStore.getState()
      expect(expandedTournament).toBe('tournament-2')
    })

    it('should close SubEvent when Tournament changes', () => {
      const { toggleTournamentExpand, toggleSubEventExpand } = useArchiveUIStore.getState()

      toggleTournamentExpand('tournament-1')
      toggleSubEventExpand('subevent-1')
      toggleTournamentExpand('tournament-2')

      const { expandedSubEvent } = useArchiveUIStore.getState()
      expect(expandedSubEvent).toBeNull()
    })

    it('should expand sub-event', () => {
      const { toggleSubEventExpand } = useArchiveUIStore.getState()
      toggleSubEventExpand('subevent-1')

      const { expandedSubEvent } = useArchiveUIStore.getState()
      expect(expandedSubEvent).toBe('subevent-1')
    })

    it('should collapse sub-event when clicked again', () => {
      const { toggleSubEventExpand } = useArchiveUIStore.getState()
      toggleSubEventExpand('subevent-1')
      toggleSubEventExpand('subevent-1')

      const { expandedSubEvent } = useArchiveUIStore.getState()
      expect(expandedSubEvent).toBeNull()
    })
  })

  describe('Search & Sort', () => {
    it('should set search query', () => {
      const { setSearchQuery } = useArchiveUIStore.getState()
      setSearchQuery('poker hands')

      const { searchQuery } = useArchiveUIStore.getState()
      expect(searchQuery).toBe('poker hands')
    })

    it('should set sort option', () => {
      const { setSortBy } = useArchiveUIStore.getState()
      setSortBy('name-asc')

      const { sortBy } = useArchiveUIStore.getState()
      expect(sortBy).toBe('name-asc')
    })

    it('should set selected category', () => {
      const { setSelectedCategory } = useArchiveUIStore.getState()
      setSelectedCategory('WSOP')

      const { selectedCategory } = useArchiveUIStore.getState()
      expect(selectedCategory).toBe('WSOP')
    })

    it('should reset all filters', () => {
      const {
        setSearchQuery,
        setSortBy,
        toggleTournamentExpand,
        resetAllFilters,
      } = useArchiveUIStore.getState()

      setSearchQuery('test')
      setSortBy('name-asc')
      toggleTournamentExpand('tournament-1')

      resetAllFilters()

      const { searchQuery, sortBy, expandedTournament, expandedSubEvent } =
        useArchiveUIStore.getState()

      expect(searchQuery).toBe('')
      expect(sortBy).toBe('date-desc')
      expect(expandedTournament).toBeNull()
      expect(expandedSubEvent).toBeNull()
    })
  })

  describe('Dialog Management', () => {
    it('should open tournament dialog', () => {
      const { openTournamentDialog } = useArchiveUIStore.getState()
      openTournamentDialog()

      const { tournamentDialog } = useArchiveUIStore.getState()
      expect(tournamentDialog.isOpen).toBe(true)
      expect(tournamentDialog.editingId).toBeNull()
    })

    it('should open tournament dialog with editing ID', () => {
      const { openTournamentDialog } = useArchiveUIStore.getState()
      openTournamentDialog('tournament-1')

      const { tournamentDialog } = useArchiveUIStore.getState()
      expect(tournamentDialog.isOpen).toBe(true)
      expect(tournamentDialog.editingId).toBe('tournament-1')
    })

    it('should close tournament dialog', () => {
      const { openTournamentDialog, closeTournamentDialog } = useArchiveUIStore.getState()
      openTournamentDialog('tournament-1')
      closeTournamentDialog()

      const { tournamentDialog } = useArchiveUIStore.getState()
      expect(tournamentDialog.isOpen).toBe(false)
      expect(tournamentDialog.editingId).toBeNull()
    })

    it('should open sub-event dialog with tournament ID', () => {
      const { openSubEventDialog } = useArchiveUIStore.getState()
      openSubEventDialog('tournament-1')

      const { subEventDialog, selectedTournamentIdForDialog } = useArchiveUIStore.getState()
      expect(subEventDialog.isOpen).toBe(true)
      expect(selectedTournamentIdForDialog).toBe('tournament-1')
    })

    it('should open stream dialog with sub-event ID', () => {
      const { openStreamDialog } = useArchiveUIStore.getState()
      openStreamDialog('subevent-1')

      const { streamDialog, selectedSubEventIdForDialog } = useArchiveUIStore.getState()
      expect(streamDialog.isOpen).toBe(true)
      expect(selectedSubEventIdForDialog).toBe('subevent-1')
    })

    it('should keep dayDialog in sync with streamDialog (backward compatibility)', () => {
      const { openStreamDialog } = useArchiveUIStore.getState()
      openStreamDialog('subevent-1')

      const { streamDialog, dayDialog } = useArchiveUIStore.getState()
      expect(streamDialog.isOpen).toBe(dayDialog.isOpen)
      expect(streamDialog.editingId).toBe(dayDialog.editingId)
    })

    it('should open video dialog with stream and start time', () => {
      const mockStream: Stream = {
        id: 'stream-1',
        sub_event_id: 'subevent-1',
        name: 'Test Stream',
        video_source: 'youtube',
        video_url: 'https://youtube.com/watch?v=test',
        published_at: '2024-01-01',
        created_at: '2024-01-01',
        hand_count: 0,
      }

      const { openVideoDialog } = useArchiveUIStore.getState()
      openVideoDialog(mockStream, '00:10:30')

      const { videoDialog } = useArchiveUIStore.getState()
      expect(videoDialog.isOpen).toBe(true)
      expect(videoDialog.stream).toBe(mockStream)
      expect(videoDialog.startTime).toBe('00:10:30')
    })

    it('should close video dialog and clear start time', () => {
      const mockStream: Stream = {
        id: 'stream-1',
        sub_event_id: 'subevent-1',
        name: 'Test Stream',
        video_source: 'youtube',
        video_url: 'https://youtube.com/watch?v=test',
        published_at: '2024-01-01',
        created_at: '2024-01-01',
        hand_count: 0,
      }

      const { openVideoDialog, closeVideoDialog } = useArchiveUIStore.getState()
      openVideoDialog(mockStream, '00:10:30')
      closeVideoDialog()

      const { videoDialog } = useArchiveUIStore.getState()
      expect(videoDialog.isOpen).toBe(false)
      expect(videoDialog.startTime).toBe('')
    })

    it('should open analyze dialog with stream', () => {
      const mockStream: Stream = {
        id: 'stream-1',
        sub_event_id: 'subevent-1',
        name: 'Test Stream',
        video_source: 'youtube',
        video_url: 'https://youtube.com/watch?v=test',
        published_at: '2024-01-01',
        created_at: '2024-01-01',
        hand_count: 0,
      }

      const { openAnalyzeDialog } = useArchiveUIStore.getState()
      openAnalyzeDialog(mockStream)

      const { analyzeDialog, analyzeDayForDialog } = useArchiveUIStore.getState()
      expect(analyzeDialog.isOpen).toBe(true)
      expect(analyzeDayForDialog).toBe(mockStream)
    })

    it('should close analyze dialog and clear stream', () => {
      const mockStream: Stream = {
        id: 'stream-1',
        sub_event_id: 'subevent-1',
        name: 'Test Stream',
        video_source: 'youtube',
        video_url: 'https://youtube.com/watch?v=test',
        published_at: '2024-01-01',
        created_at: '2024-01-01',
        hand_count: 0,
      }

      const { openAnalyzeDialog, closeAnalyzeDialog } = useArchiveUIStore.getState()
      openAnalyzeDialog(mockStream)
      closeAnalyzeDialog()

      const { analyzeDialog, analyzeDayForDialog } = useArchiveUIStore.getState()
      expect(analyzeDialog.isOpen).toBe(false)
      expect(analyzeDayForDialog).toBeNull()
    })
  })

  describe('Upload State', () => {
    it('should set upload file', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' })
      const { setUploadFile } = useArchiveUIStore.getState()
      setUploadFile(mockFile)

      const { uploadState } = useArchiveUIStore.getState()
      expect(uploadState.file).toBe(mockFile)
    })

    it('should set uploading state', () => {
      const { setUploading } = useArchiveUIStore.getState()
      setUploading(true)

      const { uploadState } = useArchiveUIStore.getState()
      expect(uploadState.uploading).toBe(true)
    })

    it('should set upload progress', () => {
      const { setUploadProgress } = useArchiveUIStore.getState()
      setUploadProgress(75)

      const { uploadState } = useArchiveUIStore.getState()
      expect(uploadState.progress).toBe(75)
    })

    it('should reset upload state', () => {
      const mockFile = new File(['content'], 'test.mp4', { type: 'video/mp4' })
      const { setUploadFile, setUploading, setUploadProgress, resetUploadState } =
        useArchiveUIStore.getState()

      setUploadFile(mockFile)
      setUploading(true)
      setUploadProgress(50)

      resetUploadState()

      const { uploadState } = useArchiveUIStore.getState()
      expect(uploadState.uploading).toBe(false)
      expect(uploadState.progress).toBe(0)
      expect(uploadState.file).toBeNull()
    })
  })

  describe('Selection Management', () => {
    it('should toggle video selection', () => {
      const { toggleVideoSelection } = useArchiveUIStore.getState()
      toggleVideoSelection('video-1')

      const { selectedVideoIds } = useArchiveUIStore.getState()
      expect(selectedVideoIds.has('video-1')).toBe(true)
    })

    it('should toggle video deselection', () => {
      const { toggleVideoSelection } = useArchiveUIStore.getState()
      toggleVideoSelection('video-1')
      toggleVideoSelection('video-1')

      const { selectedVideoIds } = useArchiveUIStore.getState()
      expect(selectedVideoIds.has('video-1')).toBe(false)
    })

    it('should select all videos', () => {
      const { selectAllVideos } = useArchiveUIStore.getState()
      selectAllVideos(['video-1', 'video-2', 'video-3'])

      const { selectedVideoIds } = useArchiveUIStore.getState()
      expect(selectedVideoIds.size).toBe(3)
      expect(selectedVideoIds.has('video-1')).toBe(true)
      expect(selectedVideoIds.has('video-2')).toBe(true)
      expect(selectedVideoIds.has('video-3')).toBe(true)
    })

    it('should clear selection', () => {
      const { selectAllVideos, clearSelection } = useArchiveUIStore.getState()
      selectAllVideos(['video-1', 'video-2'])
      clearSelection()

      const { selectedVideoIds } = useArchiveUIStore.getState()
      expect(selectedVideoIds.size).toBe(0)
    })
  })

  describe('Menu State', () => {
    it('should set open menu ID', () => {
      const { setOpenMenuId } = useArchiveUIStore.getState()
      setOpenMenuId('menu-1')

      const { openMenuId } = useArchiveUIStore.getState()
      expect(openMenuId).toBe('menu-1')
    })

    it('should change open menu ID', () => {
      const { setOpenMenuId } = useArchiveUIStore.getState()
      setOpenMenuId('menu-1')
      setOpenMenuId('menu-2')

      const { openMenuId } = useArchiveUIStore.getState()
      expect(openMenuId).toBe('menu-2')
    })
  })
})
