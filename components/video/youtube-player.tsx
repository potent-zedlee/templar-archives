"use client"

import { useEffect, useRef, useState } from "react"
import { formatTime } from "@/types/segments"

interface YouTubePlayerProps {
  videoId: string
  onTimeUpdate?: (currentTime: number) => void
  onDurationChange?: (duration: number) => void
  startTime?: number // Start playback from this time (in seconds)
  className?: string
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export function YouTubePlayer({ videoId, onTimeUpdate, onDurationChange, startTime, className }: YouTubePlayerProps) {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // YouTube IFrame API 로드
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = initializePlayer
    } else {
      initializePlayer()
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [videoId])

  useEffect(() => {
    if (!isReady) return

    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime()
        setCurrentTime(time)
        onTimeUpdate?.(time)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isReady, onTimeUpdate])

  const initializePlayer = () => {
    if (!containerRef.current) return

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event: any) => {
          setIsReady(true)
          const dur = event.target.getDuration()
          setDuration(dur)
          onDurationChange?.(dur)

          // Seek to startTime if provided
          if (startTime && startTime > 0) {
            event.target.seekTo(startTime, true)
          }
        },
      },
    })
  }

  const seekTo = (seconds: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seconds, true)
    }
  }

  return (
    <div className={className}>
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {isReady && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <span className="text-muted-foreground">
            현재 위치: {formatTime(currentTime)}
          </span>
        </div>
      )}
    </div>
  )
}

export default YouTubePlayer
