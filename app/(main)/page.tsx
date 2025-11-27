"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { PageTransition } from "@/components/layout/PageTransition"
import { OnThisDay } from "@/components/home/OnThisDay"
import { StatsCounter } from "@/components/home/StatsCounter"
import { WeeklyHighlights } from "@/components/home/WeeklyHighlights"
import { LatestPosts } from "@/components/home/LatestPosts"
import { TopPlayers } from "@/components/home/TopPlayers"
import { CardSkeleton } from "@/components/ui/skeletons/CardSkeleton"
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect"
import { getHomePageData } from "@/app/actions/home"
import type { PlatformStats, WeeklyHighlight, TopPlayer } from "@/lib/main-page"

export default function HomeClient() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    stats: PlatformStats | null
    highlights: WeeklyHighlight[]
    posts: any[]
    topPlayers: TopPlayer[]
  } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getHomePageData()

        if (result.success && result.data) {
          setData({
            stats: result.data.stats,
            highlights: result.data.highlights,
            posts: result.data.posts,
            topPlayers: result.data.topPlayers,
          })
        } else {
          console.error("Failed to load homepage data:", result.error)
        }
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
      <main className="container max-w-7xl mx-auto px-4 md:px-6 py-12 bg-white dark:bg-gray-900">
        <CardSkeleton count={4} />
      </main>
    )
  }

  if (!data) {
    return (
      <main className="container max-w-7xl mx-auto px-4 md:px-6 py-12 bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Failed to load data. Please try again later.</p>
        </div>
      </main>
    )
  }

  const words = [
    { text: "TEMPLAR", className: "text-gold-400" },
    { text: "ARCHIVES:", className: "text-gold-500" },
    { text: "YOUR", className: "text-text-secondary" },
    { text: "POKER", className: "text-text-secondary" },
    { text: "KNOWLEDGE", className: "text-gold-400" },
    { text: "BASE", className: "text-text-secondary" },
  ]

  return (
    <PageTransition variant="fade">
      <main id="main-content" role="main" className="bg-white dark:bg-gray-900">
        {/* Hero Section (Postmodern) */}
        <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center text-center space-y-8">
              {/* Typewriter title */}
              <TypewriterEffectSmooth words={words} />

              {/* Subtitle */}
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                프로 포커 토너먼트의 모든 핸드 히스토리를 분석하고 학습하세요
              </p>

              {/* CTA Buttons (Postmodern) */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/archive/tournament">
                  <button className="btn-primary min-w-[200px]">
                    ARCHIVE 둘러보기
                  </button>
                </Link>
                <Link href="/search">
                  <button className="btn-secondary min-w-[200px]">
                    핸드 검색하기
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

          {/* Platform Statistics */}
          {data.stats && (
            <section className="py-12 md:py-16 bg-white dark:bg-gray-900">
              <div className="container max-w-7xl mx-auto px-4 md:px-6">
                <StatsCounter stats={data.stats} />
              </div>
            </section>
          )}

        {/* Weekly Highlights */}
        {data.highlights && data.highlights.length > 0 && (
          <section className="py-12 md:py-16 bg-gray-50 dark:bg-gray-800">
            <div className="container max-w-7xl mx-auto px-4 md:px-6">
              <WeeklyHighlights highlights={data.highlights} />
            </div>
          </section>
        )}

        {/* Latest Community Posts */}
        {data.posts && data.posts.length > 0 && (
          <section className="py-12 md:py-16 bg-white dark:bg-gray-900">
            <div className="container max-w-7xl mx-auto px-4 md:px-6">
              <LatestPosts posts={data.posts} />
            </div>
          </section>
        )}

        {/* Top Players */}
        {data.topPlayers && data.topPlayers.length > 0 && (
          <section className="py-12 md:py-16 bg-gray-50 dark:bg-gray-800">
            <div className="container max-w-7xl mx-auto px-4 md:px-6">
              <TopPlayers players={data.topPlayers} />
            </div>
          </section>
        )}

        <OnThisDay />
      </main>
    </PageTransition>
  )
}
