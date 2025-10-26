/**
 * Dashboard Chart Data Hooks
 *
 * Custom hooks for loading dashboard chart data with React Query
 */

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'

type UserGrowthData = {
  date: string
  users: number
}

type ContentDistributionData = {
  name: string
  value: number
}

type SecurityEventData = {
  event_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
}

/**
 * Hook for loading user growth data (last 7 days)
 */
export function useUserGrowthData() {
  const [data, setData] = useState<UserGrowthData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserGrowth()
  }, [])

  async function loadUserGrowth() {
    try {
      setIsLoading(true)
      const supabase = createBrowserSupabaseClient()

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: usersData } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at')

      // Group by date
      const growthByDate: Record<string, number> = {}
      usersData?.forEach((user) => {
        const date = new Date(user.created_at).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric',
        })
        growthByDate[date] = (growthByDate[date] || 0) + 1
      })

      const growthData = Object.entries(growthByDate).map(([date, count]) => ({
        date,
        users: count,
      }))

      setData(growthData)
    } catch (error) {
      console.error('Error loading user growth data:', error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, refetch: loadUserGrowth }
}

/**
 * Hook for loading content distribution data
 */
export function useContentDistribution() {
  const [data, setData] = useState<ContentDistributionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadContentDistribution()
  }, [])

  async function loadContentDistribution() {
    try {
      setIsLoading(true)
      const supabase = createBrowserSupabaseClient()

      const [postsResult, commentsResult, handsResult, tournamentsResult] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('hands').select('*', { count: 'exact', head: true }),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      ])

      setData([
        { name: 'Posts', value: postsResult.count || 0 },
        { name: 'Comments', value: commentsResult.count || 0 },
        { name: 'Hands', value: handsResult.count || 0 },
        { name: 'Tournaments', value: tournamentsResult.count || 0 },
      ])
    } catch (error) {
      console.error('Error loading content distribution:', error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, refetch: loadContentDistribution }
}

/**
 * Hook for loading recent security events
 */
export function useSecurityEvents(limit: number = 10) {
  const [data, setData] = useState<SecurityEventData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSecurityEvents()
  }, [limit])

  async function loadSecurityEvents() {
    try {
      setIsLoading(true)
      const supabase = createBrowserSupabaseClient()

      const { data: eventsData } = await supabase
        .from('security_events')
        .select('event_type, severity, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      setData(eventsData || [])
    } catch (error) {
      console.error('Error loading security events:', error)
      setData([])
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, refetch: loadSecurityEvents }
}
