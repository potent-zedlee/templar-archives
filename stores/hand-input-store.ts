import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HandInput, HandPlayerInput, HandActionInput } from '@/app/actions/hands-manual'

// ===========================
// Types
// ===========================

export interface HandInputFormData {
  // Basic Info
  hand: HandInput

  // Players & Positions
  players: HandPlayerInput[]

  // Action Sequence
  actions: HandActionInput[]
}

export interface SavedHand extends HandInputFormData {
  id: string // 임시 ID (UUID)
  saved_at: string // ISO timestamp
}

interface HandInputState {
  // Current hand being edited
  currentHand: HandInputFormData | null

  // Saved hands (not yet submitted to DB)
  savedHands: SavedHand[]

  // Hand Input Mode state
  isOpen: boolean
  streamId: string | null

  // Dirty state (unsaved changes)
  isDirty: boolean

  // Actions
  setCurrentHand: (hand: HandInputFormData | null) => void
  updateHandField: <K extends keyof HandInput>(field: K, value: HandInput[K]) => void
  updatePlayer: (index: number, data: Partial<HandPlayerInput>) => void
  addPlayer: (player: HandPlayerInput) => void
  removePlayer: (index: number) => void
  updateAction: (index: number, data: Partial<HandActionInput>) => void
  addAction: (action: HandActionInput) => void
  removeAction: (index: number) => void

  // Save/Load
  saveHandLocally: () => void
  loadSavedHand: (id: string) => void
  deleteSavedHand: (id: string) => void
  clearSavedHands: () => void

  // Mode control
  openHandInputMode: (streamId: string) => void
  closeHandInputMode: () => void

  // Dirty state
  markDirty: () => void
  markClean: () => void

  // Reset
  resetCurrentHand: () => void
}

// ===========================
// Initial State
// ===========================

const INITIAL_HAND_DATA: HandInputFormData = {
  hand: {
    stream_id: '',
    number: '',
    description: '',
    small_blind: 0,
    big_blind: 0,
  },
  players: [],
  actions: [],
}

// ===========================
// Store
// ===========================

export const useHandInputStore = create<HandInputState>()(
  persist(
    (set, get) => ({
      // State
      currentHand: null,
      savedHands: [],
      isOpen: false,
      streamId: null,
      isDirty: false,

      // Set current hand
      setCurrentHand: (hand) =>
        set({
          currentHand: hand,
          isDirty: false,
        }),

      // Update hand field
      updateHandField: (field, value) => {
        const currentHand = get().currentHand
        if (!currentHand) return

        set({
          currentHand: {
            ...currentHand,
            hand: {
              ...currentHand.hand,
              [field]: value,
            },
          },
          isDirty: true,
        })
      },

      // Update player
      updatePlayer: (index, data) => {
        const currentHand = get().currentHand
        if (!currentHand) return

        const updatedPlayers = [...currentHand.players]
        updatedPlayers[index] = {
          ...updatedPlayers[index],
          ...data,
        }

        set({
          currentHand: {
            ...currentHand,
            players: updatedPlayers,
          },
          isDirty: true,
        })
      },

      // Add player
      addPlayer: (player) => {
        const currentHand = get().currentHand
        if (!currentHand) return

        set({
          currentHand: {
            ...currentHand,
            players: [...currentHand.players, player],
          },
          isDirty: true,
        })
      },

      // Remove player
      removePlayer: (index) => {
        const currentHand = get().currentHand
        if (!currentHand) return

        set({
          currentHand: {
            ...currentHand,
            players: currentHand.players.filter((_, i) => i !== index),
          },
          isDirty: true,
        })
      },

      // Update action
      updateAction: (index, data) => {
        const currentHand = get().currentHand
        if (!currentHand) return

        const updatedActions = [...currentHand.actions]
        updatedActions[index] = {
          ...updatedActions[index],
          ...data,
        }

        set({
          currentHand: {
            ...currentHand,
            actions: updatedActions,
          },
          isDirty: true,
        })
      },

      // Add action
      addAction: (action) => {
        const currentHand = get().currentHand
        if (!currentHand) return

        set({
          currentHand: {
            ...currentHand,
            actions: [...currentHand.actions, action],
          },
          isDirty: true,
        })
      },

      // Remove action
      removeAction: (index) => {
        const currentHand = get().currentHand
        if (!currentHand) return

        set({
          currentHand: {
            ...currentHand,
            actions: currentHand.actions.filter((_, i) => i !== index),
          },
          isDirty: true,
        })
      },

      // Save hand locally (to savedHands list)
      saveHandLocally: () => {
        const { currentHand, savedHands } = get()
        if (!currentHand) return

        const savedHand: SavedHand = {
          ...currentHand,
          id: crypto.randomUUID(),
          saved_at: new Date().toISOString(),
        }

        set({
          savedHands: [...savedHands, savedHand],
          isDirty: false,
        })
      },

      // Load saved hand
      loadSavedHand: (id) => {
        const savedHand = get().savedHands.find((h) => h.id === id)
        if (!savedHand) return

        set({
          currentHand: {
            hand: savedHand.hand,
            players: savedHand.players,
            actions: savedHand.actions,
          },
          isDirty: false,
        })
      },

      // Delete saved hand
      deleteSavedHand: (id) => {
        set({
          savedHands: get().savedHands.filter((h) => h.id !== id),
        })
      },

      // Clear all saved hands
      clearSavedHands: () => {
        set({ savedHands: [] })
      },

      // Open Hand Input Mode
      openHandInputMode: (streamId) => {
        set({
          isOpen: true,
          streamId,
          currentHand: {
            ...INITIAL_HAND_DATA,
            hand: {
              ...INITIAL_HAND_DATA.hand,
              stream_id: streamId,
            },
          },
          isDirty: false,
        })
      },

      // Close Hand Input Mode
      closeHandInputMode: () => {
        set({
          isOpen: false,
          streamId: null,
          currentHand: null,
          isDirty: false,
        })
      },

      // Mark dirty
      markDirty: () => set({ isDirty: true }),

      // Mark clean
      markClean: () => set({ isDirty: false }),

      // Reset current hand
      resetCurrentHand: () => {
        const streamId = get().streamId
        set({
          currentHand: streamId
            ? {
                ...INITIAL_HAND_DATA,
                hand: {
                  ...INITIAL_HAND_DATA.hand,
                  stream_id: streamId,
                },
              }
            : null,
          isDirty: false,
        })
      },
    }),
    {
      name: 'hand-input-storage',
      // Only persist savedHands, not current editing state
      partialize: (state) => ({
        savedHands: state.savedHands,
      }),
    }
  )
)
