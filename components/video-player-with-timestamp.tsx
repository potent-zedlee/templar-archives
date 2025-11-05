/**
 * Video Player with Timestamp
 *
 * YouTube iframe을 직접 사용한 비디오 플레이어
 * 타임코드 실시간 표시 및 구간 설정 지원
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Play, Loader2 } from 'lucide-react'
import { secondsToTimeString } from '@/lib/types/video-segments'

interface VideoPlayerWithTimestampProps {
  videoUrl?: string
  videoSource?: 'youtube' | 'upload' | 'nas'
  videoFile?: string
  videoNasPath?: string
  onTimeUpdate?: (currentTime: number) => void
  className?: string
}

// YouTube URL에서 Video ID 추출
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export function VideoPlayerWithTimestamp({
  videoUrl,
  videoSource,
  videoFile,
  videoNasPath,
  onTimeUpdate,
  className,
}: VideoPlayerWithTimestampProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string>('')
  const playerRef = useRef<any>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 비디오 URL 결정
  const getVideoUrl = () => {
    if (videoSource === 'youtube' && videoUrl) {
      return videoUrl
    }
    if (videoSource === 'upload' && videoFile) {
      return videoFile
    }
    if (videoSource === 'nas' && videoNasPath) {
      return videoNasPath
    }
    return videoUrl
  }

  const url = getVideoUrl()
  const videoId = url && videoSource === 'youtube' ? getYouTubeVideoId(url) : null

  // YouTube IFrame API 로드 및 플레이어 초기화
  useEffect(() => {
    if (!videoId) return

    // YouTube IFrame API 스크립트 로드
    if (!(window as any).YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    // API 준비 대기
    const initPlayer = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        setTimeout(initPlayer, 100)
        return
      }

      try {
        playerRef.current = new (window as any).YT.Player(`youtube-player-${videoId}`, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              setIsReady(true)
              setError('')
              const duration = event.target.getDuration()
              setDuration(duration)

              // 타임코드 추적 시작
              if (intervalRef.current) clearInterval(intervalRef.current)
              intervalRef.current = setInterval(() => {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                  const time = Math.floor(playerRef.current.getCurrentTime())
                  setCurrentTime(time)
                  if (onTimeUpdate) {
                    onTimeUpdate(time)
                  }
                }
              }, 500)
            },
            onError: (event: any) => {
              console.error('YouTube Player error:', event.data)
              setError('영상을 불러올 수 없습니다')
            },
          },
        })
      } catch (err) {
        console.error('Failed to initialize YouTube player:', err)
        setError('플레이어 초기화에 실패했습니다')
      }
    }

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer()
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
      }
    }
  }, [videoId, onTimeUpdate])

  // 비디오가 없을 때
  if (!url) {
    return (
      <Card className={`p-6 bg-muted/30 ${className}`}>
        <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-2">
          <Play className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            영상이 설정되지 않았습니다
          </p>
        </div>
      </Card>
    )
  }

  // YouTube가 아닌 경우 (로컬/NAS)
  if (!videoId) {
    return (
      <Card className={`p-6 bg-muted/30 ${className}`}>
        <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-2">
          <Play className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            YouTube 영상만 지원됩니다
          </p>
          <p className="text-xs text-muted-foreground">URL: {url}</p>
        </div>
      </Card>
    )
  }

  const useHourFormat = duration >= 3600
  const currentTimeStr = secondsToTimeString(currentTime, useHourFormat)
  const durationStr = secondsToTimeString(duration, useHourFormat)

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Video Player */}
      <Card className="overflow-hidden bg-black">
        <div className="aspect-video w-full relative min-h-[400px]">
          <div
            id={`youtube-player-${videoId}`}
            className="absolute inset-0 w-full h-full"
          />
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-3 bg-red-500/10 border-red-500/20">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-sm">{error}</span>
          </div>
        </Card>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="p-2 bg-muted/50">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Video ID: {videoId}</div>
            <div>Source: {videoSource || 'unknown'}</div>
            <div className="break-all">URL: {url}</div>
            <div>Ready: {isReady ? 'Yes' : 'No'}</div>
          </div>
        </Card>
      )}

      {/* Timestamp Display */}
      {isReady && duration > 0 && (
        <Card className="p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">현재 타임코드</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="font-mono text-base px-3 py-1"
              >
                {currentTimeStr}
              </Badge>
              <span className="text-xs text-muted-foreground">
                / {durationStr}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground text-center">
        영상을 재생하면서 구간 시작/종료 시간을 설정할 수 있습니다
      </p>
    </div>
  )
}
