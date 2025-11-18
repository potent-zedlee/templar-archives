"use client"

/**
 * Archive Main Panel - Flowbite Enhanced
 *
 * Flowbite 패턴을 활용한 개선:
 * - Card 스타일 개선
 * - Badge 컴포넌트 일관성
 * - 버튼 그룹 스타일 개선
 * - 접근성 개선
 */

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

    for (const tournament of tournaments) {
      for (const event of tournament.events || []) {
        const stream = event.streams?.find((s: Stream) => s.id === selectedDay)
        if (stream) {
          return stream as Stream
        }
      }
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

  // Flowbite moment filter buttons
  const momentFilters: { value: MomentFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'highlighted', label: 'Highlighted' },
    { value: 'big-pot', label: 'Big Pot' },
    { value: 'all-in', label: 'All-in' },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {!selectedDayData ? (
            /* Empty State - Flowbite Alert Style */
            <div className="flex flex-col items-center justify-center h-full min-h-[600px] py-16 px-4">
              <div className="w-full max-w-2xl p-8 text-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
                <div className="mb-6 flex justify-center">
                  <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Play className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">
                  Select a day
                </h3>

                <p className="text-base text-gray-600 dark:text-gray-400 mb-8">
                  Choose a tournament day from the list to view its video and hand history
                </p>

                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">Browse tournaments by category in the left sidebar</p>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">Expand tournaments and events to see available days</p>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">Click on a day to watch the video and explore hand history</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Day Info Card - Flowbite Card Style */}
              <Card className="p-5 md:p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3 w-full">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {selectedDayData.name}
                      </h1>
                      {/* Flowbite Badge Group */}
                      <div className="flex flex-wrap gap-2">
                        {selectedDayData.published_at && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(selectedDayData.published_at)}
                          </span>
                        )}
                        {selectedDayData.player_count !== undefined && selectedDayData.player_count > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                            <Users className="h-3.5 w-3.5" />
                            {selectedDayData.player_count} players
                          </span>
                        )}
                        {selectedDayData.video_source === "youtube" && selectedDayData.video_url && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-700">
                            <Play className="h-3.5 w-3.5" />
                            YouTube
                          </span>
                        )}
                        {(selectedDayData.video_file || selectedDayData.video_nas_path) && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 rounded-lg border border-amber-200 dark:border-amber-700">
                            <Play className="h-3.5 w-3.5" />
                            Local
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AI Analyze Button - Flowbite Primary Button */}
                    <Button
                      onClick={() => {
                        if (selectedDayData.video_url) {
                          openAnalyzeDialog(selectedDayData)
                        }
                      }}
                      disabled={!selectedDayData.video_url}
                      className={cn(
                        "w-full md:w-auto gap-2 font-semibold shadow-md hover:shadow-lg transition-all",
                        "bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-700 hover:to-gold-800",
                        "text-white focus:ring-4 focus:ring-gold-300 dark:focus:ring-gold-800",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
                      )}
                      title={!selectedDayData.video_url ? "영상 URL이 필요합니다" : ""}
                    >
                      <Sparkles className="h-5 w-5" />
                      AI 분석
                    </Button>
                  </div>

                  {selectedDayData.description && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {selectedDayData.description}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* People Section - Flowbite Card */}
              <Card className="p-5 md:p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        People
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Players in this session
                      </p>
                    </div>
                    {players.length > 0 && (
                      <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        {players.length} {players.length === 1 ? 'player' : 'players'}
                      </span>
                    )}
                  </div>
                  {playersLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="inline-flex items-center gap-3 px-6 py-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gold-600 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Loading players...</span>
                      </div>
                    </div>
                  ) : (
                    <PlayerCardList players={players} />
                  )}
                </div>
              </Card>

              {/* Moments Section - Flowbite Card with Button Group */}
              <Card className="p-5 md:p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Moments
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {filteredHands.length} {filteredHands.length === 1 ? 'hand' : 'hands'} found
                      </p>
                    </div>
                    {/* Flowbite Button Group */}
                    <div className="inline-flex rounded-lg shadow-sm" role="group">
                      {momentFilters.map((filter, index) => (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => setMomentFilter(filter.value)}
                          className={cn(
                            "px-4 py-2 text-sm font-medium transition-colors",
                            "focus:z-10 focus:ring-2 focus:ring-gold-400",
                            index === 0 && "rounded-l-lg",
                            index === momentFilters.length - 1 && "rounded-r-lg",
                            momentFilter === filter.value
                              ? "bg-gold-600 text-white hover:bg-gold-700 border border-gold-600"
                              : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ArchiveHandHistory onSeekToTime={handleSeekToTime} overrideHands={filteredHands} />
                </div>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
