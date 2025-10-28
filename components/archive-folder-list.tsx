"use client"

import { memo, useState } from "react"
import { ChevronRight, Play, Info, X, FileText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { BackgroundGradient } from "@/components/ui/background-gradient"
import { VideoPlayer } from "@/components/video-player"
import { cn } from "@/lib/utils"
import { FOLDER_COLORS } from "@/lib/constants/archive-colors"
import type { FolderItem } from "@/lib/types/archive"
import type { Tournament, SubEvent, Day } from "@/lib/types/archive"
import Image from "next/image"
import dynamic from "next/dynamic"
import { useArchiveData } from "@/app/(main)/archive/_components/ArchiveDataContext"

// Dynamic import for ArchiveHandHistory
const ArchiveHandHistory = dynamic(
  () => import("@/app/(main)/archive/_components/ArchiveHandHistory").then(mod => ({ default: mod.ArchiveHandHistory })),
  { ssr: false }
)

// Dynamic import for SingleHandInputPanel
const SingleHandInputPanel = dynamic(
  () => import("@/components/archive/single-hand-input-panel").then(mod => ({ default: mod.SingleHandInputPanel })),
  { ssr: false }
)

interface ArchiveFolderListProps {
  items: FolderItem[]
  onNavigate: (item: FolderItem) => void
  onSelectDay?: (dayId: string) => void
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
  const [showBatchPanel, setShowBatchPanel] = useState(false)
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

    // Format date as YYYY/MM/DD
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    }

    return (
      <div key={item.id} className="space-y-0 mb-3">
        <BackgroundGradient
          className="rounded-[22px]"
          containerClassName="p-[1px]"
          animate={false}
        >
          {/* Tournament Row */}
          <div
            className={cn(
              "group flex items-center gap-6 px-6 py-4 backdrop-blur-md bg-slate-950 rounded-[21px] border-0 shadow-xl hover:shadow-2xl transition-all duration-300 ease-out cursor-pointer relative overflow-hidden",
              "before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:pointer-events-none",
              isExpanded && "shadow-2xl ring-2 ring-blue-500/30"
            )}
            onClick={() => onNavigate(item)}
          >
          {/* Date */}
          <div className="w-24 flex-shrink-0 text-sm font-medium text-foreground/70 relative z-10">
            <div className="font-mono">{formatDate(tournament.start_date)}</div>
            <div className="font-mono text-xs">{formatDate(tournament.end_date)}</div>
          </div>

          {/* Logo */}
          <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center relative z-10">
            {(() => {
              const logoUrl = tournament.category_logo_url || tournament.category_logo
              return logoUrl ? (
                <div className="w-full h-full backdrop-blur-sm bg-white/10 dark:bg-black/10 rounded-lg p-2 border border-white/10 shadow-lg">
                  <Image
                    src={logoUrl}
                    alt={tournament.category}
                    width={56}
                    height={56}
                    className="object-contain w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-full h-full backdrop-blur-sm bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center text-sm font-bold text-foreground border border-white/10 shadow-lg">
                  {tournament.category.slice(0, 2).toUpperCase()}
                </div>
              )
            })()}
          </div>

          {/* Location */}
          <div className="w-32 flex-shrink-0 text-sm text-foreground/70 relative z-10">
            {tournament.city && tournament.country ? (
              <span className="font-medium">
                {tournament.city} <span className="text-foreground/40">/</span> {tournament.country}
              </span>
            ) : (
              tournament.location || "-"
            )}
          </div>

          {/* Tournament Name */}
          <div className="flex-1 min-w-0 font-bold text-xl text-foreground truncate relative z-10 tracking-tight">
            {tournament.name}
          </div>

          {/* Prize */}
          <div className="w-44 text-xl font-extrabold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent text-right relative z-10">
            {tournament.total_prize || "-"}
          </div>

          {/* Info Button */}
          <div className="flex-shrink-0 relative z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 border border-white/10 hover:border-white/20 hover:rotate-12 hover:scale-110 transition-all duration-300 shadow-lg"
              onClick={(e) => {
                e.stopPropagation()
                onShowInfo?.(item)
              }}
            >
              <Info className="h-4 w-4 text-foreground/80" />
            </Button>
          </div>
          </div>
        </BackgroundGradient>

        {/* SubEvents (if expanded) */}
        <AnimatePresence>
          {isExpanded && tournament.sub_events && tournament.sub_events.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-0 overflow-hidden"
            >
              {tournament.sub_events.map((subEvent) =>
                renderSubEvent(subEvent, tournament.id)
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add SubEvent Button (if expanded and no subevents) */}
        {isExpanded && (!tournament.sub_events || tournament.sub_events.length === 0) && isAdmin && onAddSubEvent && (
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

  const renderSubEvent = (subEvent: SubEvent, tournamentId: string) => {
    const item = items.find((i) => i.id === subEvent.id)
    const isExpanded = item?.isExpanded || false

    const subEventItem: FolderItem = {
      id: subEvent.id,
      name: subEvent.name,
      type: "subevent",
      data: subEvent,
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
      <div key={subEvent.id} className="space-y-0">
        {/* SubEvent Row */}
        <div
          className={cn(
            "group flex items-center gap-5 px-5 py-3 ml-6 mr-6 mb-2 backdrop-blur-md bg-purple-500/5 dark:bg-purple-500/5 hover:bg-purple-500/10 dark:hover:bg-purple-500/10 hover:scale-[1.015] active:scale-[0.99] rounded-lg border border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300 ease-out cursor-pointer relative overflow-hidden",
            "before:absolute before:inset-0 before:bg-gradient-to-r before:from-purple-500/15 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:pointer-events-none",
            isExpanded && "bg-purple-500/10 dark:bg-purple-500/10 shadow-xl ring-1 ring-purple-500/30"
          )}
          onClick={() => onNavigate(subEventItem)}
        >
          {/* Date */}
          <div className="w-24 flex-shrink-0 text-sm font-medium text-foreground/70 relative z-10">
            <div className="font-mono">{formatDate(subEvent.date)}</div>
          </div>

          {/* Event Number + Buy-in */}
          <div className="w-32 flex-shrink-0 text-sm font-medium text-foreground/70 relative z-10">
            {subEvent.event_number && <span className="text-purple-400 font-semibold">#{subEvent.event_number}</span>}
            {subEvent.event_number && subEvent.buy_in && <span className="text-foreground/30 mx-1">•</span>}
            {subEvent.buy_in && <span className="text-foreground/80">{subEvent.buy_in}</span>}
          </div>

          {/* SubEvent Name */}
          <div className="flex-1 min-w-0 text-lg font-semibold text-foreground truncate relative z-10">
            {subEvent.name}
          </div>

          {/* Prize */}
          <div className="w-44 text-lg font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent text-right relative z-10">
            {subEvent.total_prize || "-"}
          </div>

          {/* Info Button */}
          <div className="flex-shrink-0 relative z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 border border-white/10 hover:border-white/20 hover:rotate-12 hover:scale-110 transition-all duration-300 shadow-md"
              onClick={(e) => {
                e.stopPropagation()
                onShowInfo?.(subEventItem)
              }}
            >
              <Info className="h-3.5 w-3.5 text-foreground/70" />
            </Button>
          </div>
        </div>

        {/* Days (if expanded) */}
        <AnimatePresence>
          {isExpanded && subEvent.streams && subEvent.streams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-0 overflow-hidden"
            >
              {subEvent.streams.map((day) => renderDay(day, subEvent.id))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const renderDay = (day: Day, subEventId: string) => {
    const dayItem: FolderItem = {
      id: day.id,
      name: day.name,
      type: "day",
      data: day,
      level: 2,
      parentId: subEventId,
    }

    // Format date as YYYY/MM/DD
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    }

    const isExpanded = expandedDayId === day.id

    return (
      <div key={day.id} className="ml-12 mr-6 mb-1.5 space-y-2">
        {/* Day Card */}
        <BackgroundGradient
          className="rounded-[16px]"
          containerClassName="p-[1px]"
          animate={false}
        >
          <div
            className={cn(
              "group flex items-center gap-4 px-4 py-2.5 backdrop-blur-md bg-slate-950 rounded-[15px] border-0 shadow-md hover:shadow-lg transition-all duration-300 ease-out cursor-pointer relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-emerald-500/15 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:pointer-events-none",
              isExpanded && "ring-2 ring-emerald-500/30"
            )}
            onClick={() => onSelectDay?.(day.id)}
          >
        {/* Date */}
        <div className="w-20 flex-shrink-0 text-xs font-medium text-foreground/60 relative z-10">
          <div className="font-mono">{day.published_at ? formatDate(day.published_at) : "-"}</div>
        </div>

        {/* Video Icon */}
        <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center relative z-10">
          {day.video_source === "youtube" && day.video_url ? (
            <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 rounded shadow-lg flex items-center justify-center ring-1 ring-red-400/50">
              <Play className="h-3 w-3 text-white fill-white" />
            </div>
          ) : (day.video_file || day.video_nas_path) ? (
            <div className="w-full h-full bg-gradient-to-br from-amber-500 to-amber-600 rounded shadow-lg flex items-center justify-center ring-1 ring-amber-400/50">
              <Play className="h-3 w-3 text-white fill-white" />
            </div>
          ) : null}
        </div>

        {/* Day Name */}
        <div className="flex-1 min-w-0 text-base font-medium text-foreground truncate relative z-10">
          {day.name}
        </div>

        {/* Player count */}
        <div className="w-40 text-xs text-right text-foreground/60 relative z-10">
          {day.player_count !== undefined && day.player_count > 0
            ? <span className="font-medium text-emerald-400">{day.player_count} players</span>
            : <span className="text-foreground/40">-</span>}
        </div>

        {/* Analyze Button - High Templar only, shown when day is selected */}
        {isAdmin && isExpanded && (
          <div className="flex-shrink-0 relative z-10">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 backdrop-blur-md border hover:rotate-12 hover:scale-110 transition-all duration-300 shadow-sm",
                showBatchPanel
                  ? "bg-emerald-500/20 dark:bg-emerald-500/20 hover:bg-emerald-500/30 dark:hover:bg-emerald-500/30 border-emerald-500/30 hover:border-emerald-500/50"
                  : "bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 border-white/10 hover:border-white/20"
              )}
              onClick={(e) => {
                e.stopPropagation()
                setShowBatchPanel(!showBatchPanel)
              }}
            >
              <FileText className="h-3 w-3 text-foreground/60" />
            </Button>
          </div>
        )}

        {/* Info Button */}
        <div className="flex-shrink-0 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 border border-white/10 hover:border-white/20 hover:rotate-12 hover:scale-110 transition-all duration-300 shadow-sm"
            onClick={(e) => {
              e.stopPropagation()
              onShowInfo?.(dayItem)
            }}
          >
            <Info className="h-3 w-3 text-foreground/60" />
          </Button>
        </div>
          </div>
        </BackgroundGradient>

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
                {/* Video Player + Batch Panel Grid */}
                <div className={cn(
                  "grid gap-4",
                  showBatchPanel ? "grid-cols-[70%_30%]" : "grid-cols-1"
                )}>
                  {/* Video Player */}
                  <div>
                    <VideoPlayer day={day} seekTime={seekTime} />
                  </div>

                  {/* Single Hand Input Panel (conditionally shown) */}
                  {showBatchPanel && (
                    <SingleHandInputPanel
                      streamId={day.id}
                      streamName={day.name}
                      onSuccess={() => {
                        setShowBatchPanel(false)
                      }}
                      onClose={() => setShowBatchPanel(false)}
                    />
                  )}
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
                      setShowBatchPanel(false)
                      onSelectDay?.(day.id)
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
    <div className="space-y-0">
      {items
        .filter((item) => item.type === "tournament")
        .map((item) => renderTournament(item))}
    </div>
  )
})
