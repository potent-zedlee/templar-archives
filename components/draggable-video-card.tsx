"use client"

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Play, Trash2, Youtube, Upload, Server } from 'lucide-react'
import type { UnsortedVideo } from '@/lib/unsorted-videos'

interface DraggableVideoCardProps {
  video: UnsortedVideo
  isSelected: boolean
  onSelect: (id: string, checked: boolean) => void
  onDelete: (id: string) => void
  onPlay?: (video: UnsortedVideo) => void
}

export function DraggableVideoCard({
  video,
  isSelected,
  onSelect,
  onDelete,
  onPlay,
}: DraggableVideoCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: video.id,
    data: {
      type: 'unsorted-video',
      video,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const getVideoSourceIcon = () => {
    switch (video.video_source) {
      case 'youtube':
        return <Youtube className="h-4 w-4" />
      case 'local':
        return <Upload className="h-4 w-4" />
      case 'nas':
        return <Server className="h-4 w-4" />
      default:
        return <Youtube className="h-4 w-4" />
    }
  }

  const getVideoSourceBadge = () => {
    switch (video.video_source) {
      case 'youtube':
        return <Badge variant="secondary" className="text-xs">YouTube</Badge>
      case 'local':
        return <Badge variant="secondary" className="text-xs">Local</Badge>
      case 'nas':
        return <Badge variant="secondary" className="text-xs">NAS</Badge>
      default:
        return null
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`p-4 transition-all ${
          isDragging ? 'shadow-2xl ring-2 ring-primary' : 'hover:shadow-md'
        } ${isSelected ? 'ring-2 ring-primary' : ''}`}
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(video.id, checked as boolean)}
          />

          {/* Video Icon */}
          <div className="flex-shrink-0 text-muted-foreground">
            {getVideoSourceIcon()}
          </div>

          {/* Video Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium truncate">{video.name}</p>
              {getVideoSourceBadge()}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(video.created_at).toLocaleString()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {video.video_url && onPlay && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPlay(video)}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(video.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
