/**
 * Archive Form Store
 *
 * 폼 데이터 관리를 담당하는 Zustand store
 * - Tournament 폼
 * - SubEvent 폼
 * - Stream 폼 (이전 Day 폼)
 * - Payout 폼
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  TournamentFormData,
  EventFormData,
  StreamFormData,
  Payout,
  TournamentCategory,
  VideoSource,
  INITIAL_TOURNAMENT_FORM,
  INITIAL_EVENT_FORM,
  INITIAL_STREAM_FORM,
} from '@/lib/types/archive'

interface ArchiveFormState {
  // Tournament Form
  tournamentForm: TournamentFormData

  // Event Form
  eventForm: EventFormData

  // Stream Form
  streamForm: StreamFormData

  // Payout Form
  payouts: Payout[]
  hendonMobUrl: string
  hendonMobHtml: string
  csvText: string
  loadingPayouts: boolean
  payoutSectionOpen: boolean
  editingViewingPayouts: Payout[]
  savingPayouts: boolean

  // Actions - Tournament Form
  setTournamentFormField: <K extends keyof TournamentFormData>(
    field: K,
    value: TournamentFormData[K]
  ) => void
  setTournamentForm: (form: TournamentFormData) => void
  resetTournamentForm: () => void

  // Actions - Event Form
  setEventFormField: <K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K]
  ) => void
  setEventForm: (form: EventFormData) => void
  resetEventForm: () => void

  // Actions - Stream Form
  setStreamFormField: <K extends keyof StreamFormData>(field: K, value: StreamFormData[K]) => void
  setStreamForm: (form: StreamFormData) => void
  resetStreamForm: () => void

  // Actions - Payout Form
  setPayouts: (payouts: Payout[]) => void
  addPayout: () => void
  removePayout: (index: number) => void
  updatePayout: (index: number, field: keyof Payout, value: string | number) => void
  setHendonMobUrl: (url: string) => void
  setHendonMobHtml: (html: string) => void
  setCsvText: (text: string) => void
  setLoadingPayouts: (loading: boolean) => void
  setPayoutSectionOpen: (open: boolean) => void
  setEditingViewingPayouts: (payouts: Payout[]) => void
  setSavingPayouts: (saving: boolean) => void
  resetPayoutForm: () => void
}

const INITIAL_PAYOUT: Payout = {
  rank: 1,
  playerName: '',
  prizeAmount: '',
}

export const useArchiveFormStore = create<ArchiveFormState>()(
  devtools(
    (set) => ({
      // Initial State - Tournament Form
      tournamentForm: {
        name: '',
        category: 'WSOP',
        game_type: 'tournament',
        location: '',
        start_date: '',
        end_date: '',
      },

      // Initial State - Event Form
      eventForm: {
        name: '',
        date: '',
        total_prize: '',
        winner: '',
        buy_in: '',
        entry_count: '',
        blind_structure: '',
        level_duration: '',
        starting_stack: '',
        notes: '',
      },

      // Initial State - Stream Form
      streamForm: {
        name: '',
        video_source: 'youtube',
        video_url: '',
        upload_file: null,
        published_at: '',
      },

      // Initial State - Payout Form
      payouts: [INITIAL_PAYOUT],
      hendonMobUrl: '',
      hendonMobHtml: '',
      csvText: '',
      loadingPayouts: false,
      payoutSectionOpen: false,
      editingViewingPayouts: [],
      savingPayouts: false,

      // Actions - Tournament Form
      setTournamentFormField: (field, value) =>
        set((state) => ({
          tournamentForm: {
            ...state.tournamentForm,
            [field]: value,
          },
        })),

      setTournamentForm: (form) => set({ tournamentForm: form }),

      resetTournamentForm: () =>
        set({
          tournamentForm: {
            name: '',
            category: 'WSOP',
            category_logo: '',
            game_type: 'tournament',
            location: '',
            city: '',
            country: '',
            start_date: '',
            end_date: '',
          },
        }),

      // Actions - Event Form
      setEventFormField: (field, value) =>
        set((state) => ({
          eventForm: {
            ...state.eventForm,
            [field]: value,
          },
        })),

      setEventForm: (form) => set({ eventForm: form }),

      resetEventForm: () =>
        set({
          eventForm: {
            name: '',
            date: '',
            event_number: '',
            total_prize: '',
            winner: '',
            buy_in: '',
            entry_count: '',
            blind_structure: '',
            level_duration: '',
            starting_stack: '',
            notes: '',
          },
        }),

      // Actions - Stream Form
      setStreamFormField: (field, value) =>
        set((state) => ({
          streamForm: {
            ...state.streamForm,
            [field]: value,
          },
        })),

      setStreamForm: (form) => set({ streamForm: form }),

      resetStreamForm: () =>
        set({
          streamForm: {
            name: '',
            video_source: 'youtube',
            video_url: '',
            upload_file: null,
            published_at: '',
          },
        }),

      // Actions - Payout Form
      setPayouts: (payouts) => set({ payouts }),

      addPayout: () =>
        set((state) => ({
          payouts: [
            ...state.payouts,
            { rank: state.payouts.length + 1, playerName: '', prizeAmount: '' },
          ],
        })),

      removePayout: (index) =>
        set((state) => ({
          payouts: state.payouts.filter((_, i) => i !== index),
        })),

      updatePayout: (index, field, value) =>
        set((state) => ({
          payouts: state.payouts.map((payout, i) =>
            i === index ? { ...payout, [field]: value } : payout
          ),
        })),

      setHendonMobUrl: (url) => set({ hendonMobUrl: url }),
      setHendonMobHtml: (html) => set({ hendonMobHtml: html }),
      setCsvText: (text) => set({ csvText: text }),
      setLoadingPayouts: (loading) => set({ loadingPayouts: loading }),
      setPayoutSectionOpen: (open) => set({ payoutSectionOpen: open }),
      setEditingViewingPayouts: (payouts) => set({ editingViewingPayouts: payouts }),
      setSavingPayouts: (saving) => set({ savingPayouts: saving }),

      resetPayoutForm: () =>
        set({
          payouts: [INITIAL_PAYOUT],
          hendonMobUrl: '',
          hendonMobHtml: '',
          csvText: '',
          payoutSectionOpen: false,
        }),
    }),
    { name: 'ArchiveFormStore' }
  )
)
