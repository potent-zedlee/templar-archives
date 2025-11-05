/**
 * Video Player with Timestamp
 *
 * YouTube 및 로컬 비디오 재생 + 현재 타임코드 실시간 표시
 * 비디오 구간 설정 시 사용
 */

'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Play, Loader2 } from 'lucide-react'
import { secondsToTimeString } from '@/lib/types/video-segments'

// SSR 방지를 위한 dynamic import
const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  ),
})

interface VideoPlayerWithTimestampProps {
  videoUrl?: string
  videoSource?: 'youtube' | 'upload' | 'nas'
  videoFile?: string
  videoNasPath?: string
  onTimeUpdate?: (currentTime: number) => void
  className?: string
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
  const playerRef = useRef<ReactPlayer>(null)

  // 비디오 URL 결정
  const getVideoUrl = () => {
    if (videoSource === 'youtube' && videoUrl) {
      return videoUrl
    }
    if (videoSource === 'upload' && videoFile) {
      return videoFile // Supabase Storage URL
    }
    if (videoSource === 'nas' && videoNasPath) {
      return videoNasPath
    }
    // 폴백: videoUrl 사용
    return videoUrl
  }

  const url = getVideoUrl()

  // 재생 진행 상황 업데이트
  const handleProgress = (state: { playedSeconds: number }) => {
    const time = Math.floor(state.playedSeconds)
    setCurrentTime(time)
    if (onTimeUpdate) {
      onTimeUpdate(time)
    }
  }

  // 비디오 준비 완료
  const handleReady = () => {
    setIsReady(true)
    const player = playerRef.current
    if (player) {
      setDuration(player.getDuration())
    }
  }

  // 비디오가 없을 때
  if (!url) {
    return (
      <Card className={`p-6 bg-muted/30 ${className}`}>
        <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-2">
          <Play className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            영상이 설정되지 않았습니다
          </p>
        </div>
      </Card>
    )
  }

  // 타임코드 형식 결정 (1시간 이상이면 HH:MM:SS)
  const useHourFormat = duration >= 3600
  const currentTimeStr = secondsToTimeString(currentTime, useHourFormat)
  const durationStr = secondsToTimeString(duration, useHourFormat)

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Video Player */}
      <Card className="overflow-hidden bg-black">
        <div className="aspect-video w-full">
          <ReactPlayer
            ref={playerRef}
            url={url}
            controls
            width="100%"
            height="100%"
            onReady={handleReady}
            onProgress={handleProgress}
            progressInterval={500} // 0.5초마다 업데이트
            config={{
              youtube: {
                playerVars: {
                  modestbranding: 1,
                  rel: 0,
                },
              },
            }}
          />
        </div>
      </Card>

      {/* Timestamp Display */}
      {isReady && (
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
