"use client"

import { useEffect, useRef } from "react"
import type { Day } from "@/lib/supabase"

interface VideoPlayerProps {
  day: Day | null
  onTimeUpdate?: (time: number) => void
  seekTime?: number | null
}

export function VideoPlayer({ day, onTimeUpdate, seekTime }: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)

  // YouTube video ID 추출 (항상 실행)
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const videoId = day?.video_source === 'youtube' && day?.video_url
    ? getYouTubeId(day.video_url)
    : null

  // YouTube IFrame API 초기화 (항상 실행)
  useEffect(() => {
    if (!videoId || !onTimeUpdate) return

    // YouTube IFrame API 로드
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

    // API 준비되면 Player 초기화
    ;(window as any).onYouTubeIframeAPIReady = () => {
      if (!iframeRef.current) return

      playerRef.current = new (window as any).YT.Player(iframeRef.current, {
        events: {
          onReady: () => {
            // 1초마다 현재 시간 업데이트
            const interval = setInterval(() => {
              if (playerRef.current && playerRef.current.getCurrentTime) {
                const currentTime = playerRef.current.getCurrentTime()
                onTimeUpdate(currentTime)
              }
            }, 1000)

            return () => clearInterval(interval)
          },
        },
      })
    }
  }, [videoId, onTimeUpdate])

  // Upload/NAS video timeupdate 이벤트 리스너 (항상 실행)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !onTimeUpdate) return
    if (!day || (day.video_source !== 'upload' && day.video_source !== 'nas')) return

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => video.removeEventListener('timeupdate', handleTimeUpdate)
  }, [day, onTimeUpdate])

  // Seek to specific time when seekTime changes
  useEffect(() => {
    if (seekTime === null || seekTime === undefined) return

    // YouTube video
    if (day?.video_source === 'youtube' && playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seekTime, true)
    }

    // Upload/NAS video
    if ((day?.video_source === 'upload' || day?.video_source === 'nas') && videoRef.current) {
      videoRef.current.currentTime = seekTime
      videoRef.current.play()
    }
  }, [seekTime, day])

  // Early return은 모든 hooks 다음에
  if (!day) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-body-lg text-muted-foreground">
            Select a day to view video
          </p>
        </div>
      </div>
    )
  }

  // YouTube video
  if (day.video_source === 'youtube' && day.video_url && videoId) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }

  // Uploaded file (Supabase Storage)
  if (day.video_source === 'upload' && day.video_file) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={day.video_file}
          controls
          className="w-full h-full"
          controlsList="nodownload"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // NAS file
  if (day.video_source === 'nas' && day.video_nas_path) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={`/api/nas-video?path=${encodeURIComponent(day.video_nas_path)}`}
          controls
          className="w-full h-full"
          controlsList="nodownload"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  // No video available
  return (
    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
      <div className="text-center">
        <p className="text-body-lg text-muted-foreground">
          No video available
        </p>
      </div>
    </div>
  )
}
