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
import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { PlatformStats, WeeklyHighlight, TopPlayer } from "@/lib/main-page"

export default function homeClient() {
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
        const supabase = createClientSupabaseClient()

        // Fetch platform stats
        const [
          { count: totalHands },
          { count: totalTournaments },
          { count: totalPlayers },
          { count: totalUsers }
        ] = await Promise.all([
          supabase.from('hands').select('*', { count: 'exact', head: true }),
          supabase.from('tournaments').select('*', { count: 'exact', head: true }),
          supabase.from('players').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true })
        ])

        const stats = {
          totalHands: totalHands || 0,
          totalTournaments: totalTournaments || 0,
          totalPlayers: totalPlayers || 0,
          totalUsers: totalUsers || 0
        }

        // Fetch weekly highlights
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: highlightsData } = await supabase
          .from('hands')
          .select(`
            id,
            number,
            description,
            timestamp,
            pot_size,
            likes_count,
            day:day_id (
              name,
              video_url,
              sub_event:sub_event_id (
                tournament:tournament_id (
                  name
                )
              )
            )
          `)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('likes_count', { ascending: false })
          .limit(3)

        const highlights = (highlightsData || []).map((hand: any) => ({
          id: hand.id,
          number: hand.number,
          description: hand.description || '',
          timestamp: hand.timestamp || '',
          pot_size: hand.pot_size || 0,
          likes_count: hand.likes_count || 0,
          video_url: hand.day?.video_url || '',
          tournament_name: hand.day?.sub_event?.tournament?.name || 'Unknown',
          day_name: hand.day?.name || 'Unknown'
        }))

        // Fetch latest posts
        const { data: postsData } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            content,
            category,
            created_at,
            likes_count,
            comments_count,
            author_name,
            author_avatar
          `)
          .order('created_at', { ascending: false })
          .limit(4)

        const posts = (postsData || []).map((post: any) => ({
          ...post,
          author: {
            nickname: post.author_name,
            avatar_url: post.author_avatar
          }
        }))

        // Fetch top players
        const { data: playersData } = await supabase
          .from('players')
          .select(`
            id,
            name,
            photo_url,
            total_winnings,
            hand_players:hand_players(count)
          `)
          .order('total_winnings', { ascending: false })
          .limit(5)

        const topPlayers = (playersData || []).map((player: any) => ({
          id: player.id,
          name: player.name,
          photo_url: player.photo_url,
          total_winnings: player.total_winnings || 0,
          tournament_count: 0,
          hands_count: player.hand_players?.length || 0
        }))

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
