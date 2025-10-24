"use client"

import { memo } from "react"
import { ChevronRight, Play, Info, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

    return (
      <div key={item.id} className="space-y-0">
        {/* Tournament Row */}
        <div
          className={cn(
            "group flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50",
            isExpanded && "bg-muted/30"
          )}
          onClick={() => onNavigate(item)}
        >
          {/* Date */}
          <div className="w-24 flex-shrink-0 text-sm text-muted-foreground">
            {new Date(tournament.start_date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </div>

          {/* Expand Icon */}
          <div className="flex-shrink-0">
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </div>

          {/* Logo */}
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
            {tournament.category_logo ? (
              <Image
                src={tournament.category_logo}
                alt={tournament.category}
                width={48}
                height={48}
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full bg-primary/10 rounded flex items-center justify-center text-xs font-bold text-primary">
                {tournament.category.slice(0, 2)}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="w-32 flex-shrink-0 text-sm text-muted-foreground">
            {tournament.city && tournament.country ? (
              <>
                {tournament.city} / {tournament.country}
              </>
            ) : (
              tournament.location || "-"
            )}
          </div>

          {/* Tournament Name */}
          <div className="flex-1 min-w-0 font-semibold text-base truncate">
            {tournament.name}
          </div>

          {/* Prize (empty for tournament level) */}
          <div className="w-32 text-sm text-right text-muted-foreground">
            -
          </div>

          {/* Info Button */}
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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

    return (
      <div key={subEvent.id} className="space-y-0">
        {/* SubEvent Row */}
        <div
          className={cn(
            "group flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50 border-dashed",
            isExpanded && "bg-muted/30"
          )}
          onClick={() => onNavigate(subEventItem)}
        >
          {/* Date */}
          <div className="w-24 flex-shrink-0 text-sm text-muted-foreground">
            {new Date(subEvent.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </div>

          {/* Expand Icon + Indent */}
          <div className="flex-shrink-0 pl-4">
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </div>

          {/* Logo (empty) */}
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
            {subEvent.event_number && (
              <div className="text-xs font-semibold text-muted-foreground bg-muted rounded px-2 py-1">
                #{subEvent.event_number}
              </div>
            )}
          </div>

          {/* Buy-in */}
          <div className="w-32 flex-shrink-0 text-sm text-muted-foreground">
            {subEvent.buy_in || "-"}
          </div>

          {/* SubEvent Name */}
          <div className="flex-1 min-w-0 text-base truncate">
            {subEvent.name}
          </div>

          {/* Prize */}
          <div className="w-32 text-sm text-right font-semibold">
            {subEvent.total_prize || "-"}
          </div>

          {/* Info Button */}
          <div className="flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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

    return (
      <div
        key={day.id}
        className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50 border-dashed"
        onClick={() => onSelectDay?.(day.id)}
      >
        {/* Date */}
        <div className="w-24 flex-shrink-0 text-sm text-muted-foreground">
          {day.published_at
            ? new Date(day.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : "-"}
        </div>

        {/* Indent (no expand icon for day) */}
        <div className="flex-shrink-0 pl-8">
          {/* Empty space */}
        </div>

        {/* YouTube Icon */}
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
          {day.video_source === "youtube" && day.video_url && (
            <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
          )}
        </div>

        {/* Empty (location column) */}
        <div className="w-32 flex-shrink-0" />

        {/* Day Name */}
        <div className="flex-1 min-w-0 text-sm truncate text-muted-foreground">
          {day.name}
        </div>

        {/* Player count */}
        <div className="w-32 text-sm text-right text-muted-foreground">
          {day.player_count !== undefined && day.player_count > 0
            ? `${day.player_count} players in video`
            : "-"}
        </div>

        {/* Info Button */}
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
      {/* Table Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-muted/50 border-b border-border font-semibold text-sm">
        <div className="w-24 flex-shrink-0">Date</div>
        <div className="flex-shrink-0 w-4">{/* Expand icon space */}</div>
        <div className="flex-shrink-0 w-12">{/* Logo space */}</div>
        <div className="w-32 flex-shrink-0">Location</div>
        <div className="flex-1 min-w-0">Event Name</div>
        <div className="w-32 text-right">Prize</div>
        <div className="flex-shrink-0 w-8">{/* Info button space */}</div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-border/50">
        {items
          .filter((item) => item.type === "tournament")
          .map((item) => renderTournament(item))}
      </div>
    </div>
  )
})
