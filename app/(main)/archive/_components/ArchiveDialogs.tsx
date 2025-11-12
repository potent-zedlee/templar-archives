"use client"

/**
 * Archive Dialogs
 *
 * 모든 다이얼로그를 통합 관리하는 컴포넌트 (Dynamic Import 최적화)
 * - Tournament, SubEvent, Day, Video 다이얼로그
 * - 컨텍스트 메뉴 다이얼로그 (Rename, Delete, Edit, Move)
 */

import { useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useQueryClient } from '@tanstack/react-query'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { useArchiveFormStore } from '@/stores/archive-form-store'
import { useArchiveData } from './ArchiveDataContext'
import { archiveKeys } from '@/lib/queries/archive-queries'
import { isAdmin } from '@/lib/auth-utils'
import type { FolderItem } from '@/lib/types/archive'
import type { Stream, SubEvent } from '@/lib/supabase'

// Dynamic imports for all dialogs (only load when needed)
const TournamentDialog = dynamic(() => import('@/components/tournament-dialog').then(mod => ({ default: mod.TournamentDialog })), {
  ssr: false,
})
const SubEventDialog = dynamic(() => import('@/components/archive-dialogs/sub-event-dialog').then(mod => ({ default: mod.SubEventDialog })), {
  ssr: false,
})
const SubEventInfoDialog = dynamic(() => import('@/components/archive-dialogs/sub-event-info-dialog').then(mod => ({ default: mod.SubEventInfoDialog })), {
  ssr: false,
})
const DayDialog = dynamic(() => import('@/components/archive-dialogs/day-dialog').then(mod => ({ default: mod.DayDialog })), {
  ssr: false,
})
const VideoPlayerDialog = dynamic(() => import('@/components/video-player-dialog').then(mod => ({ default: mod.VideoPlayerDialog })), {
  ssr: false,
})
const RenameDialog = dynamic(() => import('@/components/archive-dialogs/rename-dialog').then(mod => ({ default: mod.RenameDialog })), {
  ssr: false,
})
const DeleteDialog = dynamic(() => import('@/components/archive-dialogs/delete-dialog').then(mod => ({ default: mod.DeleteDialog })), {
  ssr: false,
})
const EditEventDialog = dynamic(() => import('@/components/edit-event-dialog').then(mod => ({ default: mod.EditEventDialog })), {
  ssr: false,
})
const MoveToExistingEventDialog = dynamic(() => import('@/components/archive-dialogs/move-to-existing-event-dialog').then(mod => ({ default: mod.MoveToExistingEventDialog })), {
  ssr: false,
})
const MoveToNewEventDialog = dynamic(() => import('@/components/archive-dialogs/move-to-new-event-dialog').then(mod => ({ default: mod.MoveToNewEventDialog })), {
  ssr: false,
})
const ArchiveInfoDialog = dynamic(() => import('@/components/archive-info-dialog').then(mod => ({ default: mod.ArchiveInfoDialog })), {
  ssr: false,
})
const AnalyzeVideoDialog = dynamic(() => import('@/components/archive-dialogs/analyze-video-dialog').then(mod => ({ default: mod.AnalyzeVideoDialog })), {
  ssr: false,
})

export function ArchiveDialogs() {
  const queryClient = useQueryClient()
  const { tournaments } = useArchiveData()
  const { userEmail } = useArchiveDataStore()

  const {
    selectedCategory,
    tournamentDialog,
    subEventDialog,
    subEventInfoDialog,
    dayDialog,
    videoDialog,
    analyzeDialog,
    analyzeDayForDialog,
    renameDialog,
    deleteDialog,
    editEventDialog,
    moveToEventDialog,
    moveToNewEventDialog,
    infoDialog,
    selectedVideoIds,
    selectedTournamentIdForDialog,
    selectedSubEventIdForDialog,
    selectedEventIdForEdit,
    viewingSubEventId,
    viewingSubEvent,
    closeTournamentDialog,
    closeSubEventDialog,
    closeSubEventInfoDialog,
    closeDayDialog,
    closeVideoDialog,
    closeAnalyzeDialog,
    closeRenameDialog,
    closeDeleteDialog,
    closeEditEventDialog,
    closeMoveToEventDialog,
    closeMoveToNewEventDialog,
    closeInfoDialog,
    clearSelection,
  } = useArchiveUIStore()

  const {
    tournamentForm,
  } = useArchiveFormStore()

  const isUserAdmin = isAdmin(userEmail)

  // Filtered tournaments
  const filteredTournaments =
    selectedCategory === 'All'
      ? tournaments
      : tournaments.filter((t) => t.category === selectedCategory)

  // Handle success callbacks (React Query invalidation)
  const handleTournamentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    closeTournamentDialog()
  }

  const handleSubEventSuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    closeSubEventDialog()
  }

  const handleDaySuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    closeDayDialog()
  }

  const handleRenameSuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    closeRenameDialog()
  }

  const handleDeleteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    closeDeleteDialog()
  }

  const handleEditEventSuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    closeEditEventDialog()
  }

  const handleMoveSuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    clearSelection()
    closeMoveToEventDialog()
    closeMoveToNewEventDialog()
  }

  const handleAnalyzeSuccess = () => {
    // Invalidate hands query to show newly extracted hands
    if (analyzeDayForDialog?.id) {
      queryClient.invalidateQueries({ queryKey: archiveKeys.hands(analyzeDayForDialog.id) })
    }
    closeAnalyzeDialog()
  }

  // Debug: Log when analyzeDialog state changes
  useEffect(() => {
    console.log('============================================')
    console.log('[ArchiveDialogs] analyzeDialog state changed')
    console.log('[ArchiveDialogs] analyzeDialog:', analyzeDialog)
    console.log('[ArchiveDialogs] analyzeDayForDialog:', analyzeDayForDialog)
    console.log('============================================')
  }, [analyzeDialog, analyzeDayForDialog])

  // Get current item for info dialog
  const infoDialogItem = useMemo((): FolderItem | null => {
    if (!infoDialog.editingId) return null

    // Check if it's a tournament
    const tournament = tournaments.find((t) => t.id === infoDialog.editingId)
    if (tournament) {
      return {
        id: tournament.id,
        name: tournament.name,
        type: 'tournament',
        data: tournament,
      }
    }

    // Check if it's a subevent or day
    for (const tournament of tournaments) {
      const subEvent = tournament.sub_events?.find((se) => se.id === infoDialog.editingId)
      if (subEvent) {
        return {
          id: subEvent.id,
          name: subEvent.name,
          type: 'subevent',
          data: subEvent,
        }
      }

      for (const subEvent of tournament.sub_events || []) {
        const day = subEvent.days?.find((d: Stream) => d.id === infoDialog.editingId)
        if (day) {
          return {
            id: day.id,
            name: day.name,
            type: 'day',
            data: day,
          }
        }
      }
    }

    return null
  }, [infoDialog.editingId, tournaments])

  return (
    <>
      {/* Tournament Dialog */}
      <TournamentDialog
        isOpen={tournamentDialog.isOpen}
        onOpenChange={closeTournamentDialog}
        editingTournamentId={tournamentDialog.editingId || ''}
        onSave={handleTournamentSuccess}
        onCancel={closeTournamentDialog}
        newTournamentName={tournamentForm.name}
        setNewTournamentName={(name) => useArchiveFormStore.getState().setTournamentFormField('name', name)}
        newCategory={tournamentForm.category}
        setNewCategory={(category) => useArchiveFormStore.getState().setTournamentFormField('category', category)}
        newGameType={tournamentForm.game_type}
        setNewGameType={(gameType) => useArchiveFormStore.getState().setTournamentFormField('game_type', gameType)}
        newLocation={tournamentForm.location}
        setNewLocation={(location) => useArchiveFormStore.getState().setTournamentFormField('location', location)}
        newCity={tournamentForm.city}
        setNewCity={(city) => useArchiveFormStore.getState().setTournamentFormField('city', city)}
        newCountry={tournamentForm.country}
        setNewCountry={(country) => useArchiveFormStore.getState().setTournamentFormField('country', country)}
        newStartDate={tournamentForm.start_date}
        setNewStartDate={(date) => useArchiveFormStore.getState().setTournamentFormField('start_date', date)}
        newEndDate={tournamentForm.end_date}
        setNewEndDate={(date) => useArchiveFormStore.getState().setTournamentFormField('end_date', date)}
        newCategoryLogo={tournamentForm.category_logo || ''}
        setNewCategoryLogo={(logo) => useArchiveFormStore.getState().setTournamentFormField('category_logo', logo)}
        isUserAdmin={isUserAdmin}
      />

      {/* SubEvent Dialog */}
      <SubEventDialog
        isOpen={subEventDialog.isOpen}
        onOpenChange={closeSubEventDialog}
        selectedTournamentId={selectedTournamentIdForDialog}
        editingSubEventId={subEventDialog.editingId || ''}
        onSuccess={handleSubEventSuccess}
      />

      {/* SubEvent Info Dialog */}
      <SubEventInfoDialog
        isOpen={subEventInfoDialog.isOpen}
        onOpenChange={closeSubEventInfoDialog}
        subEventId={viewingSubEventId}
        subEvent={viewingSubEvent}
        isUserAdmin={isUserAdmin}
        onSuccess={handleSubEventSuccess}
      />

      {/* Day Dialog */}
      <DayDialog
        isOpen={dayDialog.isOpen}
        onOpenChange={closeDayDialog}
        selectedSubEventId={selectedSubEventIdForDialog}
        editingDayId={dayDialog.editingId || ''}
        onSuccess={handleDaySuccess}
      />

      {/* Video Player Dialog */}
      <VideoPlayerDialog
        day={videoDialog.stream}
        isOpen={videoDialog.isOpen}
        onOpenChange={closeVideoDialog}
        initialTime={videoDialog.startTime}
      />

      {/* Rename Dialog */}
      <RenameDialog
        isOpen={renameDialog.isOpen}
        onOpenChange={closeRenameDialog}
        item={renameDialog.editingId ? { id: renameDialog.editingId, name: '', type: 'tournament' } : null}
        onSuccess={handleRenameSuccess}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        isOpen={deleteDialog.isOpen}
        onOpenChange={closeDeleteDialog}
        item={deleteDialog.editingId ? { id: deleteDialog.editingId, name: '', type: 'tournament' } : null}
        onSuccess={handleDeleteSuccess}
      />

      {/* Edit Event Dialog */}
      <EditEventDialog
        isOpen={editEventDialog.isOpen}
        onOpenChange={closeEditEventDialog}
        subEventId={selectedEventIdForEdit}
        onSuccess={handleEditEventSuccess}
      />

      {/* Move to Existing Event Dialog */}
      <MoveToExistingEventDialog
        isOpen={moveToEventDialog.isOpen}
        onOpenChange={closeMoveToEventDialog}
        tournaments={filteredTournaments}
        selectedVideoIds={selectedVideoIds}
        onSuccess={handleMoveSuccess}
      />

      {/* Move to New Event Dialog */}
      <MoveToNewEventDialog
        isOpen={moveToNewEventDialog.isOpen}
        onOpenChange={closeMoveToNewEventDialog}
        tournaments={filteredTournaments}
        selectedVideoIds={selectedVideoIds}
        onSuccess={handleMoveSuccess}
      />

      {/* Archive Info Dialog */}
      <ArchiveInfoDialog
        item={infoDialogItem}
        isOpen={infoDialog.isOpen}
        onClose={closeInfoDialog}
        isAdmin={isUserAdmin}
        onEdit={(item) => {
          // Open appropriate dialog based on type
          if (item.type === 'tournament') {
            useArchiveUIStore.getState().openTournamentDialog(item.id)
          } else if (item.type === 'subevent') {
            useArchiveUIStore.getState().openEditEventDialog(item.id)
          } else if (item.type === 'day') {
            // Find parent subevent
            const tournament = tournaments.find(t =>
              t.sub_events?.some((se: SubEvent) => se.days?.some((d: Stream) => d.id === item.id))
            )
            const subEvent = tournament?.sub_events?.find((se: SubEvent) =>
              se.days?.some((d: Stream) => d.id === item.id)
            )
            if (subEvent) {
              useArchiveUIStore.getState().openDayDialog(subEvent.id, item.id)
            }
          }
        }}
        onDelete={(item) => {
          useArchiveUIStore.getState().openDeleteDialog(item.id)
        }}
      />

      {/* Analyze Video Dialog */}
      <AnalyzeVideoDialog
        isOpen={analyzeDialog.isOpen}
        onOpenChange={closeAnalyzeDialog}
        day={analyzeDayForDialog}
        onSuccess={handleAnalyzeSuccess}
      />
    </>
  )
}
