/**
 * Archive Form Store
 *
 * 폼 데이터 관리를 담당하는 Zustand store
 * - Tournament 폼
 * - SubEvent 폼
 * - Day 폼
 * - Payout 폼
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  TournamentFormData,
  SubEventFormData,
  DayFormData,
  Payout,
  TournamentCategory,
  VideoSource,
  INITIAL_TOURNAMENT_FORM,
  INITIAL_SUBEVENT_FORM,
  INITIAL_DAY_FORM,
} from '@/lib/types/archive'

interface ArchiveFormState {
  // Tournament Form
  tournamentForm: TournamentFormData

  // SubEvent Form
  subEventForm: SubEventFormData

  // Day Form
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

  // Actions - Day Form
  setDayFormField: <K extends keyof DayFormData>(field: K, value: DayFormData[K]) => void
  setDayForm: (form: DayFormData) => void
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

      // Initial State - Day Form
      dayForm: {
        name: '',
        video_source: 'youtube',
        video_url: '',
        upload_file: null,
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

      // Actions - Day Form
      setDayFormField: (field, value) =>
        set((state) => ({
          dayForm: {
            ...state.dayForm,
            [field]: value,
          },
        })),

      setDayForm: (form) => set({ dayForm: form }),

      resetDayForm: () =>
        set({
          dayForm: {
            name: '',
            video_source: 'youtube',
            video_url: '',
            upload_file: null,
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
