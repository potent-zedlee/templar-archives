"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { ArchiveHandHistory } from "./ArchiveHandHistory"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { useArchiveUIStore } from "@/stores/archive-ui-store"
import { useArchiveData } from "./ArchiveDataContext"
import { useStreamPlayersQuery } from "@/lib/queries/archive-queries"
import { PlayerCardList } from "@/components/player-card"
import { useMemo, useState } from "react"
import { Play, Calendar, Users, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Stream } from "@/lib/supabase"
import type { MomentFilter } from "@/lib/hand-filters"
import { filterHandsByMoment } from "@/lib/hand-filters"

interface ArchiveMainPanelProps {
  seekTime: number | null
  onSeekToTime: (seconds: number) => void
}

export function ArchiveMainPanel({ seekTime, onSeekToTime }: ArchiveMainPanelProps) {
  const { selectedDay } = useArchiveDataStore()
  const { openAnalyzeDialog } = useArchiveUIStore()
  const { tournaments, hands } = useArchiveData()

  // Moments filter state
  const [momentFilter, setMomentFilter] = useState<MomentFilter>('all')

  // Find selected day data
  const selectedDayData = useMemo((): Stream | null => {
    if (!selectedDay) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ArchiveMainPanel] No selectedDay')
      }
      return null
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[ArchiveMainPanel] Looking for day:', selectedDay)
      console.log('[ArchiveMainPanel] Tournaments count:', tournaments.length)
    }

    for (const tournament of tournaments) {
      for (const subEvent of tournament.sub_events || []) {
        const day = subEvent.days?.find((d: Stream) => d.id === selectedDay)
        if (day) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ArchiveMainPanel] Found day:', day.name, 'video_url:', day.video_url)
          }
          return day as Stream
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[ArchiveMainPanel] Day not found!')
    }
    return null
  }, [selectedDay, tournaments])

  // Fetch players for selected day
  const { data: players = [], isLoading: playersLoading } = useStreamPlayersQuery(selectedDay)

  // Filter hands by moment
  const filteredHands = useMemo(() => {
    return filterHandsByMoment(hands, momentFilter)
  }, [hands, momentFilter])

  const handleSeekToTime = (timeString: string) => {
    // Parse time string "MM:SS" to seconds
    const parts = timeString.split(':')
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10)
      const seconds = parseInt(parts[1], 10)
      onSeekToTime(minutes * 60 + seconds)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {!selectedDayData ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[600px] py-16">
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl rounded-full" />
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-500 p-8 rounded-2xl shadow-xl">
                  <Play className="h-16 w-16 text-white" />
                </div>
              </div>

              <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                Select a Day
              </h1>

              <p className="text-lg text-muted-foreground text-center max-w-lg mb-12">
                Choose a tournament day from the list to view its video and hand history
              </p>

              <div className="w-full max-w-2xl space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-foreground/80">Browse tournaments by category in the left sidebar</p>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                  <div className="w-2 h-2 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-foreground/80">Expand tournaments and events to see available days</p>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-pink-500/5 border border-pink-500/20">
                  <div className="w-2 h-2 rounded-full bg-pink-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-foreground/80">Click on a day to watch the video and explore hand history</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Day Info Card */}
              <Card className="p-8 backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl">
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0 space-y-3">
                      <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {selectedDayData.name}
                      </h1>
                      <div className="flex flex-wrap gap-2.5">
                        {selectedDayData.published_at && (
                          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(selectedDayData.published_at)}
                          </Badge>
                        )}
                        {selectedDayData.player_count !== undefined && selectedDayData.player_count > 0 && (
                          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
                            <Users className="h-3.5 w-3.5" />
                            {selectedDayData.player_count} players
                          </Badge>
                        )}
                        {selectedDayData.video_source === "youtube" && selectedDayData.video_url && (
                          <Badge variant="destructive" className="gap-1.5 px-3 py-1.5 text-xs font-medium shadow-sm">
                            <Play className="h-3.5 w-3.5" />
                            YouTube
                          </Badge>
                        )}
                        {(selectedDayData.video_file || selectedDayData.video_nas_path) && (
                          <Badge className="gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 shadow-sm">
                            <Play className="h-3.5 w-3.5" />
                            Local
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Analyze Button */}
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => {
                        console.log('============================================')
                        console.log('[ArchiveMainPanel] AI 분석 버튼 클릭')
                        console.log('[ArchiveMainPanel] selectedDayData:', selectedDayData)
                        console.log('[ArchiveMainPanel] video_url:', selectedDayData.video_url)
                        console.log('============================================')

                        if (selectedDayData.video_url) {
                          console.log('[ArchiveMainPanel] Opening analyze dialog...')
                          openAnalyzeDialog(selectedDayData)
                          console.log('[ArchiveMainPanel] openAnalyzeDialog called')
                        } else {
                          console.error('[ArchiveMainPanel] No video_url, button should be disabled!')
                        }
                      }}
                      disabled={!selectedDayData.video_url}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold px-6"
                      title={!selectedDayData.video_url ? "영상 URL이 필요합니다" : ""}
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      AI 분석
                    </Button>
                  </div>

                  {selectedDayData.description && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-muted-foreground leading-relaxed">{selectedDayData.description}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* People Section */}
              <section>
                <Card className="p-8 backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                          People
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Players in this session</p>
                      </div>
                      {players.length > 0 && (
                        <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
                          {players.length} {players.length === 1 ? 'player' : 'players'}
                        </Badge>
                      )}
                    </div>
                    {playersLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-block p-4 rounded-xl bg-muted/20 animate-pulse">
                          <p className="text-muted-foreground">Loading players...</p>
                        </div>
                      </div>
                    ) : (
                      <PlayerCardList players={players} />
                    )}
                  </div>
                </Card>
              </section>

              {/* Moments Section */}
              <section>
                <Card className="p-8 backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50 flex-wrap gap-4">
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                          Moments
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {filteredHands.length} {filteredHands.length === 1 ? 'hand' : 'hands'} found
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant={momentFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMomentFilter('all')}
                          className="font-medium"
                        >
                          All
                        </Button>
                        <Button
                          variant={momentFilter === 'highlighted' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMomentFilter('highlighted')}
                          className="font-medium"
                        >
                          Highlighted
                        </Button>
                        <Button
                          variant={momentFilter === 'big-pot' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMomentFilter('big-pot')}
                          className="font-medium"
                        >
                          Big Pot
                        </Button>
                        <Button
                          variant={momentFilter === 'all-in' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMomentFilter('all-in')}
                          className="font-medium"
                        >
                          All-in
                        </Button>
                      </div>
                    </div>
                    <ArchiveHandHistory onSeekToTime={handleSeekToTime} overrideHands={filteredHands} />
                  </div>
                </Card>
              </section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
