"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { MostUsedVideos } from "@/components/most-used-videos"
import { OnThisDay } from "@/components/on-this-day"
import { RecentAnalyses } from "@/components/recent-analyses"
import { StatsCounter } from "@/components/main/stats-counter"
import { WeeklyHighlights } from "@/components/main/weekly-highlights"
import { LatestPosts } from "@/components/main/latest-posts"
import { TopPlayers } from "@/components/main/top-players"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import {
  getPlatformStats,
  getWeeklyHighlights,
  getLatestPosts,
  getTopPlayers
} from "@/lib/main-page"

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    stats: any
    highlights: any[]
    posts: any[]
    topPlayers: any[]
  } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [stats, highlights, posts, topPlayers] = await Promise.all([
          getPlatformStats(),
          getWeeklyHighlights(3),
          getLatestPosts(4),
          getTopPlayers(5)
        ])

        setData({ stats, highlights, posts, topPlayers })
      } catch (error) {
        console.error("Failed to load homepage data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container max-w-7xl mx-auto px-4 md:px-6 py-12">
          <CardSkeleton count={4} />
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load data. Please try again later.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />

        {/* Platform Statistics */}
        {data.stats && (
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container max-w-7xl mx-auto px-4 md:px-6">
              <StatsCounter stats={data.stats} />
            </div>
          </section>
        )}

        {/* Weekly Highlights */}
        {data.highlights && data.highlights.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container max-w-7xl mx-auto px-4 md:px-6">
              <WeeklyHighlights highlights={data.highlights} />
            </div>
          </section>
        )}

        {/* Latest Community Posts */}
        {data.posts && data.posts.length > 0 && (
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container max-w-7xl mx-auto px-4 md:px-6">
              <LatestPosts posts={data.posts} />
            </div>
          </section>
        )}

        {/* Top Players */}
        {data.topPlayers && data.topPlayers.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container max-w-7xl mx-auto px-4 md:px-6">
              <TopPlayers players={data.topPlayers} />
            </div>
          </section>
        )}

        <RecentAnalyses />
        <MostUsedVideos />
        <OnThisDay />
      </main>
    </div>
  )
}
