"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Youtube, Upload, FolderOpen, Calendar, PlayCircle } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { organizeVideo } from "@/lib/unsorted-videos"
import type { UnsortedVideo } from "@/lib/types/archive"
import { createStream, updateStream as updateStreamAction } from "@/app/actions/archive"

interface DayDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedSubEventId: string | null
  editingDayId?: string
  unsortedVideos?: UnsortedVideo[]
  onSuccess?: () => void
}

export function DayDialog({
  isOpen,
  onOpenChange,
  selectedSubEventId,
  editingDayId = "",
  unsortedVideos = [],
  onSuccess,
}: DayDialogProps) {
  const [newDayName, setNewDayName] = useState("")
  const [videoSourceTab, setVideoSourceTab] = useState<'youtube' | 'upload' | 'unsorted'>('youtube')
  const [newDayVideoUrl, setNewDayVideoUrl] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [selectedUnsortedId, setSelectedUnsortedId] = useState<string | null>(null)
  const [publishedAt, setPublishedAt] = useState("")
  const [uploading, setUploading] = useState(false)

  const supabase = createClientSupabaseClient()

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setNewDayName("")
      setNewDayVideoUrl("")
      setUploadFile(null)
      setSelectedUnsortedId(null)
      setPublishedAt("")
      setVideoSourceTab('youtube')
      setUploading(false)
    }
  }, [isOpen])

  // Load day data when editing
  useEffect(() => {
    if (isOpen && editingDayId) {
      loadDayData()
    }
  }, [isOpen, editingDayId])

  const loadDayData = async () => {
    if (!editingDayId) return

    try {
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('id', editingDayId)
        .single()

      if (error) throw error

      setNewDayName(data.name || "")
      setVideoSourceTab(data.video_source || 'youtube')
      setNewDayVideoUrl(data.video_url || "")
      setPublishedAt(data.published_at ? new Date(data.published_at).toISOString().split('T')[0] : "")
    } catch (error) {
      console.error('Error loading stream:', error)
      toast.error('Failed to load stream data')
    }
  }

  const updateDay = async () => {
    if (!editingDayId) return

    try {
      // Unsorted tab is not allowed for editing
      if (videoSourceTab === 'unsorted') {
        toast.error('Cannot update stream with unsorted video source')
        return
      }

      // Validate YouTube URL if needed
      if (videoSourceTab === 'youtube' && !newDayVideoUrl.trim()) {
        toast.error('Please enter YouTube URL')
        return
      }

      const streamData = {
        name: newDayName.trim() || undefined,
        video_source: videoSourceTab as 'youtube' | 'upload',
        video_url: videoSourceTab === 'youtube' ? newDayVideoUrl.trim() : undefined,
        video_file: undefined,
        published_at: publishedAt || undefined,
      }

      // Call Server Action
      const result = await updateStreamAction(editingDayId, streamData)

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      toast.success('Stream updated successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('[DayDialog] Error updating stream:', error)
      toast.error(error.message || 'Failed to update stream')
    }
  }

  const organizeUnsortedVideo = async () => {
    if (!selectedSubEventId) {
      toast.error('No sub-event selected')
      return
    }

    if (!selectedUnsortedId) {
      toast.error('Please select a video')
      return
    }

    try {
      setUploading(true)
      const result = await organizeVideo(selectedUnsortedId, selectedSubEventId)

      if (result.success) {
        toast.success('Video organized successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to organize video')
      }
    } catch (error) {
      console.error('Error organizing video:', error)
      toast.error('Failed to organize video')
    } finally {
      setUploading(false)
    }
  }

  const addDay = async () => {
    if (!selectedSubEventId) {
      toast.error('No sub-event selected')
      return
    }

    // If editing, call updateDay instead
    if (editingDayId) {
      return updateDay()
    }

    // If unsorted tab, organize existing video
    if (videoSourceTab === 'unsorted') {
      return organizeUnsortedVideo()
    }

    try {
      let videoFile: string | undefined = undefined

      // YouTube source
      if (videoSourceTab === 'youtube') {
        if (!newDayVideoUrl.trim()) {
          toast.error('Please enter YouTube URL')
          return
        }
      }

      // File upload source
      if (videoSourceTab === 'upload') {
        if (!uploadFile) {
          toast.error('Please select a file to upload')
          return
        }

        setUploading(true)

        // Upload to Supabase Storage
        const fileName = `${selectedSubEventId}-${Date.now()}-${uploadFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, uploadFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error('Failed to upload file')
          setUploading(false)
          return
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(fileName)

        videoFile = publicUrl
        setUploading(false)
      }

      // Create Stream via Server Action
      const streamData = {
        name: newDayName.trim() || undefined,
        video_source: videoSourceTab as 'youtube' | 'upload',
        video_url: videoSourceTab === 'youtube' ? newDayVideoUrl.trim() : undefined,
        video_file: videoFile,
        published_at: publishedAt || undefined,
      }

      const result = await createStream(selectedSubEventId, streamData)

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      toast.success('Stream added successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('[DayDialog] Error adding stream:', error)
      toast.error(error.message || 'Failed to add stream')
      setUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>{editingDayId ? "Day Edit" : "Day Add"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="day-name">Day Name (Optional)</Label>
            <Input
              id="day-name"
              placeholder="e.g., Day 1, Day 2 (auto-generated if empty)"
              value={newDayName}
              onChange={(e) => setNewDayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="published-at">Stream Date</Label>
            <Input
              id="published-at"
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
            <p className="text-caption text-muted-foreground">
              Original stream/upload date (auto-filled from selected video)
            </p>
          </div>

          {/* Video Source Tabs */}
          <div className="space-y-4">
            <Label>Video Source</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={videoSourceTab === 'youtube' ? 'default' : 'outline'}
                onClick={() => setVideoSourceTab('youtube')}
                className="flex-1"
              >
                <Youtube className="mr-2 h-4 w-4" />
                YouTube
              </Button>
              <Button
                type="button"
                variant={videoSourceTab === 'upload' ? 'default' : 'outline'}
                onClick={() => setVideoSourceTab('upload')}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              <Button
                type="button"
                variant={videoSourceTab === 'unsorted' ? 'default' : 'outline'}
                onClick={() => setVideoSourceTab('unsorted')}
                className="flex-1"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                From Unsorted
              </Button>
            </div>
          </div>

          {/* YouTube Tab */}
          {videoSourceTab === 'youtube' && (
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL *</Label>
              <Input
                id="youtube-url"
                placeholder="https://youtube.com/watch?v=..."
                value={newDayVideoUrl}
                onChange={(e) => setNewDayVideoUrl(e.target.value)}
              />
            </div>
          )}

          {/* Upload Tab */}
          {videoSourceTab === 'upload' && (
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload Video File *</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  id="file-upload"
                  type="file"
                  accept="video/mp4,video/mov,video/avi,video/mkv,video/webm"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 500 * 1024 * 1024) {
                        toast.error('File size must be less than 500MB')
                        return
                      }
                      setUploadFile(file)
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-body font-medium">
                    {uploadFile ? uploadFile.name : 'Click to select video file'}
                  </p>
                  <p className="text-caption text-muted-foreground mt-1">
                    {uploadFile
                      ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`
                      : 'MP4, MOV, AVI, MKV, WebM (max 500MB)'
                    }
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Unsorted Tab */}
          {videoSourceTab === 'unsorted' && (
            <div className="space-y-2">
              <Label>Select Video from Unsorted</Label>
              {unsortedVideos.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-body font-medium text-muted-foreground">No unsorted videos available</p>
                  <p className="text-caption text-muted-foreground mt-1">
                    Upload videos to the Unsorted folder first
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] w-[460px] border rounded-lg">
                  <div className="p-4 space-y-3">
                    {unsortedVideos.map((video) => (
                      <Card
                        key={video.id}
                        className={`p-4 cursor-pointer transition-all ${
                          selectedUnsortedId === video.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedUnsortedId(video.id)
                          // Auto-fill published_at from selected video
                          if (video.published_at) {
                            setPublishedAt(new Date(video.published_at).toISOString().split('T')[0])
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Video Icon/Thumbnail */}
                          <div className="shrink-0">
                            {video.video_source === 'youtube' ? (
                              <div className="w-16 h-16 bg-red-500/10 rounded flex items-center justify-center">
                                <Youtube className="h-8 w-8 text-red-500" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
                                <PlayCircle className="h-8 w-8 text-primary" />
                              </div>
                            )}
                          </div>

                          {/* Video Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate mb-1">{video.name}</h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {video.video_source === 'youtube' ? 'YouTube' :
                                 video.video_source === 'upload' ? 'Upload' :
                                 video.video_source || 'Unknown'}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(video.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            {video.video_url && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {video.video_url}
                              </p>
                            )}
                          </div>

                          {/* Selected Indicator */}
                          {selectedUnsortedId === video.id && (
                            <div className="shrink-0">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <p className="text-caption text-muted-foreground">
                Selected video will be moved from Unsorted to this event
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={addDay} disabled={uploading}>
              {uploading ? 'Uploading...' : (editingDayId ? 'Edit' : 'Add')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
