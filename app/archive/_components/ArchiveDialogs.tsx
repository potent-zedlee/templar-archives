"use client"

/**
 * Archive Dialogs
 *
 * 모든 다이얼로그를 통합 관리하는 컴포넌트
 * - Tournament, SubEvent, Day, Video 다이얼로그
 * - 컨텍스트 메뉴 다이얼로그 (Rename, Delete, Edit, Move)
 * - 키보드 단축키 다이얼로그
 */

import { useArchiveDataStore } from '@/stores/archive-data-store'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { useArchiveFormStore } from '@/stores/archive-form-store'
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
  const {
    tournaments,
    loadTournaments,
    loadUnsortedVideos,
    userEmail,
    getSelectedDayData,
  } = useArchiveDataStore()

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

  // Handle success callbacks
  const handleTournamentSuccess = async () => {
    await loadTournaments()
    closeTournamentDialog()
  }

  const handleSubEventSuccess = async () => {
    await loadTournaments()
    closeSubEventDialog()
  }

  const handleDaySuccess = async () => {
    await loadTournaments()
    closeDayDialog()
  }

  const handleRenameSuccess = async () => {
    await loadTournaments()
    await loadUnsortedVideos()
    closeRenameDialog()
  }

  const handleDeleteSuccess = async () => {
    await loadTournaments()
    await loadUnsortedVideos()
    closeDeleteDialog()
  }

  const handleEditEventSuccess = async () => {
    await loadTournaments()
    closeEditEventDialog()
  }

  const handleMoveSuccess = async () => {
    await loadTournaments()
    await loadUnsortedVideos()
    clearSelection()
    closeMoveToEventDialog()
    closeMoveToNewEventDialog()
  }

  // Get selected day for video player
  const selectedDay = getSelectedDayData()

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
        day={selectedDay}
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
