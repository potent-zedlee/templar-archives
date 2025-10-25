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
  SubEventFormData,
  StreamFormData,
  DayFormData, // Backward compatibility
  Payout,
  TournamentCategory,
  VideoSource,
  INITIAL_TOURNAMENT_FORM,
  INITIAL_SUBEVENT_FORM,
  INITIAL_STREAM_FORM,
  INITIAL_DAY_FORM, // Backward compatibility
} from '@/lib/types/archive'

interface ArchiveFormState {
  // Tournament Form
  tournamentForm: TournamentFormData

  // SubEvent Form
  subEventForm: SubEventFormData

  // Stream Form (new)
  streamForm: StreamFormData
  /** @deprecated Use streamForm instead */
  dayForm: DayFormData

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

  // Actions - SubEvent Form
  setSubEventFormField: <K extends keyof SubEventFormData>(
    field: K,
    value: SubEventFormData[K]
  ) => void
  setSubEventForm: (form: SubEventFormData) => void
  resetSubEventForm: () => void

  // Actions - Stream Form (new)
  setStreamFormField: <K extends keyof StreamFormData>(field: K, value: StreamFormData[K]) => void
  setStreamForm: (form: StreamFormData) => void
  resetStreamForm: () => void

  // Actions - Day Form (backward compatibility)
  /** @deprecated Use setStreamFormField instead */
  setDayFormField: <K extends keyof DayFormData>(field: K, value: DayFormData[K]) => void
  /** @deprecated Use setStreamForm instead */
  setDayForm: (form: DayFormData) => void
  /** @deprecated Use resetStreamForm instead */
  resetDayForm: () => void

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

      // Initial State - SubEvent Form
      subEventForm: {
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

      // Initial State - Day Form (backward compatibility)
      dayForm: {
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
            location: '',
            start_date: '',
            end_date: '',
          },
        }),

      // Actions - SubEvent Form
      setSubEventFormField: (field, value) =>
        set((state) => ({
          subEventForm: {
            ...state.subEventForm,
            [field]: value,
          },
        })),

      setSubEventForm: (form) => set({ subEventForm: form }),

      resetSubEventForm: () =>
        set({
          subEventForm: {
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
        }),

      // Actions - Stream Form (new)
      setStreamFormField: (field, value) =>
        set((state) => ({
          streamForm: {
            ...state.streamForm,
            [field]: value,
          },
          // Keep dayForm in sync for backward compatibility
          dayForm: {
            ...state.dayForm,
            [field]: value,
          },
        })),

      setStreamForm: (form) => set({ streamForm: form, dayForm: form }),

      resetStreamForm: () =>
        set({
          streamForm: {
            name: '',
            video_source: 'youtube',
            video_url: '',
            upload_file: null,
            published_at: '',
          },
          dayForm: {
            name: '',
            video_source: 'youtube',
            video_url: '',
            upload_file: null,
            published_at: '',
          },
        }),

      // Actions - Day Form (backward compatibility)
      setDayFormField: (field, value) =>
        set((state) => ({
          dayForm: {
            ...state.dayForm,
            [field]: value,
          },
          // Keep streamForm in sync
          streamForm: {
            ...state.streamForm,
            [field]: value,
          },
        })),

      setDayForm: (form) => set({ dayForm: form, streamForm: form }),

      resetDayForm: () =>
        set({
          dayForm: {
            name: '',
            video_source: 'youtube',
            video_url: '',
            upload_file: null,
            published_at: '',
          },
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
