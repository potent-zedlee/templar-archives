"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Folder, Trash2 } from 'lucide-react'
import { DraggableVideoCard } from './draggable-video-card'
import { QuickUploadDialog } from './quick-upload-dialog'
import { getUnsortedVideos, deleteUnsortedVideo, organizeVideos } from '@/lib/unsorted-videos'
import type { UnsortedVideo } from '@/lib/unsorted-videos'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UnsortedVideosSectionProps {
  onVideoPlay?: (video: UnsortedVideo) => void
}

export function UnsortedVideosSection({ onVideoPlay }: UnsortedVideosSectionProps) {
  const [videos, setVideos] = useState<UnsortedVideo[]>([])
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null)

  const loadVideos = async () => {
    setLoading(true)
    try {
      const data = await getUnsortedVideos()
      setVideos(data)
    } catch (error) {
      console.error('Error loading unsorted videos:', error)
      toast.error('Failed to load unsorted videos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedVideos((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedVideos.size === videos.length) {
      setSelectedVideos(new Set())
    } else {
      setSelectedVideos(new Set(videos.map((v) => v.id)))
    }
  }

  const handleDelete = async (id: string) => {
    setVideoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!videoToDelete) return

    const result = await deleteUnsortedVideo(videoToDelete)
    if (result.success) {
      toast.success('Video deleted')
      setVideos((prev) => prev.filter((v) => v.id !== videoToDelete))
      setSelectedVideos((prev) => {
        const newSet = new Set(prev)
        newSet.delete(videoToDelete)
        return newSet
      })
    } else {
      toast.error(result.error || 'Failed to delete video')
    }

    setDeleteDialogOpen(false)
    setVideoToDelete(null)
  }

  const handleDeleteSelected = async () => {
    if (selectedVideos.size === 0) return

    const deletePromises = Array.from(selectedVideos).map((id) => deleteUnsortedVideo(id))
    const results = await Promise.all(deletePromises)

    const successCount = results.filter((r) => r.success).length
    if (successCount > 0) {
      toast.success(`${successCount} video(s) deleted`)
      await loadVideos()
      setSelectedVideos(new Set())
    } else {
      toast.error('Failed to delete videos')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              <CardTitle>Unsorted Videos</CardTitle>
              <Badge variant="secondary">Loading...</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (videos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              <CardTitle>Unsorted Videos</CardTitle>
              <Badge variant="secondary">0</Badge>
            </div>
            <QuickUploadDialog onSuccess={loadVideos} />
          </div>
          <CardDescription>
            No unsorted videos. Use Quick Upload to add videos that you can organize later.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <Folder className="h-5 w-5" />
              <CardTitle>Unsorted Videos</CardTitle>
              <Badge variant="destructive">{videos.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {selectedVideos.size > 0 && (
                <>
                  <Badge variant="outline">{selectedVideos.size} selected</Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={handleDeleteSelected}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedVideos.size === videos.length ? 'Deselect All' : 'Select All'}
              </Button>
              <QuickUploadDialog onSuccess={loadVideos} />
            </div>
          </div>
          <CardDescription>
            Drag videos to tournaments to organize them. {videos.length} video(s) waiting to be organized.
          </CardDescription>
        </CardHeader>

        {expanded && (
          <CardContent>
            <div className="space-y-2">
              {videos.map((video) => (
                <DraggableVideoCard
                  key={video.id}
                  video={video}
                  isSelected={selectedVideos.has(video.id)}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onPlay={onVideoPlay}
                />
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this video from Unsorted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
