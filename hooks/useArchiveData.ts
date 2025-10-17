import { useState, useEffect, useCallback } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { loadTournamentsHelper, loadHandsHelper } from '@/lib/archive-helpers'
import { getUnsortedVideos } from '@/lib/unsorted-videos'
import type { UnsortedVideo } from '@/lib/unsorted-videos'

const supabase = createClientSupabaseClient()

export function useArchiveData() {
  const [tournaments, setTournaments] = useState<any[]>([])
  const [hands, setHands] = useState<any[]>([])
  const [unsortedVideos, setUnsortedVideos] = useState<UnsortedVideo[]>([])
  const [selectedDay, setSelectedDay] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Load tournaments
  const loadTournaments = useCallback(() => {
    return loadTournamentsHelper(setTournaments, setSelectedDay, setLoading)
  }, [])

  // Load unsorted videos
  const loadUnsortedVideos = useCallback(async () => {
    try {
      const videos = await getUnsortedVideos()
      setUnsortedVideos(videos)
    } catch (error) {
      console.error('Error loading unsorted videos:', error)
    }
  }, [])

  // Load hands for selected day
  const loadHands = useCallback((dayId: string) => {
    return loadHandsHelper(dayId, setHands)
  }, [])

  // Initial data load
  useEffect(() => {
    loadTournaments()
    loadUnsortedVideos()
  }, [loadTournaments, loadUnsortedVideos])

  // Load hands when day changes
  useEffect(() => {
    if (selectedDay) {
      loadHands(selectedDay)
    }
  }, [selectedDay, loadHands])

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    tournaments,
    setTournaments,
    hands,
    setHands,
    unsortedVideos,
    setUnsortedVideos,
    selectedDay,
    setSelectedDay,
    loading,
    setLoading,
    userEmail,
    setUserEmail,
    loadTournaments,
    loadUnsortedVideos,
    loadHands,
  }
}
