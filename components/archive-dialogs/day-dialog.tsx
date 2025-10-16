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
import { Youtube, Upload } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { toast } from "sonner"

interface DayDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedSubEventId: string | null
  editingDayId?: string
  onSuccess?: () => void
}

export function DayDialog({
  isOpen,
  onOpenChange,
  selectedSubEventId,
  editingDayId = "",
  onSuccess,
}: DayDialogProps) {
  const [newDayName, setNewDayName] = useState("")
  const [videoSourceTab, setVideoSourceTab] = useState<'youtube' | 'upload'>('youtube')
  const [newDayVideoUrl, setNewDayVideoUrl] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const supabase = createClientSupabaseClient()

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setNewDayName("")
      setNewDayVideoUrl("")
      setUploadFile(null)
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
        .from('days')
        .select('*')
        .eq('id', editingDayId)
        .single()

      if (error) throw error

      setNewDayName(data.name || "")
      setVideoSourceTab(data.video_source || 'youtube')
      setNewDayVideoUrl(data.video_url || "")
    } catch (error) {
      console.error('Error loading day:', error)
      toast.error('Failed to load day data')
    }
  }

  const updateDay = async () => {
    if (!editingDayId) return

    try {
      let updateData: any = {
        name: newDayName.trim() || `Day ${new Date().toISOString()}`,
        video_source: videoSourceTab,
        video_url: null,
        video_file: null,
      }

      // Set appropriate video source field
      if (videoSourceTab === 'youtube') {
        if (!newDayVideoUrl.trim()) {
          toast.error('Please enter YouTube URL')
          return
        }
        updateData.video_url = newDayVideoUrl.trim()
      }

      const { error } = await supabase
        .from('days')
        .update(updateData)
        .eq('id', editingDayId)

      if (error) throw error

      toast.success('Day updated successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error updating day:', error)
      toast.error('Failed to update day')
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

    try {
      let videoData: any = {
        sub_event_id: selectedSubEventId,
        name: newDayName.trim() || `Day ${new Date().toISOString()}`,
        video_source: videoSourceTab,
      }

      // YouTube source
      if (videoSourceTab === 'youtube') {
        if (!newDayVideoUrl.trim()) {
          toast.error('Please enter YouTube URL')
          return
        }
        videoData.video_url = newDayVideoUrl.trim()
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

        videoData.video_file = publicUrl
        setUploading(false)
      }

      // Create Day
      const { data, error } = await supabase
        .from('days')
        .insert(videoData)
        .select()
        .single()

      if (error) throw error

      toast.success('Day added successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error adding day:', error)
      toast.error('Failed to add day')
      setUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
