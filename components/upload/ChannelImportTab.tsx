"use client"

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CheckCircle2, FolderTree } from 'lucide-react'
import Image from 'next/image'
import type { YouTubeVideo } from '@/lib/youtube-api'
import type { GroupingStrategy, OrganizedStructure } from '@/lib/auto-organizer'
import { previewOrganizedStructure } from '@/lib/auto-organizer'

interface ChannelImportTabProps {
  inputMethod: 'url' | 'id'
  setInputMethod: (method: 'url' | 'id') => void
  channelUrl: string
  setChannelUrl: (url: string) => void
  maxResults: string
  setMaxResults: (max: string) => void
  fetchedVideos: YouTubeVideo[]
  selectedVideos: Set<string>
  fetchingVideos: boolean
  importing: boolean
  autoOrganize: boolean
  setAutoOrganize: (value: boolean) => void
  groupingStrategy: GroupingStrategy
  setGroupingStrategy: (strategy: GroupingStrategy) => void
  channelName: string
  setChannelName: (name: string) => void
  category: string
  setCategory: (category: string) => void
  locationInput: string
  setLocationInput: (location: string) => void
  organizationPreview: OrganizedStructure | null
  onFetchChannelStreams: () => void
  onToggleVideo: (videoId: string) => void
  onSelectAll: () => void
  onGeneratePreview: () => void
  onImportSelected: () => void
}

export function ChannelImportTab({
  inputMethod,
  setInputMethod,
  channelUrl,
  setChannelUrl,
  maxResults,
  setMaxResults,
  fetchedVideos,
  selectedVideos,
  fetchingVideos,
  importing,
  autoOrganize,
  setAutoOrganize,
  groupingStrategy,
  setGroupingStrategy,
  channelName,
  setChannelName,
  category,
  setCategory,
  locationInput,
  setLocationInput,
  organizationPreview,
  onFetchChannelStreams,
  onToggleVideo,
  onSelectAll,
  onGeneratePreview,
  onImportSelected,
}: ChannelImportTabProps) {
  return (
    <div className="space-y-4">
      {/* Input Method Selection */}
      <div className="space-y-3">
        <Label>Input Method</Label>
        <RadioGroup value={inputMethod} onValueChange={(value) => setInputMethod(value as 'url' | 'id')}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="url" id="input-url" />
            <Label htmlFor="input-url" className="font-normal cursor-pointer">
              Channel URL (e.g., youtube.com/@channelname)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="id" id="input-id" />
            <Label htmlFor="input-id" className="font-normal cursor-pointer">
              Channel ID (e.g., UC... - saves API quota)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Channel Input */}
      <div className="space-y-2">
        <Label htmlFor="channel-input">
          {inputMethod === 'id' ? 'YouTube Channel ID' : 'YouTube Channel URL'}
        </Label>
        <Input
          id="channel-input"
          placeholder={
            inputMethod === 'id'
              ? 'UC... (24 characters, starts with UC)'
              : 'https://www.youtube.com/@channelname'
          }
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {inputMethod === 'id'
            ? 'Directly input channel ID to save API quota (100+ units)'
            : 'Enter a channel URL to fetch completed live streams'}
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
        onClick={onFetchChannelStreams}
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
                  onClick={onGeneratePreview}
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
                onCheckedChange={onSelectAll}
              />
              <Label className="text-sm cursor-pointer" onClick={onSelectAll}>
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
                    onCheckedChange={() => onToggleVideo(video.id)}
                  />
                  <div className="relative w-24 h-18 flex-shrink-0">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
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
            onClick={onImportSelected}
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
    </div>
  )
}
