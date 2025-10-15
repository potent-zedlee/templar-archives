"use client"

import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { MostUsedVideos } from "@/components/most-used-videos"
import { OnThisDay } from "@/components/on-this-day"
import { RecentAnalyses } from "@/components/recent-analyses"

export const dynamic = 'force-dynamic'
import { StatsCounter } from "@/components/main/stats-counter"
import { WeeklyHighlights } from "@/components/main/weekly-highlights"
import { LatestPosts } from "@/components/main/latest-posts"
import { TopPlayers } from "@/components/main/top-players"
import {
  getPlatformStats,
  getWeeklyHighlights,
  getLatestPosts,
  getTopPlayers
} from "@/lib/main-page"

export default async function HomePage() {
  // Fetch all data in parallel
  const [stats, highlights, posts, topPlayers] = await Promise.all([
    getPlatformStats(),
    getWeeklyHighlights(3),
    getLatestPosts(4),
    getTopPlayers(5)
  ])

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />

        {/* Platform Statistics */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4 md:px-6">
            <StatsCounter stats={stats} />
          </div>
        </section>

        {/* Weekly Highlights */}
        <section className="py-12 md:py-16">
          <div className="container max-w-7xl mx-auto px-4 md:px-6">
            <WeeklyHighlights highlights={highlights} />
          </div>
        </section>

        {/* Latest Community Posts */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-7xl mx-auto px-4 md:px-6">
            <LatestPosts posts={posts} />
          </div>
        </section>

        {/* Top Players */}
        <section className="py-12 md:py-16">
          <div className="container max-w-7xl mx-auto px-4 md:px-6">
            <TopPlayers players={topPlayers} />
          </div>
        </section>

        <RecentAnalyses />
        <MostUsedVideos />
        <OnThisDay />
      </main>
    </div>
  )
}
