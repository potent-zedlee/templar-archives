"use client"

import { Folder, FileVideo, Video, Play, Calendar, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit, Trash, FolderPlus, FolderInput, CheckSquare } from "lucide-react"
import { motion } from "framer-motion"
import type { FolderItem } from "@/lib/types/archive"
import Image from "next/image"

interface ArchiveTimelineViewProps {
  items: FolderItem[]
  onNavigate: (item: FolderItem) => void
  onSelectDay?: (streamId: string) => void
  loading?: boolean
  isUnorganized?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onRename?: (item: FolderItem) => void
  onDelete?: (item: FolderItem) => void
  onMoveToEvent?: (item: FolderItem) => void
  onMoveToNewEvent?: (item: FolderItem) => void
  onAddSubItem?: (item: FolderItem) => void
  onEditEvent?: (item: FolderItem) => void
  isAdmin?: boolean
}

export function ArchiveTimelineView({
  items,
  onNavigate,
  onSelectDay,
  loading = false,
  isUnorganized = false,
  selectedIds = new Set(),
  onToggleSelect,
  onRename,
  onDelete,
  onMoveToEvent,
  onMoveToNewEvent,
  onAddSubItem,
  onEditEvent,
  isAdmin = false,
}: ArchiveTimelineViewProps) {
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-24 h-16 bg-muted animate-pulse rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No items to display</p>
        <p className="text-sm mt-1">Items will appear here when you add them</p>
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

  const getYouTubeThumbnail = (item: FolderItem): string | null => {
    const data = item.data as any
    if (!data?.video_url) return null

    const match = data.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
    if (!match) return null

    return `https://img.youtube.com/vi/${match[1]}/default.jpg`
  }

  const handleItemClick = (item: FolderItem) => {
    if (item.type === 'day' && onSelectDay && !isUnorganized) {
      onSelectDay(item.id)
    } else if (!isUnorganized && item.type !== 'day') {
      onNavigate(item)
    }
  }

  const renderDropdownMenu = (item: FolderItem) => {
    // Same logic as grid view...
    if (item.type === 'tournament') {
      return (
        <>
          <DropdownMenuItem onClick={() => onNavigate(item)}>
            <Folder className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>
          {isAdmin && onAddSubItem && (
            <DropdownMenuItem onClick={() => onAddSubItem(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add SubEvent
            </DropdownMenuItem>
          )}
          {isAdmin && onRename && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRename(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && onDelete && (
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </>
      )
    }

    if (item.type === 'subevent') {
      return (
        <>
          <DropdownMenuItem onClick={() => onNavigate(item)}>
            <Folder className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>
          {isAdmin && onEditEvent && (
            <DropdownMenuItem onClick={() => onEditEvent(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Event Info
            </DropdownMenuItem>
          )}
          {isAdmin && onRename && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRename(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            </>
          )}
          {isAdmin && onDelete && (
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </>
      )
    }

    if (item.type === 'day' && !isUnorganized) {
      return (
        <>
          <DropdownMenuItem onClick={() => onSelectDay && onSelectDay(item.id)}>
            <Play className="mr-2 h-4 w-4" />
            View Hands
          </DropdownMenuItem>
          {isAdmin && (onMoveToEvent || onMoveToNewEvent) && <DropdownMenuSeparator />}
          {isAdmin && onMoveToEvent && (
            <DropdownMenuItem onClick={() => onMoveToEvent(item)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move to Event
            </DropdownMenuItem>
          )}
          {isAdmin && onMoveToNewEvent && (
            <DropdownMenuItem onClick={() => onMoveToNewEvent(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Move to New Event
            </DropdownMenuItem>
          )}
        </>
      )
    }

    if (item.type === 'day' && isUnorganized) {
      return (
        <>
          {onToggleSelect && (
            <DropdownMenuItem onClick={() => onToggleSelect(item.id)}>
              <CheckSquare className="mr-2 h-4 w-4" />
              {selectedIds.has(item.id) ? 'Deselect' : 'Select'}
            </DropdownMenuItem>
          )}
          {(onMoveToEvent || onMoveToNewEvent) && <DropdownMenuSeparator />}
          {onMoveToEvent && (
            <DropdownMenuItem onClick={() => onMoveToEvent(item)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move to Event
            </DropdownMenuItem>
          )}
          {onMoveToNewEvent && (
            <DropdownMenuItem onClick={() => onMoveToNewEvent(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Move to New Event
            </DropdownMenuItem>
          )}
        </>
      )
    }

    return null
  }

  // Group items by date
  const groupedItems = items.reduce((acc, item) => {
    let dateKey = 'No Date'
    if (item.date) {
      const date = new Date(item.date)
      dateKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(item)
    return acc
  }, {} as Record<string, FolderItem[]>)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8 p-4"
    >
      {Object.entries(groupedItems).map(([dateKey, dateItems], groupIndex) => (
        <div key={dateKey} className="space-y-3">
          {/* Date Header */}
          <div className="flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {dateKey}
            </h3>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Timeline Items */}
          <div className="space-y-2 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-border before:ml-5">
            {dateItems.map((item, index) => {
              const thumbnail = getYouTubeThumbnail(item)
              const isFolder = item.type === 'tournament' || item.type === 'subevent' || item.type === 'unorganized'
              const isSelected = selectedIds.has(item.id)

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                  className="relative pl-12"
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-4 top-4 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />

                  <Card
                    className={`
                      group transition-all duration-300 cursor-pointer
                      ${isSelected ? 'ring-2 ring-primary' : ''}
                      hover:shadow-md hover:translate-x-1
                    `}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-center gap-4 p-3">
                      {/* Checkbox for unorganized videos */}
                      {isUnorganized && onToggleSelect && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelect(item.id)}
                          />
                        </div>
                      )}

                      {/* Thumbnail or Icon */}
                      <div className="shrink-0 w-20 h-14 bg-muted/30 rounded-md overflow-hidden relative flex items-center justify-center">
                        {thumbnail ? (
                          <Image
                            src={thumbnail}
                            alt={item.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          getIcon(item.type)
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-medium text-sm truncate">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {item.itemCount !== undefined && item.itemCount > 0 && (
                            <span>{item.itemCount} items</span>
                          )}
                          {item.type === 'tournament' && (
                            <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-600 dark:text-blue-400">
                              Tournament
                            </Badge>
                          )}
                          {item.type === 'subevent' && (
                            <Badge variant="outline" className="text-xs border-green-500/50 text-green-600 dark:text-green-400">
                              Event
                            </Badge>
                          )}
                          {item.type === 'day' && !isUnorganized && (
                            <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-600 dark:text-purple-400">
                              Video
                            </Badge>
                          )}
                          {item.type === 'day' && isUnorganized && (
                            <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-600 dark:text-orange-400">
                              Unorganized
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Menu Button */}
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {renderDropdownMenu(item)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}
    </motion.div>
  )
}
