"use client"

/**
 * Analyze Video Dialog
 *
 * Gemini AI를 사용하여 포커 영상에서 핸드 히스토리를 자동 추출하는 다이얼로그
 */

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Users, Plus, X, XCircle } from "lucide-react"
import type { Stream } from "@/lib/supabase"
import { InteractiveTimeline } from "@/components/interactive-video-timeline"
import type { VideoSegment } from "@/lib/types/video-segments"
import { timeStringToSeconds } from "@/lib/types/video-segments"
import { PlayerMatchResults } from "@/components/player-match-results"
import { VideoPlayerWithTimestamp } from "@/components/video-player-with-timestamp"
import { startHaeAnalysis } from "@/app/actions/hae-analysis"
import type { TimeSegment } from "@/types/segments"
import { formatTime } from "@/types/segments"
import { createClientSupabaseClient } from "@/lib/supabase-client"

interface AnalyzeVideoDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  day: Stream | null
  onSuccess?: (hands: any[]) => void
}

interface PlayerInput {
  id: string
  name: string
}

type Platform = "ept" | "triton" | "pokerstars" | "wsop" | "hustler"
type AnalysisStatus = "idle" | "analyzing" | "processing" | "success" | "error"
type JobStatus = "pending" | "processing" | "completed" | "failed"

interface PlayerMatchResult {
  inputName: string
  matchedName: string
  playerId: string
  similarity: number
  confidence: 'high' | 'medium' | 'low'
  isPartialMatch: boolean
}

interface SegmentResult {
  status: 'pending' | 'processing' | 'success' | 'failed'
  segment_id?: string
  hands_found?: number
  error?: string
  processing_time?: number
}

interface AnalysisJob {
  id: string
  status: JobStatus
  progress: number
  hands_found: number
  result?: {
    segment_results?: SegmentResult[]
  }
  error?: string
  created_at: string
  updated_at: string
}

// Constants
const AUTO_CLOSE_DELAY_MS = 3000

export function AnalyzeVideoDialog({
  isOpen,
  onOpenChange,
  day,
  onSuccess
}: AnalyzeVideoDialogProps) {
  const [platform, setPlatform] = useState<Platform>("ept")
  const [players, setPlayers] = useState<PlayerInput[]>([])
  const [segments, setSegments] = useState<VideoSegment[]>([])
  const [status, setStatus] = useState<AnalysisStatus>("idle")
  const [progress, setProgress] = useState("")
  const [error, setError] = useState("")
  const [jobId, setJobId] = useState<string | null>(null)
  const [matchResults, setMatchResults] = useState<PlayerMatchResult[]>([])
  const [, setCurrentVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  // Realtime progress tracking
  const [jobStatus, setJobStatus] = useState<JobStatus>("pending")
  const [progressPercent, setProgressPercent] = useState(0)
  const [handsFound, setHandsFound] = useState(0)
  const [segmentResults, setSegmentResults] = useState<SegmentResult[]>([])
  const [processingTime, setProcessingTime] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)

  // useRef to manage onSuccess callback without causing re-subscriptions
  const onSuccessRef = useRef(onSuccess)

  // Update ref when onSuccess changes
  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  // Subscribe to analysis job updates via Supabase Realtime
  useEffect(() => {
    if (!jobId || status !== "processing") return

    const supabase = createClientSupabaseClient()

    if (process.env.NODE_ENV === 'development') {
      console.log('[AnalyzeVideoDialog] Setting up Realtime subscription for job:', jobId)
    }

    const channel = supabase
      .channel(`analysis-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[AnalyzeVideoDialog] Realtime update received:', payload)
          }
          const job = payload.new as AnalysisJob

          // Update job status
          setJobStatus(job.status)
          setProgressPercent(job.progress || 0)
          setHandsFound(job.hands_found || 0)

          // Update segment results if available
          if (job.result?.segment_results) {
            setSegmentResults(job.result.segment_results)
          }

          // Handle completion
          if (job.status === 'completed') {
            setStatus('success')
            const message = `분석 완료! ${job.hands_found || 0}개의 핸드가 발견되었습니다`
            setProgress(message)
            toast.success(message)

            // Auto close after delay
            setTimeout(() => {
              onSuccessRef.current?.([])
              handleClose()
            }, AUTO_CLOSE_DELAY_MS)
          }

          // Handle failure
          if (job.status === 'failed') {
            setStatus('error')
            setError(job.error || '분석 중 오류가 발생했습니다')
            toast.error(job.error || '분석 중 오류가 발생했습니다')
          }
        }
      )
      .subscribe()

    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[AnalyzeVideoDialog] Cleaning up Realtime subscription for job:', jobId)
      }
      supabase.removeChannel(channel)
    }
  }, [jobId, status])

  // Update processing time
  useEffect(() => {
    if (status !== "processing" || !startTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
      setProcessingTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [status, startTime])

  // Add player
  const handleAddPlayer = () => {
    setPlayers([
      ...players,
      {
        id: Date.now().toString(),
        name: ""
      }
    ])
  }

  // Remove player
  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id))
  }

  // Update player
  const handleUpdatePlayer = (id: string, value: string) => {
    setPlayers(players.map(p =>
      p.id === id ? { ...p, name: value } : p
    ))
  }

  // Start analysis
  const handleAnalyze = async () => {
    if (!day?.video_url) {
      setError("영상 URL이 없습니다")
      return
    }

    setStatus("analyzing")
    setProgress("Gemini AI가 영상을 분석하고 있습니다...")
    setError("")
    setJobId(null)

    try {
      // Filter out empty players
      const validPlayers = players
        .filter(p => p.name.trim())
        .map(p => p.name)

      // Convert VideoSegment[] to TimeSegment[]
      const timeSegments: TimeSegment[] = segments.map(seg => ({
        id: seg.id,
        type: seg.type,
        start: timeStringToSeconds(seg.startTime),
        end: timeStringToSeconds(seg.endTime),
        label: seg.type
      }))

      // Use HAE analysis system
      const result = await startHaeAnalysis({
        videoUrl: day.video_url,
        segments: timeSegments,
        players: validPlayers.length > 0 ? validPlayers : undefined,
        streamId: day.id, // Pass stream (day) ID for linking hands
        platform
      })

      if (!result.success) {
        throw new Error(result.error || "분석에 실패했습니다")
      }

      // Success - transition to processing state
      setJobId(result.jobId ?? null)
      setStatus("processing")
      setStartTime(new Date())
      setProgressPercent(0)
      setHandsFound(0)
      // Initialize segment results with pending status
      setSegmentResults(
        timeSegments.map((seg, idx) => ({
          status: 'pending' as const,
          segment_id: `seg_${idx}_${seg.start}_${seg.end}`,
        }))
      )
      setProgress("분석 작업이 시작되었습니다...")
      toast.success("분석 요청이 접수되었습니다. 실시간으로 진행 상황을 확인할 수 있습니다.")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다")
      toast.error(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다")
    }
  }

  // Reset dialog
  const resetDialog = () => {
    setStatus("idle")
    setProgress("")
    setError("")
    setJobId(null)
    setMatchResults([])
    setJobStatus("pending")
    setProgressPercent(0)
    setHandsFound(0)
    setSegmentResults([])
    setProcessingTime(0)
    setStartTime(null)
  }

  // Handle close
  const handleClose = () => {
    if (status !== "analyzing" && status !== "processing") {
      onOpenChange(false)
      resetDialog()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full !max-w-[60vw] h-auto max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 핸드 히스토리 추출
          </DialogTitle>
          <DialogDescription>
            Gemini AI가 영상을 분석하여 핸드 히스토리를 자동으로 추출합니다
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4">
        {status === "idle" && (
          <div className="flex flex-col md:flex-row gap-6 min-h-0">
            {/* Left Column: Video Player + Timeline */}
            <div className="flex-1 md:flex-[3] space-y-4 overflow-y-auto">
              <VideoPlayerWithTimestamp
                videoUrl={day?.video_url}
                videoSource={day?.video_source}
                videoFile={day?.video_file}
                videoNasPath={day?.video_nas_path}
                onTimeUpdate={setCurrentVideoTime}
                onDurationUpdate={setVideoDuration}
              />

              {/* Interactive Timeline */}
              <InteractiveTimeline
                segments={segments}
                onChange={setSegments}
                totalDuration={videoDuration || 3600}
              />
            </div>

            {/* Right Column: Form */}
            <div className="flex-1 md:flex-[2] space-y-6 overflow-y-auto">
            {/* Platform Selection */}
            <div className="space-y-2">
              <Label>플랫폼 선택</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ept">
                    <div className="flex items-center gap-2">
                      <span>EPT (European Poker Tour)</span>
                      <Badge variant="secondary" className="text-xs">권장</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="triton">
                    <div className="flex items-center gap-2">
                      <span>Triton Poker</span>
                      <Badge variant="secondary" className="text-xs">고액 토너먼트</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="pokerstars">
                    <div className="flex items-center gap-2">
                      <span>PokerStars</span>
                      <Badge variant="secondary" className="text-xs">일반 토너먼트</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="wsop">
                    <div className="flex items-center gap-2">
                      <span>WSOP</span>
                      <Badge variant="secondary" className="text-xs">World Series</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="hustler">
                    <div className="flex items-center gap-2">
                      <span>Hustler Casino Live</span>
                      <Badge variant="secondary" className="text-xs">캐시 게임</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                플랫폼에 따라 최적화된 AI 프롬프트가 사용됩니다
              </p>
            </div>

            {/* Players (Optional) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    플레이어 (선택 사항)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    플레이어를 지정하면 이름 매칭 정확도가 향상됩니다
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPlayer}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>

              {players.length > 0 && (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {players.map((player) => (
                      <div key={player.id} className="flex gap-2">
                        <Input
                          placeholder="플레이어 이름"
                          value={player.name}
                          onChange={(e) => handleUpdatePlayer(player.id, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemovePlayer(player.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Info Card */}
            <Card className="p-4 bg-blue-500/10 border-blue-500/20">
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    Gemini 1.5 Pro AI 사용
                  </p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• 영상 길이: 2-6시간 (게임플레이 구간만 분석)</li>
                    <li>• 처리 시간: 약 2-5분</li>
                    <li>• 자동 핸드 구분 및 추출</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* End Right Column */}
            </div>
          {/* End Grid */}
          </div>
        )}

        {/* Actions Footer - Only show in idle state */}
        {status === "idle" && (
          <div className="px-6 py-4 border-t shrink-0 bg-muted/10">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button onClick={handleAnalyze} disabled={!day?.video_url}>
                <Sparkles className="h-4 w-4 mr-2" />
                분석 시작
              </Button>
            </div>
          </div>
        )}

        {status === "analyzing" && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
                <Sparkles className="h-6 w-6 text-purple-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">분석 요청 중...</p>
                <p className="text-sm text-muted-foreground">{progress}</p>
              </div>
            </div>

            <Card className="p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground text-center">
                잠시만 기다려주세요. 분석 작업을 준비하고 있습니다.
              </p>
            </Card>
          </div>
        )}

        {status === "processing" && (
          <div className="py-8 space-y-6">
            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">분석 진행 중...</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {handsFound}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    발견된 핸드
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {(() => {
                      const totalSegments = Math.max(segments.length, segmentResults.length)
                      const processedSegments = segmentResults.filter(
                        s => s.status === 'success' || s.status === 'failed'
                      ).length
                      return (
                        <>
                          {processedSegments}
                          <span className="text-lg text-muted-foreground">/{totalSegments}</span>
                        </>
                      )
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    처리된 세그먼트
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {formatTime(processingTime)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    처리 시간
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Segment Status */}
            {segmentResults.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  세그먼트 처리 상태
                </h4>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {segmentResults.map((segment, idx) => (
                      <Card key={idx} className="p-3">
                        <div className="flex items-center gap-3">
                          {segment.status === 'pending' && (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                          )}
                          {segment.status === 'processing' && (
                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          )}
                          {segment.status === 'success' && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          {segment.status === 'failed' && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                세그먼트 {idx + 1}
                              </span>
                              {segment.status === 'processing' && (
                                <Badge variant="secondary" className="text-xs">
                                  처리 중
                                </Badge>
                              )}
                              {segment.status === 'success' && (
                                <Badge variant="default" className="text-xs bg-green-500">
                                  완료
                                </Badge>
                              )}
                              {segment.status === 'failed' && (
                                <Badge variant="destructive" className="text-xs">
                                  실패
                                </Badge>
                              )}
                            </div>

                            {segment.hands_found !== undefined && segment.hands_found > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {segment.hands_found}개 핸드 발견
                              </p>
                            )}

                            {segment.error && (
                              <p className="text-xs text-red-500 mt-1">
                                {segment.error}
                              </p>
                            )}
                          </div>

                          {segment.processing_time && (
                            <span className="text-xs text-muted-foreground">
                              {formatTime(segment.processing_time)}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Info Card */}
            <Card className="p-4 bg-purple-500/10 border-purple-500/20">
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium text-purple-700 dark:text-purple-300">
                    AI가 영상을 분석하고 있습니다
                  </p>
                  <p className="text-muted-foreground text-xs">
                    실시간으로 진행 상황이 업데이트됩니다. 완료되면 자동으로 핸드 목록이 갱신됩니다.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {status === "success" && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-green-600 dark:text-green-400">
                  분석 요청이 접수되었습니다
                </p>
                <p className="text-sm text-muted-foreground">{progress}</p>
              </div>
            </div>

            <Card className="p-4 bg-green-500/10 border-green-500/20 space-y-3">
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                핸드 추출이 완료되면 해당 Day의 핸드 목록이 자동으로 갱신됩니다.
                분석이 길어질 경우 2~3분 정도 소요될 수 있습니다.
              </p>
              {jobId && (
                <div className="text-center text-xs text-muted-foreground">
                  Job ID: <span className="font-mono">{jobId}</span>
                </div>
              )}
            </Card>

            {/* Match Results */}
            {matchResults.length > 0 && (
              <PlayerMatchResults results={matchResults} />
            )}

            {/* Close Button */}
            <div className="flex justify-center">
              <Button onClick={handleClose}>
                확인
              </Button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="text-center space-y-2">
                <p className="font-medium text-red-600 dark:text-red-400">
                  분석 실패
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>

            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                닫기
              </Button>
              <Button onClick={() => {
                setStatus("idle")
                setError("")
              }}>
                다시 시도
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
