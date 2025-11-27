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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Youtube, Upload, Radio } from 'lucide-react'
import {
  createUnsortedVideo,
  createUnsortedVideosBatch,
  addVideoToStream,
  createStreamWithVideo,
  autoOrganizeVideos,
} from '@/app/actions/unsorted'
import type { YouTubeVideo } from '@/lib/youtube-api'
import { createAutoOrganizedStructure, type GroupingStrategy, type OrganizedStructure } from '@/lib/auto-organizer'
import { toast } from 'sonner'
import { useTournamentsQuery } from '@/lib/queries/archive-queries'
import { YouTubeUploadTab } from './YouTubeUploadTab'
import { LocalFileUploadTab } from './LocalFileUploadTab'
import { ChannelImportTab } from './ChannelImportTab'

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

  // Tournament/SubEvent/Day selection state (shared by YouTube and Local File tabs)
  const [addToUnsorted, setAddToUnsorted] = useState(true) // 기본값: Unsorted에 추가
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)
  const [selectedSubEventId, setSelectedSubEventId] = useState<string | null>(null)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [createNewDay, setCreateNewDay] = useState(false)
  const [newDayName, setNewDayName] = useState('')

  // Channel Import tab state
  const [inputMethod, setInputMethod] = useState<'url' | 'id'>('url')
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

  // Fetch tournaments tree
  const { data: tournaments = [] } = useTournamentsQuery()

  const handleYoutubeUpload = async () => {
    if (!youtubeUrl || !youtubeName) {
      toast.error('Please enter both video name and YouTube URL')
      return
    }

    setLoading(true)

    try {
      if (addToUnsorted) {
        // 기존 로직: Unsorted에 추가 (Server Action 사용)
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
      } else {
        // 새 로직: Tournament → SubEvent → Day에 직접 추가
        if (!selectedTournamentId || !selectedSubEventId) {
          toast.error('Please select a tournament and sub-event')
          return
        }

        if (createNewDay) {
          // Create new day if needed
          if (!newDayName) {
            toast.error('Please enter new day name')
            return
          }

          const result = await createStreamWithVideo(
            selectedTournamentId,
            selectedSubEventId,
            {
              name: newDayName,
              video_url: youtubeUrl,
            }
          )

          if (!result.success) {
            toast.error(result.error || 'Failed to create new day')
            return
          }

          toast.success(`Created new day: ${newDayName}`)
        } else {
          // Add to existing day
          if (!selectedDayId) {
            toast.error('Please select a day')
            return
          }

          const result = await addVideoToStream(
            selectedTournamentId,
            selectedSubEventId,
            selectedDayId,
            { video_url: youtubeUrl }
          )

          if (!result.success) {
            toast.error(result.error || 'Failed to add video to day')
            return
          }
        }

        toast.success('Video added successfully')
        setYoutubeUrl('')
        setYoutubeName('')
        setOpen(false)
        onSuccess?.()
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
      if (addToUnsorted) {
        // 기존 로직: Unsorted에 추가 (Server Action 사용)
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
      } else {
        // 새 로직: Tournament → SubEvent → Day에 직접 추가
        if (!selectedTournamentId || !selectedSubEventId) {
          toast.error('Please select a tournament and sub-event')
          return
        }

        if (createNewDay) {
          // Create new day if needed
          if (!newDayName) {
            toast.error('Please enter new day name')
            return
          }

          const result = await createStreamWithVideo(
            selectedTournamentId,
            selectedSubEventId,
            {
              name: newDayName,
              video_file: localFile.name,
            }
          )

          if (!result.success) {
            toast.error(result.error || 'Failed to create new day')
            return
          }

          toast.success(`Created new day: ${newDayName}`)
        } else {
          // Add to existing day
          if (!selectedDayId) {
            toast.error('Please select a day')
            return
          }

          const result = await addVideoToStream(
            selectedTournamentId,
            selectedSubEventId,
            selectedDayId,
            { video_file: localFile.name }
          )

          if (!result.success) {
            toast.error(result.error || 'Failed to add video to day')
            return
          }
        }

        toast.success('Video added successfully')
        setLocalFile(null)
        setLocalName('')
        setOpen(false)
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error uploading local file:', error)
      toast.error('Failed to add video')
    } finally {
      setLoading(false)
    }
  }

  const handleFetchChannelStreams = async () => {
    if (!channelUrl) {
      toast.error(inputMethod === 'id' ? 'Please enter a channel ID' : 'Please enter a channel URL')
      return
    }

    // Validate channel ID format if inputMethod is 'id'
    if (inputMethod === 'id') {
      if (!channelUrl.match(/^UC[a-zA-Z0-9_-]{22}$/)) {
        toast.error('Invalid channel ID format. Must start with "UC" and be 24 characters long.')
        return
      }
    }

    setFetchingVideos(true)
    try {
      const response = await fetch('/api/youtube/channel-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelUrl,
          maxResults: parseInt(maxResults),
          inputMethod,
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
      setSelectedVideos(new Set())
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
      await handleImportAndOrganize()
    } else {
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
        const result = await createUnsortedVideosBatch(videosToImport)

        if (result.success) {
          toast.success(`Successfully imported ${result.imported} video(s)`)
          if (result.failed > 0) {
            toast.error(`Failed to import ${result.failed} video(s)`)
          }

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
    if (!organizationPreview) {
      handleGeneratePreview()
      toast.error('Please generate preview first')
      return
    }

    setImporting(true)
    try {
      const result = await autoOrganizeVideos(organizationPreview)

      if (result.success) {
        toast.success(`Successfully organized ${result.imported} video(s) into tournaments!`)

        setChannelUrl('')
        setFetchedVideos([])
        setSelectedVideos(new Set())
        setAutoOrganize(false)
        setOrganizationPreview(null)
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to auto-organize videos')
      }
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Quick Upload Video</DialogTitle>
          <DialogDescription>
            Add videos to Unsorted. You can organize them later by dragging them to tournaments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
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

            <TabsContent value="youtube">
              <YouTubeUploadTab
                youtubeUrl={youtubeUrl}
                setYoutubeUrl={setYoutubeUrl}
                youtubeName={youtubeName}
                setYoutubeName={setYoutubeName}
                loading={loading}
                addToUnsorted={addToUnsorted}
                setAddToUnsorted={setAddToUnsorted}
                tournaments={tournaments}
                selectedTournamentId={selectedTournamentId}
                setSelectedTournamentId={setSelectedTournamentId}
                selectedSubEventId={selectedSubEventId}
                setSelectedSubEventId={setSelectedSubEventId}
                selectedDayId={selectedDayId}
                setSelectedDayId={setSelectedDayId}
                createNewDay={createNewDay}
                setCreateNewDay={setCreateNewDay}
                newDayName={newDayName}
                setNewDayName={setNewDayName}
                onUpload={handleYoutubeUpload}
              />
            </TabsContent>

            <TabsContent value="local">
              <LocalFileUploadTab
                localFile={localFile}
                setLocalFile={setLocalFile}
                localName={localName}
                setLocalName={setLocalName}
                loading={loading}
                addToUnsorted={addToUnsorted}
                setAddToUnsorted={setAddToUnsorted}
                tournaments={tournaments}
                selectedTournamentId={selectedTournamentId}
                setSelectedTournamentId={setSelectedTournamentId}
                selectedSubEventId={selectedSubEventId}
                setSelectedSubEventId={setSelectedSubEventId}
                selectedDayId={selectedDayId}
                setSelectedDayId={setSelectedDayId}
                createNewDay={createNewDay}
                setCreateNewDay={setCreateNewDay}
                newDayName={newDayName}
                setNewDayName={setNewDayName}
                onUpload={handleLocalUpload}
              />
            </TabsContent>

            <TabsContent value="channel">
              <ChannelImportTab
                inputMethod={inputMethod}
                setInputMethod={setInputMethod}
                channelUrl={channelUrl}
                setChannelUrl={setChannelUrl}
                maxResults={maxResults}
                setMaxResults={setMaxResults}
                fetchedVideos={fetchedVideos}
                selectedVideos={selectedVideos}
                fetchingVideos={fetchingVideos}
                importing={importing}
                autoOrganize={autoOrganize}
                setAutoOrganize={setAutoOrganize}
                groupingStrategy={groupingStrategy}
                setGroupingStrategy={setGroupingStrategy}
                channelName={channelName}
                setChannelName={setChannelName}
                category={category}
                setCategory={setCategory}
                locationInput={locationInput}
                setLocationInput={setLocationInput}
                organizationPreview={organizationPreview}
                onFetchChannelStreams={handleFetchChannelStreams}
                onToggleVideo={handleToggleVideo}
                onSelectAll={handleSelectAll}
                onGeneratePreview={handleGeneratePreview}
                onImportSelected={handleImportSelected}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
