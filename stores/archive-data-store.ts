/**
 * Archive Data Store
 *
 * 데이터 관리를 담당하는 Zustand store
 * - Tournaments, SubEvents, Days, Hands
 * - 데이터 로딩 및 CRUD 작업
 * - 선택 상태 관리
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { loadTournamentsHelper, loadHandsHelper } from '@/lib/archive-helpers'
import { getUnsortedVideos } from '@/lib/unsorted-videos'
import type {
  Tournament,
  SubEvent,
  Day,
  Hand,
  UnsortedVideo,
  LoadingState,
  ErrorState,
} from '@/lib/types/archive'

const supabase = createClientSupabaseClient()

interface ArchiveDataState {
  // Data
  tournaments: Tournament[]
  hands: Hand[]
  unsortedVideos: UnsortedVideo[]
  selectedDay: string | null

  // Loading states
  loading: LoadingState

  // Error states
  errors: ErrorState

  // User info
  userEmail: string | null

  // Actions - Data Management
  setTournaments: (tournaments: Tournament[]) => void
  setHands: (hands: Hand[]) => void
  setUnsortedVideos: (videos: UnsortedVideo[]) => void
  setSelectedDay: (dayId: string | null) => void
  setUserEmail: (email: string | null) => void

  // Actions - Data Loading
  loadTournaments: () => Promise<void>
  loadHands: (dayId: string) => Promise<void>
  loadUnsortedVideos: () => Promise<void>

  // Actions - Tournament
  toggleTournament: (tournamentId: string) => void

  // Actions - SubEvent
  toggleSubEvent: (tournamentId: string, subEventId: string) => void

  // Actions - Day
  selectDay: (dayId: string | null) => void

  // Actions - Hand
  toggleHandFavorite: (handId: string) => void
  toggleHandChecked: (handId: string) => void

  // Computed values
  getSelectedDayData: () => Day | null
  getTournamentById: (id: string) => Tournament | null
  getSubEventById: (id: string) => SubEvent | null
}

export const useArchiveDataStore = create<ArchiveDataState>()(
  devtools(
    (set, get) => ({
      // Initial State
      tournaments: [],
      hands: [],
      unsortedVideos: [],
      selectedDay: null,

      loading: {
        tournaments: true,
        hands: false,
        unsortedVideos: false,
        payouts: false,
      },

      errors: {
        tournaments: null,
        hands: null,
        unsortedVideos: null,
      },

      userEmail: null,

      // Setters
      setTournaments: (tournaments) => set({ tournaments }),
      setHands: (hands) => set({ hands }),
      setUnsortedVideos: (videos) => set({ unsortedVideos: videos }),
      setSelectedDay: (dayId) => set({ selectedDay: dayId }),
      setUserEmail: (email) => set({ userEmail: email }),

      // Data Loading
      loadTournaments: async () => {
        set((state) => ({
          loading: { ...state.loading, tournaments: true },
          errors: { ...state.errors, tournaments: null },
        }))

        try {
          await loadTournamentsHelper(
            (tournaments) => set({ tournaments }),
            (dayId) => set({ selectedDay: dayId }),
            (loading) => set((state) => ({
              loading: { ...state.loading, tournaments: loading },
            }))
          )
        } catch (error) {
          set((state) => ({
            errors: { ...state.errors, tournaments: (error as Error).message },
            loading: { ...state.loading, tournaments: false },
          }))
        }
      },

      loadHands: async (dayId: string) => {
        set((state) => ({
          loading: { ...state.loading, hands: true },
          errors: { ...state.errors, hands: null },
        }))

        try {
          await loadHandsHelper(
            dayId,
            (hands) => set({ hands })
          )
          set((state) => ({
            loading: { ...state.loading, hands: false },
          }))
        } catch (error) {
          set((state) => ({
            errors: { ...state.errors, hands: (error as Error).message },
            loading: { ...state.loading, hands: false },
          }))
        }
      },

      loadUnsortedVideos: async () => {
        set((state) => ({
          loading: { ...state.loading, unsortedVideos: true },
          errors: { ...state.errors, unsortedVideos: null },
        }))

        try {
          const videos = await getUnsortedVideos()
          set({
            unsortedVideos: videos,
            loading: (state) => ({ ...state.loading, unsortedVideos: false }),
          })
        } catch (error) {
          set((state) => ({
            errors: { ...state.errors, unsortedVideos: (error as Error).message },
            loading: { ...state.loading, unsortedVideos: false },
          }))
        }
      },

      // Toggle Tournament
      toggleTournament: (tournamentId: string) => {
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId ? { ...t, expanded: !t.expanded } : t
          ),
        }))
      },

      // Toggle SubEvent
      toggleSubEvent: (tournamentId: string, subEventId: string) => {
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  sub_events: t.sub_events?.map((se) =>
                    se.id === subEventId ? { ...se, expanded: !se.expanded } : se
                  ),
                }
              : t
          ),
        }))
      },

      // Select Day (with toggle)
      selectDay: (dayId: string | null) => {
        const currentSelected = get().selectedDay

        if (dayId === currentSelected) {
          // Toggle off
          set({
            selectedDay: null,
            hands: [],
            tournaments: get().tournaments.map((t) => ({
              ...t,
              sub_events: t.sub_events?.map((se) => ({
                ...se,
                days: se.days?.map((d) => ({
                  ...d,
                  selected: false,
                })),
              })),
            })),
          })
        } else {
          // Select new day
          set({
            selectedDay: dayId,
            tournaments: get().tournaments.map((t) => ({
              ...t,
              sub_events: t.sub_events?.map((se) => ({
                ...se,
                days: se.days?.map((d) => ({
                  ...d,
                  selected: d.id === dayId,
                })),
              })),
            })),
          })

          // Load hands for selected day
          if (dayId) {
            get().loadHands(dayId)
          }
        }
      },

      // Toggle Hand Favorite
      toggleHandFavorite: (handId: string) => {
        set((state) => ({
          hands: state.hands.map((h) =>
            h.id === handId ? { ...h, favorite: !h.favorite } : h
          ),
        }))
      },

      // Toggle Hand Checked
      toggleHandChecked: (handId: string) => {
        set((state) => ({
          hands: state.hands.map((h) =>
            h.id === handId ? { ...h, checked: !h.checked } : h
          ),
        }))
      },

      // Computed Values
      getSelectedDayData: () => {
        const { tournaments, selectedDay } = get()
        if (!selectedDay) return null

        for (const tournament of tournaments) {
          for (const subEvent of tournament.sub_events || []) {
            const day = subEvent.days?.find((d) => d.id === selectedDay)
            if (day) return day
          }
        }
        return null
      },

      getTournamentById: (id: string) => {
        return get().tournaments.find((t) => t.id === id) || null
      },

      getSubEventById: (id: string) => {
        const { tournaments } = get()
        for (const tournament of tournaments) {
          const subEvent = tournament.sub_events?.find((se) => se.id === id)
          if (subEvent) return subEvent
        }
        return null
      },
    }),
    { name: 'ArchiveDataStore' }
  )
)
