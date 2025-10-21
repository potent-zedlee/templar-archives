"use client"

/**
 * Archive Dialogs
 *
 * 모든 다이얼로그를 통합 관리하는 컴포넌트
 * - Tournament, SubEvent, Day, Video 다이얼로그
 * - 컨텍스트 메뉴 다이얼로그 (Rename, Delete, Edit, Move)
 * - 키보드 단축키 다이얼로그
 */

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { useArchiveFormStore } from '@/stores/archive-form-store'
import { useArchiveData } from './ArchiveDataContext'
import { archiveKeys } from '@/lib/queries/archive-queries'
import { TournamentDialog } from '@/components/tournament-dialog'
import { SubEventDialog } from '@/components/archive-dialogs/sub-event-dialog'
import { SubEventInfoDialog } from '@/components/archive-dialogs/sub-event-info-dialog'
import { DayDialog } from '@/components/archive-dialogs/day-dialog'
import { VideoPlayerDialog } from '@/components/video-player-dialog'
import { RenameDialog } from '@/components/archive-dialogs/rename-dialog'
import { DeleteDialog } from '@/components/archive-dialogs/delete-dialog'
import { EditEventDialog } from '@/components/edit-event-dialog'
import { MoveToExistingEventDialog } from '@/components/archive-dialogs/move-to-existing-event-dialog'
import { MoveToNewEventDialog } from '@/components/archive-dialogs/move-to-new-event-dialog'
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog'

export function ArchiveDialogs() {
  const queryClient = useQueryClient()
  const { tournaments } = useArchiveData()
  const { userEmail, selectedDay } = useArchiveDataStore()

  const {
    selectedCategory,
    tournamentDialog,
    subEventDialog,
    subEventInfoDialog,
    dayDialog,
    videoDialog,
    renameDialog,
    deleteDialog,
    editEventDialog,
    moveToEventDialog,
    moveToNewEventDialog,
    keyboardShortcutsDialog,
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
    closeRenameDialog,
    closeDeleteDialog,
    closeEditEventDialog,
    closeMoveToEventDialog,
    closeMoveToNewEventDialog,
    closeKeyboardShortcutsDialog,
    clearSelection,
  } = useArchiveUIStore()

  const {
    tournamentForm,
    subEventForm,
    dayForm,
  } = useArchiveFormStore()

  const isUserAdmin = userEmail ? userEmail.endsWith('@admin.com') : false

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
    queryClient.invalidateQueries({ queryKey: archiveKeys.unsortedVideos() })
    closeRenameDialog()
  }

  const handleDeleteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    queryClient.invalidateQueries({ queryKey: archiveKeys.unsortedVideos() })
    closeDeleteDialog()
  }

  const handleEditEventSuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    closeEditEventDialog()
  }

  const handleMoveSuccess = () => {
    queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
    queryClient.invalidateQueries({ queryKey: archiveKeys.unsortedVideos() })
    clearSelection()
    closeMoveToEventDialog()
    closeMoveToNewEventDialog()
  }

  // Get selected day data for video player
  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null

    for (const tournament of tournaments) {
      for (const subEvent of tournament.sub_events || []) {
        const day = subEvent.days?.find((d) => d.id === selectedDay)
        if (day) return day
      }
    }
    return null
  }, [selectedDay, tournaments])

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
        newStartDate={tournamentForm.start_date}
        setNewStartDate={(date) => useArchiveFormStore.getState().setTournamentFormField('start_date', date)}
        newEndDate={tournamentForm.end_date}
        setNewEndDate={(date) => useArchiveFormStore.getState().setTournamentFormField('end_date', date)}
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
        day={selectedDayData}
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

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={keyboardShortcutsDialog.isOpen}
        onOpenChange={closeKeyboardShortcutsDialog}
      />
    </>
  )
}
