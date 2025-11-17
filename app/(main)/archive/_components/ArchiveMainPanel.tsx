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
import { cn } from "@/lib/utils"
import type { Stream } from "@/lib/supabase"
import type { MomentFilter } from "@/lib/hand-filters"
import { filterHandsByMoment } from "@/lib/hand-filters"

interface ArchiveMainPanelProps {
  onSeekToTime: (seconds: number) => void
}

export function ArchiveMainPanel({ onSeekToTime }: ArchiveMainPanelProps) {
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
      for (const event of tournament.events || []) {
        const stream = event.streams?.find((s: Stream) => s.id === selectedDay)
        if (stream) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ArchiveMainPanel] Found stream:', stream.name, 'video_url:', stream.video_url)
          }
          return stream as Stream
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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {!selectedDayData ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[600px] py-16 px-4">
              <div className="mb-10">
                <div className="bg-blue-500 dark:bg-blue-600 p-8 rounded-lg shadow-md">
                  <Play className="h-16 w-16 text-white" />
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Select a day
              </h1>

              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 text-center max-w-lg mb-12">
                Choose a tournament day from the list to view its video and hand history
              </p>

              <div className="w-full max-w-2xl space-y-3">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Browse tournaments by category in the left sidebar</p>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Expand tournaments and events to see available days</p>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">Click on a day to watch the video and explore hand history</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Day Info Card */}
              <Card className="p-4 md:p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-lg">
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-6">
                    <div className="flex-1 min-w-0 space-y-3 w-full">
                      <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {selectedDayData.name}
                      </h1>
                      <div className="flex flex-wrap gap-2">
                        {selectedDayData.published_at && (
                          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-normal bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(selectedDayData.published_at)}
                          </Badge>
                        )}
                        {selectedDayData.player_count !== undefined && selectedDayData.player_count > 0 && (
                          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-normal bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md">
                            <Users className="h-3.5 w-3.5" />
                            {selectedDayData.player_count} players
                          </Badge>
                        )}
                        {selectedDayData.video_source === "youtube" && selectedDayData.video_url && (
                          <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs font-normal bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md">
                            <Play className="h-3.5 w-3.5" />
                            YouTube
                          </Badge>
                        )}
                        {(selectedDayData.video_file || selectedDayData.video_nas_path) && (
                          <Badge className="gap-1.5 px-3 py-1 text-xs font-normal bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-md">
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
                      className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold px-6 rounded-lg text-white"
                      title={!selectedDayData.video_url ? "영상 URL이 필요합니다" : ""}
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      AI 분석
                    </Button>
                  </div>

                  {selectedDayData.description && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{selectedDayData.description}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* People Section */}
              <section>
                <Card className="p-4 md:p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-lg">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                          People
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Players in this session</p>
                      </div>
                      {players.length > 0 && (
                        <Badge variant="secondary" className="text-sm font-normal px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md">
                          {players.length} {players.length === 1 ? 'player' : 'players'}
                        </Badge>
                      )}
                    </div>
                    {playersLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-block p-4 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse">
                          <p className="text-gray-600 dark:text-gray-400">Loading players...</p>
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
                <Card className="p-4 md:p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-lg">
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 gap-4">
                      <div>
                        <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                          Moments
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {filteredHands.length} {filteredHands.length === 1 ? 'hand' : 'hands'} found
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant={momentFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMomentFilter('all')}
                          className={cn(
                            "font-medium rounded-md",
                            momentFilter === 'all' && "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                          )}
                        >
                          All
                        </Button>
                        <Button
                          variant={momentFilter === 'highlighted' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMomentFilter('highlighted')}
                          className={cn(
                            "font-medium rounded-md",
                            momentFilter === 'highlighted' && "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                          )}
                        >
                          Highlighted
                        </Button>
                        <Button
                          variant={momentFilter === 'big-pot' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMomentFilter('big-pot')}
                          className={cn(
                            "font-medium rounded-md",
                            momentFilter === 'big-pot' && "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                          )}
                        >
                          Big Pot
                        </Button>
                        <Button
                          variant={momentFilter === 'all-in' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMomentFilter('all-in')}
                          className={cn(
                            "font-medium rounded-md",
                            momentFilter === 'all-in' && "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                          )}
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
