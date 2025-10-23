"use client"

import { memo } from "react"
import { Folder, FileVideo, ChevronRight, Video, Play, Edit, Trash, FolderPlus, FolderInput, CheckSquare, MoreVertical, Info, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Tournament as TournamentType, SubEvent as SubEventType, Day as DayType } from "@/lib/supabase"
import type { UnsortedVideo } from "@/lib/unsorted-videos"
import { ArchiveEventCard } from "@/components/archive-event-card"
import type { FolderItem } from "@/lib/types/archive"

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
  // Context menu actions
  onRename?: (item: FolderItem) => void
  onDelete?: (item: FolderItem) => void
  onMoveToEvent?: (item: FolderItem) => void
  onMoveToNewEvent?: (item: FolderItem) => void
  onAddSubItem?: (item: FolderItem) => void
  onEditEvent?: (item: FolderItem) => void
  onShowInfo?: (item: FolderItem) => void
  isAdmin?: boolean
}

export const ArchiveFolderList = memo(function ArchiveFolderList({
  items,
  onNavigate,
  onSelectDay,
  loading = false,
  isUnorganized = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  onRename,
  onDelete,
  onMoveToEvent,
  onMoveToNewEvent,
  onAddSubItem,
  onEditEvent,
  onShowInfo,
  isAdmin = false,
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
        return (
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
            <Folder className="h-4 w-4 text-white" />
          </div>
        )
      case 'subevent':
        return (
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-md">
            <Folder className="h-4 w-4 text-white" />
          </div>
        )
      case 'day':
        return (
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-md">
            <FileVideo className="h-4 w-4 text-white" />
          </div>
        )
      case 'unorganized':
        return (
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 shadow-md">
            <Video className="h-4 w-4 text-white" />
          </div>
        )
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

  const renderDropdownMenu = (item: FolderItem) => {
    // Tournament folder menu
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

    // SubEvent folder menu
    if (item.type === 'subevent') {
      return (
        <>
          <DropdownMenuItem onClick={() => onNavigate(item)}>
            <Folder className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>
          {isAdmin && onAddSubItem && (
            <DropdownMenuItem onClick={() => onAddSubItem(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Day
            </DropdownMenuItem>
          )}
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

    // Day (video) menu - for organized videos
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

    // Unorganized video menu
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
          {isAdmin && (onRename || onDelete) && <DropdownMenuSeparator />}
          {isAdmin && onRename && (
            <DropdownMenuItem onClick={() => onRename(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
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

    return null
  }

  const renderContextMenu = (item: FolderItem) => {
    // Tournament folder menu
    if (item.type === 'tournament') {
      return (
        <>
          <ContextMenuItem onClick={() => onNavigate(item)}>
            <Folder className="mr-2 h-4 w-4" />
            Open
          </ContextMenuItem>
          {isAdmin && onAddSubItem && (
            <ContextMenuItem onClick={() => onAddSubItem(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add SubEvent
            </ContextMenuItem>
          )}
          {isAdmin && onRename && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onRename(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </ContextMenuItem>
            </>
          )}
          {isAdmin && onDelete && (
            <ContextMenuItem onClick={() => onDelete(item)} variant="destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          )}
        </>
      )
    }

    // SubEvent folder menu
    if (item.type === 'subevent') {
      return (
        <>
          <ContextMenuItem onClick={() => onNavigate(item)}>
            <Folder className="mr-2 h-4 w-4" />
            Open
          </ContextMenuItem>
          {isAdmin && onEditEvent && (
            <ContextMenuItem onClick={() => onEditEvent(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Event Info
            </ContextMenuItem>
          )}
          {isAdmin && onRename && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onRename(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </ContextMenuItem>
            </>
          )}
          {isAdmin && onDelete && (
            <ContextMenuItem onClick={() => onDelete(item)} variant="destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          )}
        </>
      )
    }

    // Day (video) menu - for organized videos
    if (item.type === 'day' && !isUnorganized) {
      return (
        <>
          <ContextMenuItem onClick={() => onSelectDay && onSelectDay(item.id)}>
            <Play className="mr-2 h-4 w-4" />
            View Hands
          </ContextMenuItem>
          {isAdmin && (onMoveToEvent || onMoveToNewEvent) && <ContextMenuSeparator />}
          {isAdmin && onMoveToEvent && (
            <ContextMenuItem onClick={() => onMoveToEvent(item)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move to Event
            </ContextMenuItem>
          )}
          {isAdmin && onMoveToNewEvent && (
            <ContextMenuItem onClick={() => onMoveToNewEvent(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Move to New Event
            </ContextMenuItem>
          )}
          {isAdmin && onRename && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onRename(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </ContextMenuItem>
            </>
          )}
          {isAdmin && onDelete && (
            <ContextMenuItem onClick={() => onDelete(item)} variant="destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          )}
        </>
      )
    }

    // Unorganized video menu
    if (item.type === 'day' && isUnorganized) {
      return (
        <>
          {onToggleSelect && (
            <ContextMenuItem onClick={() => onToggleSelect(item.id)}>
              <CheckSquare className="mr-2 h-4 w-4" />
              {selectedIds.has(item.id) ? 'Deselect' : 'Select'}
            </ContextMenuItem>
          )}
          {(onMoveToEvent || onMoveToNewEvent) && <ContextMenuSeparator />}
          {onMoveToEvent && (
            <ContextMenuItem onClick={() => onMoveToEvent(item)}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move to Event
            </ContextMenuItem>
          )}
          {onMoveToNewEvent && (
            <ContextMenuItem onClick={() => onMoveToNewEvent(item)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Move to New Event
            </ContextMenuItem>
          )}
          {isAdmin && (onRename || onDelete) && <ContextMenuSeparator />}
          {isAdmin && onRename && (
            <ContextMenuItem onClick={() => onRename(item)}>
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
          )}
          {isAdmin && onDelete && (
            <ContextMenuItem onClick={() => onDelete(item)} variant="destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          )}
        </>
      )
    }

    return null
  }

  // Enhanced List View with ArchiveEventCard
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {/* Select All Header (only for unorganized) */}
        {isUnorganized && onSelectAll && items.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-3 mb-3 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl border border-primary/10 shadow-sm">
            <Checkbox
              checked={selectedIds.size === items.length && items.length > 0}
              onCheckedChange={onSelectAll}
              data-checkbox
            />
            <span className="text-sm font-medium text-foreground">
              Select All ({selectedIds.size} / {items.length})
            </span>
          </div>
        )}

        <div className="space-y-2">
          {items.map((item) => {
            // Use ArchiveEventCard for folders (tournament/subevent)
            if (item.type === 'tournament' || item.type === 'subevent') {
              return (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <div className="relative group">
                      <ArchiveEventCard
                        item={item}
                        onClick={() => handleItemClick(item)}
                        menuItems={renderDropdownMenu(item)}
                        isAdmin={isAdmin}
                        variant="list"
                      />
                      {/* Quick Action Button (Admin only, visible on hover) */}
                      {isAdmin && onAddSubItem && (
                        <div className="absolute right-24 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 px-3 text-xs font-medium shadow-md hover:shadow-lg transition-all"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddSubItem(item)
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {item.type === 'tournament' ? 'Add SubEvent' : 'Add Day'}
                          </Button>
                        </div>
                      )}
                      {/* Info Icon Button (visible on hover) */}
                      {onShowInfo && (
                        <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              onShowInfo(item)
                            }}
                          >
                            <Info className="h-4 w-4 text-primary" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {renderContextMenu(item)}
                  </ContextMenuContent>
                </ContextMenu>
              )
            }

            // Use simplified version for day/video items
            return (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger asChild>
                  <div className="relative group">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 px-3 hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/5 hover:scale-[1.01] hover:shadow-md transition-all duration-200 rounded-xl"
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
                          <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{item.name}</p>
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
                        {item.type === 'unorganized' && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </Button>

                    {/* Action Buttons (visible on hover) */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {/* Info Button */}
                      {onShowInfo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            onShowInfo(item)
                          }}
                        >
                          <Info className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}

                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {renderDropdownMenu(item)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {renderContextMenu(item)}
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
})
