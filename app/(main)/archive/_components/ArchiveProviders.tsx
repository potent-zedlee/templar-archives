"use client"

/**
 * Archive Providers
 *
 * Archive 페이지에 필요한 모든 Provider를 통합
 * - DndContext (드래그 앤 드롭)
 * - 키보드 단축키
 */

import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { useArchiveKeyboard } from '@/hooks/useArchiveKeyboard'
import { useArchiveData } from './ArchiveDataContext'
import { archiveKeys } from '@/lib/queries/archive-queries'
import { organizeVideo, organizeVideos } from '@/lib/unsorted-videos'
import { toast } from 'sonner'
import type { UnsortedVideo } from '@/lib/types/archive'

interface ArchiveProvidersProps {
  children: React.ReactNode
}

export function ArchiveProviders({ children }: ArchiveProvidersProps) {
  const queryClient = useQueryClient()
  const { tournaments } = useArchiveData()
  const { setSelectedDay } = useArchiveDataStore()
  const {
    selectedVideoIds,
    clearSelection,
    openKeyboardShortcutsDialog,
    openVideoDialog,
    tournamentDialog,
    subEventDialog,
    dayDialog,
    videoDialog,
  } = useArchiveUIStore()

  // Drag and drop handler
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

    // Handle drop on SubEvent or Day
    if (dropTarget.type === 'subevent' || dropTarget.type === 'day') {
      if (videoIdsToMove.length > 1) {
        const result = await organizeVideos(videoIdsToMove, dropTarget.id)
        if (result.success) {
          toast.success(`${videoIdsToMove.length} videos organized successfully`)
          queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
          queryClient.invalidateQueries({ queryKey: archiveKeys.unsortedVideos() })
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to organize videos')
        }
      } else {
        const result = await organizeVideo(videoIdsToMove[0], dropTarget.id)
        if (result.success) {
          toast.success('Video organized successfully')
          queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
          queryClient.invalidateQueries({ queryKey: archiveKeys.unsortedVideos() })
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to organize video')
        }
      }
    }
  }

  // Keyboard shortcuts
  const anyDialogOpen =
    tournamentDialog.isOpen ||
    subEventDialog.isOpen ||
    dayDialog.isOpen ||
    videoDialog.isOpen

  useArchiveKeyboard({
    onBackspace: () => {
      // Clear selected day (no navigation in tree view)
      setSelectedDay(null)
    },
    onSpace: () => {
      const selectedDayId = useArchiveDataStore.getState().selectedDay
      if (selectedDayId) {
        // Find the stream object from tournaments
        let streamObj = null
        for (const tournament of tournaments) {
          for (const subEvent of tournament.sub_events || []) {
            const stream = subEvent.days?.find((s) => s.id === selectedDayId)
            if (stream) {
              streamObj = stream
              break
            }
          }
          if (streamObj) break
        }
        openVideoDialog(streamObj, '')
      }
    },
    onSelectAll: () => {
      // Select all videos (if any are visible)
      const unsortedVideos = queryClient.getQueryData(archiveKeys.unsortedVideos()) as any[] || []
      const videoIds = unsortedVideos.map((v) => v.id)
      if (videoIds.length > 0) {
        useArchiveUIStore.getState().selectAllVideos(videoIds)
      }
    },
    onEscape: () => {
      if (selectedVideoIds.size > 0) {
        clearSelection()
      }
    },
    onFocusSearch: () => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    },
    onShowHelp: () => {
      openKeyboardShortcutsDialog()
    },
    enabled: !anyDialogOpen,
  })

  return <DndContext onDragEnd={handleDragEnd}>{children}</DndContext>
}
