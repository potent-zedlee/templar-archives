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
}

export function ArchiveFolderList({
  items,
  onNavigate,
  onSelectDay,
  loading = false
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

  const handleItemClick = (item: FolderItem) => {
    if (item.type === 'day' && onSelectDay) {
      onSelectDay(item.id)
    } else {
      onNavigate(item)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {items.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className="w-full justify-start h-12 px-3 hover:bg-muted/50 transition-colors"
            onClick={() => handleItemClick(item)}
          >
            <div className="flex items-center gap-3 w-full">
              {/* Icon */}
              <div className="shrink-0">
                {getIcon(item.type)}
              </div>

              {/* Name */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-body font-medium truncate">{item.name}</p>
                {item.date && (
                  <p className="text-caption text-muted-foreground">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {new Date(item.date).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Item count */}
              {item.itemCount !== undefined && item.itemCount > 0 && (
                <div className="shrink-0 text-caption text-muted-foreground">
                  {item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}
                </div>
              )}

              {/* Navigate arrow (for folders only) */}
              {(item.type === 'tournament' || item.type === 'subevent' || item.type === 'unorganized') && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  )
}
