"use client"

import { Folder, FileVideo, ChevronRight, Calendar, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Tournament as TournamentType, SubEvent as SubEventType, Day as DayType } from "@/lib/supabase"
import type { UnsortedVideo } from "@/lib/unsorted-videos"

export interface FolderItem {
  id: string
  name: string
  type: 'tournament' | 'subevent' | 'day' | 'unorganized'
  itemCount?: number
  date?: string
  data?: TournamentType | SubEventType | DayType
}

interface ArchiveFolderListProps {
  items: FolderItem[]
  onNavigate: (item: FolderItem) => void
  onSelectDay?: (dayId: string) => void
  loading?: boolean
  // Multi-select props (for unorganized videos)
  isUnorganized?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onSelectAll?: () => void
}

export function ArchiveFolderList({
  items,
  onNavigate,
  onSelectDay,
  loading = false,
  isUnorganized = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
}: ArchiveFolderListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-body">No items to display</p>
      </div>
    )
  }

  const getIcon = (type: FolderItem['type']) => {
    switch (type) {
      case 'tournament':
        return <Folder className="h-5 w-5 text-blue-500" />
      case 'subevent':
        return <Folder className="h-5 w-5 text-green-500" />
      case 'day':
        return <FileVideo className="h-5 w-5 text-purple-500" />
      case 'unorganized':
        return <Video className="h-5 w-5 text-orange-500" />
      default:
        return <Folder className="h-5 w-5" />
    }
  }

  const handleItemClick = (item: FolderItem, e?: React.MouseEvent) => {
    // Don't navigate if clicking checkbox
    if (e && (e.target as HTMLElement).closest('[data-checkbox]')) {
      return
    }

    if (item.type === 'day' && onSelectDay && !isUnorganized) {
      onSelectDay(item.id)
    } else if (!isUnorganized) {
      onNavigate(item)
    }
  }

  // Always use List View (Compact)
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {/* Select All Header (only for unorganized) */}
        {isUnorganized && onSelectAll && items.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1 bg-muted/30 rounded-md">
            <Checkbox
              checked={selectedIds.size === items.length && items.length > 0}
              onCheckedChange={onSelectAll}
              data-checkbox
            />
            <span className="text-caption text-muted-foreground">
              Select All ({selectedIds.size} / {items.length})
            </span>
          </div>
        )}

        <div className="space-y-0.5">
          {items.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-start h-8 px-2 hover:bg-muted/50 transition-colors"
              onClick={(e) => handleItemClick(item, e)}
            >
              <div className="flex items-center gap-2 w-full">
                {/* Checkbox (only for unorganized videos) */}
                {isUnorganized && onToggleSelect && (
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => onToggleSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    data-checkbox
                  />
                )}

                {/* Icon */}
                <div className="shrink-0">
                  {getIcon(item.type)}
                </div>

                {/* Name */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-caption font-medium truncate">{item.name}</p>
                </div>

                {/* Date (for unorganized videos with published_at) */}
                {item.date && (
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString()}
                  </div>
                )}

                {/* Item count */}
                {item.itemCount !== undefined && item.itemCount > 0 && (
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {item.itemCount}
                  </div>
                )}

                {/* Navigate arrow (for folders only) */}
                {(item.type === 'tournament' || item.type === 'subevent' || item.type === 'unorganized') && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </div>
            </Button>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
