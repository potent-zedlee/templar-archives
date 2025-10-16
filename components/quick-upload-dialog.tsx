"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Youtube, Upload, Loader2 } from 'lucide-react'
import { createUnsortedVideo } from '@/lib/unsorted-videos'
import { toast } from 'sonner'

interface QuickUploadDialogProps {
  onSuccess?: () => void
}

export function QuickUploadDialog({ onSuccess }: QuickUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // YouTube tab state
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeName, setYoutubeName] = useState('')

  // Local file tab state
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [localName, setLocalName] = useState('')

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl || !youtubeName) {
      toast.error('Please enter both video name and YouTube URL')
      return
    }

    setLoading(true)
    try {
      const result = await createUnsortedVideo({
        name: youtubeName,
        video_url: youtubeUrl,
        video_source: 'youtube',
      })

      if (result.success) {
        toast.success('Video added to Unsorted')
        setYoutubeUrl('')
        setYoutubeName('')
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to add video')
      }
    } catch (error) {
      console.error('Error uploading YouTube video:', error)
      toast.error('Failed to add video')
    } finally {
      setLoading(false)
    }
  }

  const handleLocalUpload = async () => {
    if (!localFile || !localName) {
      toast.error('Please select a file and enter a name')
      return
    }

    setLoading(true)
    try {
      // TODO: Implement local file upload to Supabase Storage
      // For now, just create a record with filename
      const result = await createUnsortedVideo({
        name: localName,
        video_file: localFile.name,
        video_source: 'local',
      })

      if (result.success) {
        toast.success('Video added to Unsorted')
        setLocalFile(null)
        setLocalName('')
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to add video')
      }
    } catch (error) {
      console.error('Error uploading local file:', error)
      toast.error('Failed to add video')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLocalFile(file)
      if (!localName) {
        // Auto-fill name from filename
        setLocalName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Quick Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Upload Video</DialogTitle>
          <DialogDescription>
            Add videos to Unsorted. You can organize them later by dragging them to tournaments.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="youtube" className="gap-2">
              <Youtube className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="local" className="gap-2">
              <Upload className="h-4 w-4" />
              Local File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-name">Video Name</Label>
              <Input
                id="youtube-name"
                placeholder="e.g., WSOP 2024 Main Event Day 1"
                value={youtubeName}
                onChange={(e) => setYoutubeName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleYoutubeUpload}
              disabled={loading || !youtubeUrl || !youtubeName}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Unsorted'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="local" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="local-name">Video Name</Label>
              <Input
                id="local-name"
                placeholder="e.g., WSOP 2024 Main Event Day 1"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local-file">Select File</Label>
              <Input
                id="local-file"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
              />
              {localFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {localFile.name} ({(localFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleLocalUpload}
              disabled={loading || !localFile || !localName}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add to Unsorted'
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
