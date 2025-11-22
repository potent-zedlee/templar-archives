"use client"

import { memo, useState } from "react"
import { ChevronRight, Play, Info, X, FileText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { BackgroundGradient } from "@/components/ui/background-gradient"
import { VideoPlayer } from "@/components/VideoPlayer"
import { cn } from "@/lib/utils"
import { FOLDER_COLORS } from "@/lib/constants/archive-colors"
import type { FolderItem } from "@/lib/types/archive"
import type { Tournament, Event, Stream } from "@/lib/types/archive"
import Image from "next/image"
import dynamic from "next/dynamic"
import { useArchiveData } from "@/app/(main)/archive/_components/ArchiveDataContext"

// Dynamic import for ArchiveHandHistory
const ArchiveHandHistory = dynamic(
  () => import("@/app/(main)/archive/_components/ArchiveHandHistory").then(mod => ({ default: mod.ArchiveHandHistory })),
  { ssr: false }
)

interface ArchiveFolderListProps {
  items: FolderItem[]
  onNavigate: (item: FolderItem) => void
  onSelectDay?: (streamId: string) => void
  expandedDayId: string | null
  seekTime: number | null
  onSeekToTime: (timeString: string) => void
  loading?: boolean
  // Context menu actions
  onShowInfo?: (item: FolderItem) => void
  onAddSubEvent?: (tournamentId: string) => void
  isAdmin?: boolean
}

export const ArchiveFolderList = memo(function ArchiveFolderList({
  items,
  onNavigate,
  onSelectDay,
  expandedDayId,
  seekTime,
  onSeekToTime,
  loading = false,
  onShowInfo,
  onAddSubEvent,
  isAdmin = false,
}: ArchiveFolderListProps) {
  const { hands } = useArchiveData()

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-16 backdrop-blur-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 dark:from-black/5 dark:via-black/10 dark:to-black/5 rounded-xl border border-white/10 animate-pulse overflow-hidden relative"
          >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 px-6">
        <div className="inline-block p-8 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl">
          <div className="mb-4 text-6xl opacity-20">🏆</div>
          <p className="text-xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            No tournaments yet
          </p>
          <p className="text-sm text-muted-foreground/80">
            Use the toolbar above to add tournaments
          </p>
        </div>
      </div>
    )
  }

  const renderTournament = (item: FolderItem) => {
    const tournament = item.data as Tournament
    const isExpanded = item.isExpanded || false

    // Extract year from start_date
    const year = new Date(tournament.start_date).getFullYear()

    // Calculate total hands across all events
    const totalHands = tournament.events?.reduce((sum, event) => {
      return sum + (event.streams?.reduce((streamSum, stream) => {
        return streamSum + (hands.filter(h => h.stream_id === stream.id).length || 0)
      }, 0) || 0)
    }, 0) || 0

    return (
      <div key={item.id} className="space-y-0 mb-6">
        {/* Tournament Card - Postmodern Design */}
        <div
          className={cn(
            "card-postmodern hover-3d p-6 cursor-pointer",
            isExpanded && "ring-2 ring-gold-400"
          )}
          onClick={() => onNavigate(item)}
        >
          {/* Header: 모바일 세로 배치, 데스크톱 비대칭 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 md:gap-6">
            {/* Year Badge: 모바일에서 작게 */}
            <div className="year-badge w-full md:w-auto md:min-w-[120px]">
              <span className="text-display-sm md:text-display">{year}</span>
            </div>

            {/* Tournament Info */}
            <div className="space-y-2">
              <h2 className="text-heading-lg text-gold-400">{tournament.name}</h2>
              <div className="flex gap-3 items-center flex-wrap">
                {tournament.city && tournament.country && (
                  <>
                    <span className="text-caption text-gold-300">
                      {tournament.city}, {tournament.country}
                    </span>
                    <span className="text-gold-700">•</span>
                  </>
                )}
                {tournament.category && (
                  <span className="text-caption text-gold-300">{tournament.category}</span>
                )}
                {tournament.total_prize && (
                  <>
                    <span className="text-gold-700">•</span>
                    <span className="text-caption text-gold-400 font-bold">{tournament.total_prize}</span>
                  </>
                )}
              </div>
            </div>

            {/* Logo */}
            {(() => {
              const logoUrl = tournament.category_logo_url || tournament.category_logo
              return logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={tournament.name}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-contain offset-down border-2 border-gold-700 bg-black-200 p-2"
                />
              ) : (
                <div className="w-20 h-20 offset-down border-2 border-gold-700 bg-gradient-to-br from-gold-500/20 to-gold-700/20 flex items-center justify-center text-gold-400 font-bold text-lg">
                  {tournament.category.slice(0, 2).toUpperCase()}
                </div>
              )
            })()}
          </div>

          {/* Stats Grid: 모바일 1컬럼, 데스크톱 2:3 비대칭 */}
          {(totalHands > 0 || (tournament.events && tournament.events.length > 0)) && (
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4 md:gap-6 mt-6">
              {/* Left: Statistics */}
              <div className="stats-card space-y-4">
                <div className="stat-item">
                  <span className="text-caption text-gold-300">총 핸드</span>
                  <span className="text-heading text-mono text-gold-400">{totalHands}</span>
                </div>
                <div className="stat-item">
                  <span className="text-caption text-gold-300">이벤트</span>
                  <span className="text-heading text-mono text-gold-400">{tournament.events?.length || 0}</span>
                </div>
              </div>

              {/* Right: Events (있으면 표시) */}
              {tournament.events && tournament.events.length > 0 && (
                <div className="sub-event-list space-y-1">
                  {tournament.events.slice(0, 3).map((event, idx) => (
                    <div
                      key={event.id}
                      className="card-minimal flex items-center gap-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate({
                          id: event.id,
                          name: event.name,
                          type: "event",
                          data: event,
                          level: 1,
                          parentId: tournament.id,
                        })
                      }}
                    >
                      <span className="text-caption text-gold-500 font-bold min-w-[2rem]">#{idx + 1}</span>
                      <div className="flex-1">
                        <h3 className="text-heading-sm text-gold-400">{event.name}</h3>
                        <span className="text-caption text-gold-300">{event.streams?.length || 0} Streams</span>
                      </div>
                    </div>
                  ))}
                  {tournament.events.length > 3 && (
                    <div className="text-caption text-gold-600 text-center py-2">
                      +{tournament.events.length - 3} more events
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info Button */}
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 btn-ghost"
              onClick={(e) => {
                e.stopPropagation()
                onShowInfo?.(item)
              }}
            >
              <Info className="h-4 w-4 text-gold-400" />
            </Button>
          </div>
        </div>

        {/* Events (if expanded) */}
        <AnimatePresence>
          {isExpanded && tournament.events && tournament.events.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-0 overflow-hidden"
            >
              {tournament.events.map((event) =>
                renderEvent(event, tournament.id)
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Event Button (if expanded and no events) */}
        {isExpanded && (!tournament.events || tournament.events.length === 0) && isAdmin && onAddSubEvent && (
          <div className="px-6 py-3 ml-6 mr-6 mb-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full backdrop-blur-md bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 hover:border-purple-500/50 text-foreground font-medium transition-all duration-300"
              onClick={(e) => {
                e.stopPropagation()
                onAddSubEvent(tournament.id)
              }}
            >
              <ChevronRight className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderEvent = (event: Event, tournamentId: string) => {
    const item = items.find((i) => i.id === event.id)
    const isExpanded = item?.isExpanded || false

    const eventItem: FolderItem = {
      id: event.id,
      name: event.name,
      type: "event",
      data: event,
      level: 1,
      isExpanded,
      parentId: tournamentId,
    }

    // Format date as YYYY/MM/DD
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    }

    return (
      <div key={event.id} className="space-y-0">
        {/* Event Row */}
        <div
          className={cn(
            "group flex items-center gap-5 px-5 py-3 ml-6 mr-6 mb-2 backdrop-blur-md bg-purple-500/5 dark:bg-purple-500/5 hover:bg-purple-500/10 dark:hover:bg-purple-500/10 hover:scale-[1.015] active:scale-[0.99] rounded-lg border border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300 ease-out cursor-pointer relative overflow-hidden",
            "before:absolute before:inset-0 before:bg-gradient-to-r before:from-purple-500/15 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:pointer-events-none",
            isExpanded && "bg-purple-500/10 dark:bg-purple-500/10 shadow-xl ring-1 ring-purple-500/30"
          )}
          onClick={() => onNavigate(eventItem)}
        >
          {/* Date */}
          <div className="w-24 flex-shrink-0 text-sm font-medium text-foreground/70 relative z-10">
            <div className="font-mono">{formatDate(event.date)}</div>
          </div>

          {/* Event Number + Buy-in */}
          <div className="w-32 flex-shrink-0 text-sm font-medium text-foreground/70 relative z-10">
            {event.event_number && <span className="text-purple-400 font-semibold">#{event.event_number}</span>}
            {event.event_number && event.buy_in && <span className="text-foreground/30 mx-1">•</span>}
            {event.buy_in && <span className="text-foreground/80">{event.buy_in}</span>}
          </div>

          {/* Event Name */}
          <div className="flex-1 min-w-0 text-lg font-semibold text-foreground truncate relative z-10">
            {event.name}
          </div>

          {/* Prize */}
          <div className="w-44 text-lg font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent text-right relative z-10">
            {event.total_prize || "-"}
          </div>

          {/* Info Button */}
          <div className="flex-shrink-0 relative z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 border border-white/10 hover:border-white/20 hover:rotate-12 hover:scale-110 transition-all duration-300 shadow-md"
              onClick={(e) => {
                e.stopPropagation()
                onShowInfo?.(eventItem)
              }}
            >
              <Info className="h-3.5 w-3.5 text-foreground/70" />
            </Button>
          </div>
        </div>

        {/* Streams (if expanded) */}
        <AnimatePresence>
          {isExpanded && event.streams && event.streams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-0 overflow-hidden"
            >
              {event.streams.map((stream) => renderStream(stream, event.id))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const renderStream = (stream: Stream, eventId: string) => {
    const streamItem: FolderItem = {
      id: stream.id,
      name: stream.name,
      type: "stream",
      data: stream,
      level: 2,
      parentId: eventId,
    }

    // Format date as YYYY/MM/DD
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const dayNum = String(date.getDate()).padStart(2, '0')
      return `${year}/${month}/${dayNum}`
    }

    const isExpanded = expandedDayId === stream.id

    // Calculate hand count for this stream
    const streamHandCount = hands.filter(h => h.stream_id === stream.id).length

    // Extract day number from name (e.g., "Day 1A" -> 1)
    const dayNumberMatch = stream.name.match(/Day (\d+)/i)
    const dayNumber = dayNumberMatch ? dayNumberMatch[1] : '?'

    return (
      <div key={stream.id} className="ml-12 mr-6 mb-3 space-y-2">
        {/* Stream Card - Postmodern Design */}
        <div
          className={cn(
            "card-postmodern hover-3d p-5 cursor-pointer relative",
            isExpanded && "ring-2 ring-gold-400"
          )}
          onClick={() => onSelectDay?.(stream.id)}
        >
          {/* Day Badge */}
          <div className="day-badge mb-4">
            <span className="text-display-sm text-gold-400">DAY {dayNumber}</span>
          </div>

          {/* Stream Info */}
          <div className="space-y-2 mb-4">
            <h3 className="text-heading text-gold-400">{stream.name}</h3>
            <div className="flex gap-3 items-center flex-wrap">
              {stream.published_at && (
                <>
                  <span className="text-caption text-gold-300">{formatDate(stream.published_at)}</span>
                  <span className="text-gold-700">•</span>
                </>
              )}
              {stream.player_count !== undefined && stream.player_count > 0 && (
                <>
                  <span className="text-caption text-gold-300">{stream.player_count} Players</span>
                  <span className="text-gold-700">•</span>
                </>
              )}
              {stream.video_source && (
                <span className="text-caption text-gold-400 font-bold uppercase">{stream.video_source}</span>
              )}
            </div>
          </div>

          {/* Hand Progress */}
          {streamHandCount > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-caption text-gold-300">핸드 진행률</span>
                <span className="text-mono text-gold-400 font-bold">{streamHandCount}</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, (streamHandCount / 500) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions: 모바일 세로 배치, 데스크톱 가로 배치 */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-3 mt-6">
            {stream.video_url && (
              <a
                href={stream.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full md:w-auto inline-flex items-center justify-center gap-2 no-underline-animation"
                onClick={(e) => e.stopPropagation()}
              >
                <Play className="h-4 w-4" />
                YouTube
              </a>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelectDay?.(stream.id)
              }}
              className="btn-secondary w-full md:w-auto inline-flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              핸드 보기 ({streamHandCount})
            </button>
          </div>

          {/* Info Button */}
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 btn-ghost"
              onClick={(e) => {
                e.stopPropagation()
                onShowInfo?.(streamItem)
              }}
            >
              <Info className="h-3.5 w-3.5 text-gold-400" />
            </Button>
          </div>
        </div>

        {/* Expanded Content - Video Player + Hand History */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-6 space-y-6 backdrop-blur-xl bg-slate-950/95 rounded-xl border border-white/20 shadow-2xl">
                {/* Video Player */}
                <div>
                  <VideoPlayer day={stream} seekTime={seekTime} />
                </div>

                {/* Hand History */}
                <div className="max-h-[600px] overflow-y-auto">
                  <ArchiveHandHistory
                    onSeekToTime={onSeekToTime}
                  />
                </div>

                {/* Close Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectDay?.(stream.id)
                    }}
                    className="backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-red-500/20 border-white/20 hover:border-red-500/40 text-foreground hover:text-red-400 shadow-lg transition-all duration-300"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-0">
        {items
          .filter((item) => item.type === "tournament")
          .map((item) => renderTournament(item))}
      </div>

    </>
  )
})
