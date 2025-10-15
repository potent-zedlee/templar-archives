"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Video } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type DayWithData = {
  id: string
  name: string
  created_at: string
  tournament_name: string
  tournament_category: string
  sub_event_name: string
  hand_count: number
}

export function RecentAnalyses() {
  const [analyses, setAnalyses] = useState<DayWithData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentAnalyses()
  }, [])

  async function loadRecentAnalyses() {
    setLoading(true)
    try {
      // Get recent days that have hands (analyzed videos)
      const { data: daysData, error: daysError } = await supabase
        .from('days')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (daysError) throw daysError

      // Filter days that have hands and enrich with data
      const enrichedDays: DayWithData[] = []

      for (const day of daysData || []) {
        // Count hands
        const { count } = await supabase
          .from('hands')
          .select('*', { count: 'exact', head: true })
          .eq('day_id', day.id)

        if (count && count > 0) {
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

          enrichedDays.push({
            id: day.id,
            name: day.name,
            created_at: day.created_at,
            tournament_name: tournament?.name || 'Unknown Tournament',
            tournament_category: tournament?.category || 'Unknown',
            sub_event_name: subEvent?.name || 'Unknown Event',
            hand_count: count
          })
        }

        if (enrichedDays.length >= 3) break
      }

      setAnalyses(enrichedDays)
    } catch (error) {
      console.error('Error loading recent analyses:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-title-lg text-foreground">최근 분석 결과</h2>
            <p className="text-body-lg text-muted-foreground">Community에서 가장 많이 분석된 포커 영상을 확인하세요</p>
          </div>
          <div className="text-center py-12">
            <p className="text-body text-muted-foreground">Loading...</p>
          </div>
        </div>
      </section>
    )
  }

  if (analyses.length === 0) {
    return (
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-title-lg text-foreground">최근 분석 결과</h2>
            <p className="text-body-lg text-muted-foreground">Community에서 가장 많이 분석된 포커 영상을 확인하세요</p>
          </div>
          <div className="text-center py-12">
            <p className="text-body text-muted-foreground">아직 분석된 영상이 없습니다. Archive 페이지에서 영상을 추가하고 분석해보세요!</p>
            <Link href="/archive">
              <button className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                Archive로 이동
              </button>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground">최근 분석 결과</h2>
          <p className="text-muted-foreground">Community에서 가장 많이 분석된 포커 영상을 확인하세요</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {analyses.map((analysis) => (
            <Link key={analysis.id} href="/archive">
              <Card className="group overflow-hidden border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-purple-600/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="h-16 w-16 text-primary/40" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <span className="rounded-full bg-primary/90 px-2 py-1 text-xs font-medium text-primary-foreground">
                      {analysis.hand_count} 핸드
                    </span>
                    <span className="rounded-full bg-black/80 px-2 py-1 text-xs font-medium text-white">
                      {analysis.tournament_category}
                    </span>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="mb-2 line-clamp-2 font-semibold text-card-foreground group-hover:text-primary">
                    {analysis.tournament_name} - {analysis.sub_event_name}
                  </h3>
                  <p className="text-caption text-muted-foreground mb-2 line-clamp-1">
                    {analysis.name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(analysis.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
