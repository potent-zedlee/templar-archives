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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Youtube, Upload, Radio, Loader2, CheckCircle2, FolderTree } from 'lucide-react'
import { createUnsortedVideo, createUnsortedVideosBatch } from '@/lib/unsorted-videos'
import type { YouTubeVideo } from '@/lib/youtube-api'
import { createAutoOrganizedStructure, previewOrganizedStructure, type GroupingStrategy, type OrganizedStructure } from '@/lib/auto-organizer'
import { createClientSupabaseClient } from '@/lib/supabase-client'
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

  // Channel Import tab state
  const [channelUrl, setChannelUrl] = useState('')
  const [maxResults, setMaxResults] = useState('25')
  const [fetchedVideos, setFetchedVideos] = useState<YouTubeVideo[]>([])
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [fetchingVideos, setFetchingVideos] = useState(false)
  const [importing, setImporting] = useState(false)

  // Auto-organize options
  const [autoOrganize, setAutoOrganize] = useState(false)
  const [groupingStrategy, setGroupingStrategy] = useState<GroupingStrategy>('week')
  const [channelName, setChannelName] = useState('')
  const [category, setCategory] = useState('Other')
  const [locationInput, setLocationInput] = useState('Online')
  const [organizationPreview, setOrganizationPreview] = useState<OrganizedStructure | null>(null)

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
      // Create a record with filename
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

  const handleFetchChannelStreams = async () => {
    if (!channelUrl) {
      toast.error('Please enter a channel URL')
      return
    }

    setFetchingVideos(true)
    try {
      const response = await fetch('/api/youtube/channel-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelUrl,
          maxResults: parseInt(maxResults),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch videos')
      }

      if (data.videos.length === 0) {
        toast.info('No completed live streams found in this channel')
      } else {
        toast.success(`Found ${data.videos.length} completed live stream(s)`)
      }

      setFetchedVideos(data.videos)
      setSelectedVideos(new Set()) // Reset selection
    } catch (error: any) {
      console.error('Error fetching channel streams:', error)
      toast.error(error.message || 'Failed to fetch channel streams')
    } finally {
      setFetchingVideos(false)
    }
  }

  const handleToggleVideo = (videoId: string) => {
    setSelectedVideos((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(videoId)) {
        newSet.delete(videoId)
      } else {
        newSet.add(videoId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedVideos.size === fetchedVideos.length) {
      setSelectedVideos(new Set())
    } else {
      setSelectedVideos(new Set(fetchedVideos.map((v) => v.id)))
    }
  }

  const handleGeneratePreview = () => {
    if (selectedVideos.size === 0) {
      toast.error('Please select at least one video')
      return
    }

    const selectedVideosList = fetchedVideos.filter((v) => selectedVideos.has(v.id))

    const structure = createAutoOrganizedStructure(selectedVideosList, {
      channelName: channelName || 'YouTube Channel',
      groupBy: groupingStrategy,
      category: category,
      location: locationInput,
    })

    setOrganizationPreview(structure)
    toast.success('Preview generated! Scroll down to see the structure.')
  }

  const handleImportSelected = async () => {
    if (selectedVideos.size === 0) {
      toast.error('Please select at least one video')
      return
    }

    if (autoOrganize) {
      // Auto-organize flow
      await handleImportAndOrganize()
    } else {
      // Simple import to Unsorted
      const videosToImport = fetchedVideos
        .filter((v) => selectedVideos.has(v.id))
        .map((v) => ({
          name: v.title,
          video_url: v.url,
          video_source: 'youtube' as const,
          published_at: v.publishedAt,
        }))

      setImporting(true)
      try {
        const result = await createUnsortedVideosBatch(videosToImport, (current, total) => {
          // Could show progress here if needed
        })

        if (result.success) {
          toast.success(`Successfully imported ${result.imported} video(s)`)
          if (result.failed > 0) {
            toast.error(`Failed to import ${result.failed} video(s)`)
          }

          // Reset state
          setChannelUrl('')
          setFetchedVideos([])
          setSelectedVideos(new Set())
          setOpen(false)
          onSuccess?.()
        } else {
          toast.error('Failed to import videos')
        }
      } catch (error) {
        console.error('Error importing videos:', error)
        toast.error('Failed to import videos')
      } finally {
        setImporting(false)
      }
    }
  }

  const handleImportAndOrganize = async () => {
    const supabase = createClientSupabaseClient()

    if (!organizationPreview) {
      handleGeneratePreview()
      toast.error('Please generate preview first')
      return
    }

    setImporting(true)
    try {
      let totalImported = 0

      // Create tournaments and sub-events
      for (const tournament of organizationPreview.tournaments) {
        // Create tournament
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .insert({
            name: tournament.name,
            category: tournament.category,
            location: tournament.location,
            start_date: tournament.startDate,
            end_date: tournament.endDate,
          })
          .select()
          .single()

        if (tournamentError) {
          console.error('Error creating tournament:', tournamentError)
          continue
        }

        // Create sub-events and assign videos
        for (const subEvent of tournament.subEvents) {
          const { data: subEventData, error: subEventError } = await supabase
            .from('sub_events')
            .insert({
              tournament_id: tournamentData.id,
              name: subEvent.name,
              date: subEvent.date,
            })
            .select()
            .single()

          if (subEventError) {
            console.error('Error creating sub-event:', subEventError)
            continue
          }

          // Insert videos (days)
          for (const video of subEvent.videos) {
            const { error: dayError } = await supabase
              .from('days')
              .insert({
                sub_event_id: subEventData.id,
                name: video.title,
                video_url: video.url,
                is_organized: true,
                organized_at: new Date().toISOString(),
                published_at: video.publishedAt,
              })

            if (dayError) {
              console.error('Error creating day:', dayError)
            } else {
              totalImported++
            }
          }
        }
      }

      toast.success(`Successfully organized ${totalImported} video(s) into tournaments!`)

      // Reset state
      setChannelUrl('')
      setFetchedVideos([])
      setSelectedVideos(new Set())
      setAutoOrganize(false)
      setOrganizationPreview(null)
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error auto-organizing:', error)
      toast.error('Failed to auto-organize videos')
    } finally {
      setImporting(false)
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Quick Upload Video</DialogTitle>
          <DialogDescription>
            Add videos to Unsorted. You can organize them later by dragging them to tournaments.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="youtube" className="gap-2">
              <Youtube className="h-4 w-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="local" className="gap-2">
              <Upload className="h-4 w-4" />
              Local File
            </TabsTrigger>
            <TabsTrigger value="channel" className="gap-2">
              <Radio className="h-4 w-4" />
              Channel
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

          <TabsContent value="channel" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-url">YouTube Channel URL</Label>
              <Input
                id="channel-url"
                placeholder="https://www.youtube.com/@channelname"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter a channel URL to fetch completed live streams
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-results">Max Videos</Label>
              <Select value={maxResults} onValueChange={setMaxResults}>
                <SelectTrigger id="max-results">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 videos</SelectItem>
                  <SelectItem value="25">25 videos</SelectItem>
                  <SelectItem value="50">50 videos</SelectItem>
                  <SelectItem value="100">100 videos</SelectItem>
                  <SelectItem value="500">500 videos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleFetchChannelStreams}
              disabled={fetchingVideos || !channelUrl}
            >
              {fetchingVideos ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                'Fetch Live Streams'
              )}
            </Button>

            {fetchedVideos.length > 0 && (
              <>
                {/* Auto-organize Options */}
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto-organize"
                      checked={autoOrganize}
                      onCheckedChange={(checked) => setAutoOrganize(checked as boolean)}
                    />
                    <Label htmlFor="auto-organize" className="cursor-pointer flex items-center gap-2">
                      <FolderTree className="h-4 w-4" />
                      Auto-organize by date
                    </Label>
                  </div>

                  {autoOrganize && (
                    <div className="space-y-3 pl-6 border-l-2">
                      <div className="space-y-2">
                        <Label htmlFor="channel-name-input">Channel Name</Label>
                        <Input
                          id="channel-name-input"
                          placeholder="e.g., Triton Poker"
                          value={channelName}
                          onChange={(e) => setChannelName(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="category-select">Category</Label>
                          <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="category-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="WSOP">WSOP</SelectItem>
                              <SelectItem value="Triton">Triton</SelectItem>
                              <SelectItem value="EPT">EPT</SelectItem>
                              <SelectItem value="Hustler Casino Live">Hustler</SelectItem>
                              <SelectItem value="APT">APT</SelectItem>
                              <SelectItem value="APL">APL</SelectItem>
                              <SelectItem value="GGPOKER">GGPOKER</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="grouping-strategy">Group By</Label>
                          <Select value={groupingStrategy} onValueChange={(v) => setGroupingStrategy(v as GroupingStrategy)}>
                            <SelectTrigger id="grouping-strategy">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">Day</SelectItem>
                              <SelectItem value="week">Week</SelectItem>
                              <SelectItem value="month">Month</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location-input">Location</Label>
                        <Input
                          id="location-input"
                          placeholder="e.g., Las Vegas, Online"
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                        />
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGeneratePreview}
                        disabled={selectedVideos.size === 0}
                      >
                        <FolderTree className="mr-2 h-4 w-4" />
                        Generate Preview
                      </Button>

                      {organizationPreview && (
                        <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/30">
                          <pre className="text-xs whitespace-pre-wrap font-mono">
                            {previewOrganizedStructure(organizationPreview)}
                          </pre>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {fetchedVideos.length > 0 && (
              <>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedVideos.size === fetchedVideos.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label className="text-sm cursor-pointer" onClick={handleSelectAll}>
                      Select All ({fetchedVideos.length})
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedVideos.size} selected
                  </p>
                </div>

                <ScrollArea className="h-[300px] border rounded-md p-2">
                  <div className="space-y-2">
                    {fetchedVideos.map((video) => (
                      <div
                        key={video.id}
                        className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedVideos.has(video.id)}
                          onCheckedChange={() => handleToggleVideo(video.id)}
                        />
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-24 h-18 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(video.publishedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button
                  className="w-full"
                  onClick={handleImportSelected}
                  disabled={importing || selectedVideos.size === 0 || (autoOrganize && !organizationPreview)}
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {autoOrganize ? 'Organizing...' : 'Importing...'}
                    </>
                  ) : autoOrganize ? (
                    <>
                      <FolderTree className="mr-2 h-4 w-4" />
                      Import & Auto-Organize ({selectedVideos.size})
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Import to Unsorted ({selectedVideos.size})
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
