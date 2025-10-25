import { createClientSupabaseClient } from './supabase-client'
import { fetchTournamentsTree } from './queries'
import { toast } from 'sonner'

const supabase = createClientSupabaseClient()

/**
 * Load tournaments with sub_events and days
 */
export async function loadTournamentsHelper(
  setTournaments: (tournaments: any[]) => void,
  setSelectedDay: (day: string) => void,
  setLoading: (loading: boolean) => void
) {
  setLoading(true)
  try {
    const tournamentsData = await fetchTournamentsTree()

    const tournamentsWithUIState = tournamentsData.map((tournament: any) => ({
      ...tournament,
      sub_events: tournament.sub_events?.map((subEvent: any) => ({
        ...subEvent,
        days: subEvent.streams?.map((day: any) => ({ ...day, selected: false })),
        expanded: false,
      })),
      expanded: true,
    }))

    setTournaments(tournamentsWithUIState)

    // Don't auto-select any day - user must manually select
  } catch (error) {
    console.error('Error loading tournaments:', error)
    toast.error('Failed to load tournaments')
  } finally {
    setLoading(false)
  }
}

/**
 * Load hands for a specific day
 */
export async function loadHandsHelper(dayId: string, setHands: (hands: any[]) => void) {
  try {
    const { data, error } = await supabase
      .from('hands')
      .select(`
        *,
        hand_players(
          position,
          cards,
          player:players(name)
        )
      `)
      .eq('day_id', dayId)
      .order('created_at', { ascending: true })

    if (error) throw error

    setHands((data || []).map((hand) => ({ ...hand, checked: false })))
  } catch (error) {
    console.error('Error loading hands:', error)
  }
}

/**
 * Toggle tournament expansion
 */
export function toggleTournamentHelper(
  tournamentId: string,
  setTournaments: (fn: (prev: any[]) => any[]) => void
) {
  setTournaments((prev) =>
    prev.map((t) => (t.id === tournamentId ? { ...t, expanded: !t.expanded } : t))
  )
}

/**
 * Toggle sub-event expansion
 */
export function toggleSubEventHelper(
  tournamentId: string,
  subEventId: string,
  setTournaments: (fn: (prev: any[]) => any[]) => void
) {
  setTournaments((prev) =>
    prev.map((t) =>
      t.id === tournamentId
        ? {
            ...t,
            sub_events: t.sub_events?.map((se: any) =>
              se.id === subEventId ? { ...se, expanded: !se.expanded } : se
            ),
          }
        : t
    )
  )
}

/**
 * Select a day
 */
export function selectDayHelper(
  dayId: string,
  setSelectedDay: (day: string) => void,
  setTournaments: (fn: (prev: any[]) => any[]) => void
) {
  setSelectedDay(dayId)
  setTournaments((prev) =>
    prev.map((t) => ({
      ...t,
      sub_events: t.sub_events?.map((se: any) => ({
        ...se,
        days: se.days?.map((d: any) => ({
          ...d,
          selected: d.id === dayId,
        })),
      })),
    }))
  )
}

/**
 * Toggle hand favorite
 */
export async function toggleFavoriteHelper(
  handId: string,
  hands: any[],
  setHands: (fn: (prev: any[]) => any[]) => void
) {
  const hand = hands.find((h) => h.id === handId)
  if (!hand) return

  try {
    const { error } = await supabase
      .from('hands')
      .update({ favorite: !hand.favorite })
      .eq('id', handId)

    if (error) throw error

    setHands((prev) =>
      prev.map((h) => (h.id === handId ? { ...h, favorite: !h.favorite } : h))
    )
  } catch (error) {
    console.error('Error toggling favorite:', error)
  }
}

/**
 * Delete tournament
 */
export async function deleteTournamentHelper(
  tournamentId: string,
  setTournaments: (fn: (prev: any[]) => any[]) => void
) {
  try {
    const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId)

    if (error) throw error

    setTournaments((prev) => prev.filter((t) => t.id !== tournamentId))
    toast.success('Tournament deleted successfully')
  } catch (error: any) {
    console.error('Error deleting tournament:', error)
    toast.error(error.message || 'Failed to delete tournament')
  }
}

/**
 * Delete sub-event
 */
export async function deleteSubEventHelper(
  subEventId: string,
  setTournaments: (fn: (prev: any[]) => any[]) => void
) {
  try {
    const { error } = await supabase.from('sub_events').delete().eq('id', subEventId)

    if (error) throw error

    setTournaments((prev) =>
      prev.map((t) => ({
        ...t,
        sub_events: t.sub_events?.filter((se: any) => se.id !== subEventId),
      }))
    )
    toast.success('Event deleted successfully')
  } catch (error: any) {
    console.error('Error deleting sub-event:', error)
    toast.error(error.message || 'Failed to delete event')
  }
}

/**
 * Delete day
 */
export async function deleteDayHelper(
  dayId: string,
  setTournaments: (fn: (prev: any[]) => any[]) => void
) {
  try {
    const { error } = await supabase.from('streams').delete().eq('id', dayId)

    if (error) throw error

    setTournaments((prev) =>
      prev.map((t) => ({
        ...t,
        sub_events: t.sub_events?.map((se: any) => ({
          ...se,
          days: se.days?.filter((d: any) => d.id !== dayId),
        })),
      }))
    )
    toast.success('Day deleted successfully')
  } catch (error: any) {
    console.error('Error deleting day:', error)
    toast.error(error.message || 'Failed to delete day')
  }
}

/**
 * Check if user is admin
 */
export async function checkIsUserAdmin(userEmail: string | null): Promise<boolean> {
  if (!userEmail) return false

  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('email', userEmail)
      .single()

    if (error) return false

    return data?.role === 'admin' || data?.role === 'high_templar'
  } catch (error) {
    return false
  }
}
