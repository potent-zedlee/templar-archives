"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, Users, Radio } from "lucide-react"

interface LiveStream {
  id: string
  title: string
  channelName: string
  channelThumbnail: string
  thumbnailUrl: string
  videoUrl: string
  viewerCount?: string
  streamType: 'live' | 'completed' | 'recent'
  publishedAt?: string
}

function formatViewerCount(count: string): string {
  const num = parseInt(count, 10)
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function LiveStreamCard({ stream }: { stream: LiveStream }) {
  return (
    <a
      href={stream.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-full"
    >
      <Card className="overflow-hidden border-border/50 transition-all hover:border-primary/50 hover:shadow-lg">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          <Image
            src={stream.thumbnailUrl}
            alt={stream.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />

          {/* Stream Type Badge */}
          <div className="absolute top-2 left-2">
            {stream.streamType === 'live' ? (
              <Badge variant="destructive" className="flex items-center gap-1 font-semibold text-xs">
                <Radio className="h-2.5 w-2.5 fill-white animate-pulse" />
                LIVE
              </Badge>
            ) : stream.streamType === 'completed' ? (
              <Badge variant="secondary" className="flex items-center gap-1 font-semibold text-xs bg-gray-700 text-white border-0">
                ENDED
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 font-semibold text-xs">
                RECENT
              </Badge>
            )}
          </div>

          {/* Viewer Count or Time */}
          <div className="absolute bottom-2 right-2">
            {stream.streamType === 'live' && stream.viewerCount ? (
              <Badge variant="secondary" className="flex items-center gap-1 bg-black/70 text-white border-0 text-xs">
                <Users className="h-2.5 w-2.5" />
                {formatViewerCount(stream.viewerCount)}
              </Badge>
            ) : stream.publishedAt ? (
              <Badge variant="secondary" className="flex items-center gap-1 bg-black/70 text-white border-0 text-xs">
                {formatTimeAgo(stream.publishedAt)}
              </Badge>
            ) : null}
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-xs font-medium line-clamp-2 mb-3 text-center group-hover:text-primary transition-colors">
            {stream.title}
          </h3>
          <div className="flex items-center justify-center gap-2">
            {stream.channelThumbnail && (
              <div className="relative w-6 h-6 flex-shrink-0">
                <Image
                  src={stream.channelThumbnail}
                  alt={stream.channelName}
                  width={24}
                  height={24}
                  className="rounded-full object-cover"
                />
              </div>
            )}
            <p className="text-sm font-semibold text-foreground truncate">
              {stream.channelName}
            </p>
          </div>
        </div>
      </Card>
    </a>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-[240px] sm:w-[260px]">
          <Card className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <div className="p-3 space-y-3">
              <Skeleton className="h-3 w-full" />
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Radio className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Live Streams</h3>
      <p className="text-sm text-muted-foreground">
        There are no poker streams currently live on YouTube.
      </p>
    </div>
  )
}

export function LivePokerStreams() {
  const [streams, setStreams] = useState<LiveStream[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStreams() {
      try {
        const response = await fetch('/api/youtube/live-streams')
        const data = await response.json()
        setStreams(data.streams || [])
      } catch (error) {
        console.error('Failed to fetch live streams:', error)
        setStreams([])
      } finally {
        setLoading(false)
      }
    }

    fetchStreams()

    // Refresh every 1 hour (aligned with API cache)
    const interval = setInterval(fetchStreams, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Radio className="h-6 w-6 text-destructive" />
          <h2 className="text-2xl md:text-3xl font-bold">Live Poker Streams</h2>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (streams.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Radio className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-2xl md:text-3xl font-bold">Live Poker Streams</h2>
        </div>
        <EmptyState />
      </div>
    )
  }

  const liveCount = streams.filter(s => s.streamType === 'live').length

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Radio className={`h-6 w-6 ${liveCount > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
        <h2 className="text-2xl md:text-3xl font-bold">Live & Recent Poker Streams</h2>
        {liveCount > 0 && (
          <Badge variant="destructive" className="ml-2">
            {liveCount} Live
          </Badge>
        )}
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {streams.map((stream) => (
            <div key={stream.id} className="w-[240px] sm:w-[260px] flex-shrink-0">
              <LiveStreamCard stream={stream} />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
