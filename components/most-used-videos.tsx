"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Play, Eye, Video } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { Tournament, SubEvent, Day } from "@/lib/supabase"
import Link from "next/link"

type DayWithTournament = Day & {
  tournament_name: string
  tournament_category: string
  sub_event_name: string
  hand_count: number
}

type TimeRange = "year" | "month" | "week"

export function MostUsedVideos() {
  const [activeTab, setActiveTab] = useState<TimeRange>("year")
  const [videos, setVideos] = useState<DayWithTournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMostUsedVideos()
  }, [activeTab])

  async function loadMostUsedVideos() {
    setLoading(true)
    try {
      const supabase = createClientSupabaseClient()
      // Calculate date range based on active tab
      const now = new Date()
      let startDate = new Date()

      if (activeTab === "week") {
        startDate.setDate(now.getDate() - 7)
      } else if (activeTab === "month") {
        startDate.setMonth(now.getMonth() - 1)
      } else {
        startDate.setFullYear(now.getFullYear() - 1)
      }

      // Get all days
      const { data: daysData, error: daysError } = await supabase
        .from('days')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (daysError) throw daysError

      // Enrich with tournament and sub_event info and hand count
      const enrichedDays = await Promise.all(
        (daysData || []).slice(0, 3).map(async (day) => {
          // Get sub_event
          const { data: subEvent } = await supabase
            .from('sub_events')
            .select('*, tournament_id')
            .eq('id', day.sub_event_id)
            .single()

          // Get tournament
          const { data: tournament } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', subEvent?.tournament_id)
            .single()

          // Count hands
          const { count } = await supabase
            .from('hands')
            .select('*', { count: 'exact', head: true })
            .eq('day_id', day.id)

          return {
            ...day,
            tournament_name: tournament?.name || 'Unknown Tournament',
            tournament_category: tournament?.category || 'Unknown',
            sub_event_name: subEvent?.name || 'Unknown Event',
            hand_count: count || 0
          }
        })
      )

      setVideos(enrichedDays)
    } catch (error) {
      console.error('Error loading most used videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-title-lg text-foreground">Most Analyzed Videos</h2>
          <p className="text-body-lg text-muted-foreground">Most popular poker videos in the community</p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex justify-center gap-2">
            <button
              onClick={() => setActiveTab("year")}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "year"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setActiveTab("month")}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "month"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setActiveTab("week")}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === "week"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Week
            </button>
          </div>

          <Card className="border-border bg-card/50 backdrop-blur">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-body text-muted-foreground">Loading...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-body text-muted-foreground">No videos found for this period</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {videos.map((video, index) => (
                  <Link key={video.id} href="/archive">
                    <div className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 cursor-pointer">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-bold text-muted-foreground">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="mb-1 text-body font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {video.tournament_name} - {video.sub_event_name} ({video.name})
                        </h3>
                        <div className="flex items-center gap-3 text-caption text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            {video.tournament_category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {video.hand_count} hands
                          </span>
                          <span>
                            {formatDate(video.created_at)}
                          </span>
                        </div>
                      </div>

                      {video.video_url && (
                        <div className="flex-shrink-0">
                          <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  )
}
