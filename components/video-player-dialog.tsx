"use client"

import { useEffect, useRef, useState } from "react"
import { Rnd } from "react-rnd"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, RotateCcw, PictureInPicture2, Clock, ChevronDown, ChevronUp } from "lucide-react"
import type { Day } from "@/lib/supabase"
import { parseTimeToSeconds } from "@/lib/utils/time-parser"
import { formatTimecode } from "@/lib/timecode-utils"
import { toast } from "sonner"

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 700

interface VideoPlayerDialogProps {
  day: Day | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  initialTime?: string
}

export function VideoPlayerDialog({
  day,
  isOpen,
  onOpenChange,
  initialTime,
}: VideoPlayerDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPipMode, setIsPipMode] = useState(false)

  // 타임코드 입력 상태
  const [showTimecodePanel, setShowTimecodePanel] = useState(false)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [handNumber, setHandNumber] = useState("")
  const [handDescription, setHandDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const PIP_WIDTH = 480
  const PIP_HEIGHT = 270

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && !isPipMode) {
      setPosition({
        x: (window.innerWidth - size.width) / 2,
        y: (window.innerHeight - size.height) / 2,
      })
    }
  }, [isOpen])

  const resetSize = () => {
    setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
    setPosition({
      x: (window.innerWidth - DEFAULT_WIDTH) / 2,
      y: (window.innerHeight - DEFAULT_HEIGHT) / 2,
    })
    setIsPipMode(false)
  }

  const handlePictureInPicture = () => {
    if (typeof window === 'undefined') return

    if (isPipMode) {
      setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
      setPosition({
        x: (window.innerWidth - DEFAULT_WIDTH) / 2,
        y: (window.innerHeight - DEFAULT_HEIGHT) / 2,
      })
      setIsPipMode(false)
      toast.success('일반 모드로 전환되었습니다')
    } else {
      setSize({ width: PIP_WIDTH, height: PIP_HEIGHT })
      setPosition({
        x: window.innerWidth - PIP_WIDTH - 20,
        y: window.innerHeight - PIP_HEIGHT - 20,
      })
      setIsPipMode(true)
      toast.success('PIP 모드로 전환되었습니다')
    }
  }

  // 현재 재생 시간 가져오기
  const getCurrentTime = (): number => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      // YouTube player
      return Math.floor(playerRef.current.getCurrentTime())
    } else if (videoRef.current) {
      // HTML5 video
      return Math.floor(videoRef.current.currentTime)
    }
    return 0
  }

  // 현재 시간을 시작 타임코드로 캡처
  const captureStartTime = () => {
    const currentSeconds = getCurrentTime()
    const formatted = formatTimecode(currentSeconds)
    setStartTime(formatted)
    toast.success(`시작 타임코드: ${formatted}`)
  }

  // 현재 시간을 종료 타임코드로 캡처
  const captureEndTime = () => {
    const currentSeconds = getCurrentTime()
    const formatted = formatTimecode(currentSeconds)
    setEndTime(formatted)
    toast.success(`종료 타임코드: ${formatted}`)
  }

  // 타임코드 제출
  const handleSubmitTimecode = async () => {
    if (!day?.id) {
      toast.error('영상 정보를 찾을 수 없습니다')
      return
    }

    if (!startTime.trim()) {
      toast.error('시작 타임코드를 입력해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/timecodes/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: day.id,
          startTime: startTime.trim(),
          endTime: endTime.trim() || null,
          handNumber: handNumber.trim() || null,
          description: handDescription.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '타임코드 제출에 실패했습니다')
      }

      toast.success('타임코드가 제출되었습니다! 관리자 승인 후 처리됩니다.')

      // 입력 필드 초기화
      setStartTime('')
      setEndTime('')
      setHandNumber('')
      setHandDescription('')
      setShowTimecodePanel(false)
    } catch (error) {
      console.error('Timecode submission error:', error)
      toast.error(error instanceof Error ? error.message : '타임코드 제출에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const videoId =
    day?.video_source === "youtube" && day?.video_url
      ? getYouTubeId(day.video_url)
      : null

  const startTimeSeconds = initialTime ? parseTimeToSeconds(initialTime) : 0

  useEffect(() => {
    if (!videoId || !isOpen) return

    if (!(window as any).YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    const initPlayer = () => {
      if (!iframeRef.current) return

      playerRef.current = new (window as any).YT.Player(iframeRef.current, {
        videoId: videoId,
        playerVars: {
          start: startTimeSeconds,
          autoplay: 1,
        },
        events: {
          onReady: () => {
            setIsPlayerReady(true)
            if (startTimeSeconds > 0 && playerRef.current) {
              playerRef.current.seekTo(startTimeSeconds, true)
            }
          },
        },
      })
    }

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer()
    } else {
      ;(window as any).onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
      }
    }
  }, [videoId, isOpen, startTimeSeconds])

  useEffect(() => {
    if (!videoRef.current || !isOpen) return
    if (!day || (day.video_source !== "upload" && day.video_source !== "nas"))
      return

    const video = videoRef.current

    const handleLoadedMetadata = () => {
      if (startTimeSeconds > 0) {
        video.currentTime = startTimeSeconds
        video.play()
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)

    if (video.readyState >= 1) {
      handleLoadedMetadata()
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
    }
  }, [day, isOpen, startTimeSeconds])

  if (!isOpen) return null

  if (!day) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => onOpenChange(false)}
        />

        <Rnd
          size={size}
          position={position}
          onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
          onResizeStop={(e, direction, ref, delta, position) => {
            setSize({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height),
            })
            setPosition(position)
          }}
          minWidth={400}
          minHeight={300}
          bounds="window"
          className="z-50"
        >
          <div className="bg-background border rounded-lg shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
              <h2 className="text-title font-semibold">영상 플레이어</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center">
              <p className="text-body text-muted-foreground">영상이 없습니다.</p>
            </div>
          </div>
        </Rnd>
      </>
    )
  }

  return (
    <>
      {!isPipMode && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => onOpenChange(false)}
        />
      )}

      <Rnd
        size={size}
        position={position}
        onDragStop={(e, d) => setPosition({ x: d.x, y: d.y })}
        onResizeStop={(e, direction, ref, delta, position) => {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          })
          setPosition(position)
          setIsPipMode(false)
        }}
        minWidth={400}
        minHeight={300}
        bounds="window"
        className={isPipMode ? "z-[100]" : "z-50"}
        disableDragging={false}
      >
        <div className="bg-background border rounded-lg shadow-2xl flex flex-col h-full">
          <div className={`flex items-center justify-between border-b bg-muted/50 cursor-move ${isPipMode ? 'p-1' : 'p-3'}`}>
            {!isPipMode && (
              <h2 className="text-title font-semibold">{day.name || "영상 플레이어"}</h2>
            )}
            <div className={`flex items-center gap-1 ${isPipMode ? 'ml-auto' : ''}`}>
              {!isPipMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={resetSize}
                  title="기본 크기로"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className={isPipMode ? "h-6 w-6 p-0" : "h-8 w-8 p-0"}
                onClick={handlePictureInPicture}
                title={isPipMode ? "일반 모드로" : "PIP 모드로"}
              >
                <PictureInPicture2 className={isPipMode ? "h-3 w-3" : "h-4 w-4"} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={isPipMode ? "h-6 w-6 p-0" : "h-8 w-8 p-0"}
                onClick={() => onOpenChange(false)}
              >
                <X className={isPipMode ? "h-3 w-3" : "h-4 w-4"} />
              </Button>
            </div>
          </div>

          <div className={`flex-1 overflow-auto bg-black ${isPipMode ? 'p-0' : 'p-4'}`}>
            {day.video_source === "youtube" && day.video_url && videoId && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-full max-w-full" style={{ aspectRatio: '16/9' }}>
                  <div
                    id="youtube-player"
                    ref={iframeRef}
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {day.video_source === "upload" && day.video_file && (
              <div className="w-full h-full flex items-center justify-center">
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
            )}

            {day.video_source === "nas" && day.video_nas_path && (
              <div className="w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={`/api/nas-video?path=${encodeURIComponent(
                    day.video_nas_path
                  )}`}
                  controls
                  className="w-full h-full"
                  controlsList="nodownload"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {!day.video_url && !day.video_file && !day.video_nas_path && (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-body text-muted-foreground">
                  영상을 사용할 수 없습니다.
                </p>
              </div>
            )}
          </div>

          {/* 타임코드 입력 패널 (PIP 모드가 아닐 때만 표시) */}
          {!isPipMode && (
            <div className="border-t bg-muted/30">
              <button
                onClick={() => setShowTimecodePanel(!showTimecodePanel)}
                className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">핸드 타임코드 입력</span>
                </div>
                {showTimecodePanel ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showTimecodePanel && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 시작 타임코드 */}
                    <div className="space-y-1.5">
                      <Label htmlFor="start-time" className="text-xs">
                        시작 시간 <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="start-time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          placeholder="00:00"
                          className="text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={captureStartTime}
                          title="현재 시간 캡처"
                        >
                          <Clock className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* 종료 타임코드 */}
                    <div className="space-y-1.5">
                      <Label htmlFor="end-time" className="text-xs">
                        종료 시간 (선택)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="end-time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          placeholder="00:00"
                          className="text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={captureEndTime}
                          title="현재 시간 캡처"
                        >
                          <Clock className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 핸드 번호 */}
                  <div className="space-y-1.5">
                    <Label htmlFor="hand-number" className="text-xs">
                      핸드 번호 (선택)
                    </Label>
                    <Input
                      id="hand-number"
                      value={handNumber}
                      onChange={(e) => setHandNumber(e.target.value)}
                      placeholder="예: #45"
                      maxLength={50}
                      className="text-sm"
                    />
                  </div>

                  {/* 설명 */}
                  <div className="space-y-1.5">
                    <Label htmlFor="hand-description" className="text-xs">
                      설명 (선택)
                    </Label>
                    <Textarea
                      id="hand-description"
                      value={handDescription}
                      onChange={(e) => setHandDescription(e.target.value)}
                      placeholder="예: AA vs KK all-in preflop"
                      rows={2}
                      maxLength={500}
                      className="text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {handDescription.length}/500
                    </p>
                  </div>

                  {/* 제출 버튼 */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={handleSubmitTimecode}
                      disabled={isSubmitting || !startTime.trim()}
                      className="flex-1"
                      size="sm"
                    >
                      {isSubmitting ? '제출 중...' : '타임코드 제출'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStartTime('')
                        setEndTime('')
                        setHandNumber('')
                        setHandDescription('')
                      }}
                      disabled={isSubmitting}
                      size="sm"
                    >
                      초기화
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    💡 현재 재생 중인 시간을 캡처하려면{' '}
                    <Clock className="inline h-3 w-3" /> 버튼을 클릭하세요.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Rnd>
    </>
  )
}
