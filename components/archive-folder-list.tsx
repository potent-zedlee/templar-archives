"use client"

import { memo } from "react"
import { ChevronRight, Play, Info, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCategoryByAlias } from "@/lib/tournament-categories"
import type { FolderItem } from "@/lib/types/archive"
import type { Tournament, SubEvent, Day } from "@/lib/types/archive"
import Image from "next/image"

interface ArchiveFolderListProps {
  items: FolderItem[]
  onNavigate: (item: FolderItem) => void
  onSelectDay?: (dayId: string) => void
  loading?: boolean
  // Context menu actions
  onShowInfo?: (item: FolderItem) => void
  onAddTournament?: () => void
  isAdmin?: boolean
}

export const ArchiveFolderList = memo(function ArchiveFolderList({
  items,
  onNavigate,
  onSelectDay,
  loading = false,
  onShowInfo,
  onAddTournament,
  isAdmin = false,
}: ArchiveFolderListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium mb-2">No tournaments yet</p>
        <p className="text-sm mb-6">Get started by creating your first tournament</p>

        {isAdmin && onAddTournament && (
          <Button
            variant="default"
            size="lg"
            onClick={onAddTournament}
            className="mx-auto shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Tournament
          </Button>
        )}
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
      <div key={item.id} className="space-y-0">
        {/* Tournament Row */}
        <div
          className={cn(
            "group flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/20",
            isExpanded && "bg-muted/20"
          )}
          onClick={() => onNavigate(item)}
        >
          {/* Date */}
          <div className="w-20 flex-shrink-0 text-xs text-muted-foreground">
            {formatDate(tournament.start_date)}
          </div>

          {/* Logo */}
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
            {(() => {
              const logoUrl = tournament.category_logo || getCategoryByAlias(tournament.category)?.logoUrl
              return logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={tournament.category}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 rounded flex items-center justify-center text-xs font-bold text-primary">
                  {tournament.category.slice(0, 2).toUpperCase()}
                </div>
              )
            })()}
          </div>

          {/* Location */}
          <div className="w-28 flex-shrink-0 text-xs text-muted-foreground">
            {tournament.city && tournament.country ? (
              <>
                {tournament.city} / {tournament.country}
              </>
            ) : (
              tournament.location || "-"
            )}
          </div>

          {/* Tournament Name */}
          <div className="flex-1 min-w-0 font-semibold text-lg truncate">
            {tournament.name}
          </div>

          {/* Prize */}
          <div className="w-40 text-lg font-semibold text-right">
            {tournament.total_prize || "-"}
          </div>

          {/* Info Button */}
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-muted/20 hover:bg-muted/40"
              onClick={(e) => {
                e.stopPropagation()
                onShowInfo?.(item)
              }}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SubEvents (if expanded) */}
        {isExpanded && tournament.sub_events && tournament.sub_events.length > 0 && (
          <div className="space-y-0">
            {tournament.sub_events.map((subEvent) =>
              renderSubEvent(subEvent, tournament.id)
            )}
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
            "group flex items-center gap-3 pl-24 pr-4 py-2 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/20 border-dashed",
            isExpanded && "bg-muted/20"
          )}
          onClick={() => onNavigate(subEventItem)}
        >
          {/* Date */}
          <div className="w-20 flex-shrink-0 text-xs text-muted-foreground">
            {formatDate(subEvent.date)}
          </div>

          {/* Event Number + Buy-in */}
          <div className="w-28 flex-shrink-0 text-xs text-muted-foreground">
            {subEvent.event_number && `#${subEvent.event_number}`}
            {subEvent.event_number && subEvent.buy_in && ' '}
            {subEvent.buy_in}
          </div>

          {/* SubEvent Name */}
          <div className="flex-1 min-w-0 text-lg truncate">
            {subEvent.name}
          </div>

          {/* Prize */}
          <div className="w-40 text-lg font-semibold text-right">
            {subEvent.total_prize || "-"}
          </div>

          {/* Info Button */}
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-muted/20 hover:bg-muted/40"
              onClick={(e) => {
                e.stopPropagation()
                onShowInfo?.(subEventItem)
              }}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Days (if expanded) */}
        {isExpanded && subEvent.days && subEvent.days.length > 0 && (
          <div className="space-y-0">
            {subEvent.days.map((day) => renderDay(day, subEvent.id))}
          </div>
        )}
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

    return (
      <div
        key={day.id}
        className="group flex items-center gap-3 pl-36 pr-4 py-2 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/20 border-dashed"
        onClick={() => onSelectDay?.(day.id)}
      >
        {/* Date */}
        <div className="w-20 flex-shrink-0 text-xs text-muted-foreground">
          {day.published_at ? formatDate(day.published_at) : "-"}
        </div>

        {/* Video Icon */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          {day.video_source === "youtube" && day.video_url ? (
            <div className="w-full h-full bg-red-600 rounded flex items-center justify-center">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
          ) : (day.video_file || day.video_nas_path) ? (
            <div className="w-full h-full bg-yellow-500 rounded flex items-center justify-center">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
          ) : null}
        </div>

        {/* Day Name */}
        <div className="flex-1 min-w-0 text-base truncate">
          {day.name}
        </div>

        {/* Player count */}
        <div className="w-40 text-xs text-right text-muted-foreground">
          {day.player_count !== undefined && day.player_count > 0
            ? `${day.player_count} players in video`
            : "-"}
        </div>

        {/* Info Button */}
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-muted/20 hover:bg-muted/40"
            onClick={(e) => {
              e.stopPropagation()
              onShowInfo?.(dayItem)
            }}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Table Body */}
      <div className="divide-y divide-border/50">
        {items
          .filter((item) => item.type === "tournament")
          .map((item) => renderTournament(item))}
      </div>
    </div>
  )
})
