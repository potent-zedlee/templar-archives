"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { YouTubePlayer } from "@/components/video/youtube-player"
import { SegmentManager } from "@/components/video/segment-manager"
import { TimeSegment, calculateTotalAnalysisTime, formatTime } from "@/types/segments"
import { JobStatus } from "@/components/hae/job-status"
import { ArrowLeft } from "lucide-react"

export default function AnalyzePage() {
  const [videoUrl, setVideoUrl] = useState("")
  const [segments, setSegments] = useState<TimeSegment[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const [jobId, setJobId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (segments.length === 0) {
      alert("최소 1개의 분석 구간을 추가해주세요")
      return
    }

    setIsLoading(true)

    const { startHaeAnalysis } = await import('@/app/actions/hae-analysis')
    const result = await startHaeAnalysis({
      videoUrl,
      segments,
    })

    setIsLoading(false)

    if (result.success && result.jobId) {
      setJobId(result.jobId)
    } else {
      alert(`분석 시작 실패: ${result.error}`)
    }
  }

  const extractVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const videoId = extractVideoId(videoUrl)

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">HAE - 영상 분석</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* URL 입력 */}
          <Card>
            <CardHeader>
              <CardTitle>YouTube 영상 URL</CardTitle>
              <CardDescription>
                Triton Poker 영상 URL을 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">YouTube URL</Label>
                  <Input
                    id="videoUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  {videoId && (
                    <p className="text-sm text-muted-foreground">
                      비디오 ID: {videoId}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {videoId && (
            <>
              {/* YouTube 플레이어 */}
              <Card>
                <CardHeader>
                  <CardTitle>비디오 플레이어</CardTitle>
                  <CardDescription>
                    플레이어로 구간을 찾아 아래에서 시작/종료 지점을 지정하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <YouTubePlayer
                    videoId={videoId}
                    onTimeUpdate={setCurrentTime}
                    onDurationChange={setVideoDuration}
                  />
                </CardContent>
              </Card>

              {/* 구간 관리 */}
              <SegmentManager
                segments={segments}
                onChange={setSegments}
                currentTime={currentTime}
                videoDuration={videoDuration}
              />

              {/* 분석 시작 버튼 */}
              {!jobId && (
                <Card>
                  <CardContent className="pt-6">
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading || segments.length === 0}
                      size="lg"
                      className="w-full"
                    >
                      {isLoading ? "분석 중..." :
                       segments.length > 0
                         ? `분석 시작 (총 ${formatTime(calculateTotalAnalysisTime(segments))})`
                         : "최소 1개의 구간을 추가하세요"
                      }
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* 분석 진행 상황 */}
              {jobId && (
                <JobStatus jobId={jobId} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
