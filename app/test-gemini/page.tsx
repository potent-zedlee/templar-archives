"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, PlayCircle, AlertCircle, CheckCircle2, Key } from "lucide-react"

interface HaeResult {
  hands: any[]
  rawResponse: string
  error?: string
}

interface AnalysisResponse {
  success: boolean
  results?: HaeResult[]
  error?: string
}

// hh:mm:ss를 초로 변환
function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":")
  if (parts.length === 3) {
    const [hh, mm, ss] = parts.map(Number)
    return hh * 3600 + mm * 60 + ss
  } else if (parts.length === 2) {
    const [mm, ss] = parts.map(Number)
    return mm * 60 + ss
  } else if (parts.length === 1) {
    return Number(parts[0]) || 0
  }
  return 0
}

// 초를 hh:mm:ss로 변환
function secondsToTime(seconds: number): string {
  const hh = Math.floor(seconds / 3600)
  const mm = Math.floor((seconds % 3600) / 60)
  const ss = seconds % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
}

export default function TestGeminiPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [startTime, setStartTime] = useState("00:00:00")
  const [endTime, setEndTime] = useState("00:01:00")
  const [platform, setPlatform] = useState("ept")
  const [apiKey, setApiKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResponse | null>(null)

  // localStorage에서 API 키 불러오기
  useEffect(() => {
    const savedApiKey = localStorage.getItem("gemini_api_key")
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
  }, [])

  // API 키 저장
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey.trim())
      alert("API 키가 저장되었습니다!")
    }
  }

  const handleAnalyze = async () => {
    if (!youtubeUrl.trim()) {
      alert("YouTube URL을 입력해주세요!")
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const startSeconds = timeToSeconds(startTime)
      const endSeconds = timeToSeconds(endTime)

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      // API 키가 입력되어 있으면 헤더에 추가
      if (apiKey.trim()) {
        headers["X-Google-API-Key"] = apiKey.trim()
      }

      const response = await fetch("/api/hae/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          youtubeUrl: youtubeUrl.trim(),
          segments: [
            {
              start: startSeconds,
              end: endSeconds,
              label: "Test Segment",
            },
          ],
          platform: platform,
          apiKey: apiKey.trim() || undefined,
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("분석 오류:", error)
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Gemini YouTube 분석 테스트</h1>
          <p className="text-muted-foreground">
            YouTube URL을 입력하고 Gemini API로 포커 핸드를 분석합니다
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>분석 설정</CardTitle>
            <CardDescription>
              테스트할 YouTube 영상과 분석 구간을 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Gemini API 키 (선택사항)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type="password"
                  placeholder="AIzaSy... (비어있으면 환경변수 사용)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveApiKey}
                  disabled={isLoading || !apiKey.trim()}
                >
                  저장
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                API 키는 브라우저에만 저장됩니다. 환경변수에 설정되어 있으면 생략 가능합니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">시작 시간 (hh:mm:ss)</Label>
                <Input
                  id="start-time"
                  type="text"
                  placeholder="00:00:00"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time">종료 시간 (hh:mm:ss)</Label>
                <Input
                  id="end-time"
                  type="text"
                  placeholder="00:01:00"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">플랫폼</Label>
              <Select value={platform} onValueChange={setPlatform} disabled={isLoading}>
                <SelectTrigger id="platform">
                  <SelectValue placeholder="플랫폼 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ept">EPT (European Poker Tour)</SelectItem>
                  <SelectItem value="triton">Triton Poker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !youtubeUrl.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  분석 시작
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    분석 완료
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    분석 실패
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.success && result.results && result.results.length > 0 ? (
                <div className="space-y-4">
                  {result.results.map((segmentResult, idx) => (
                    <div key={idx} className="space-y-2">
                      <h3 className="font-semibold text-lg">세그먼트 #{idx + 1} 결과</h3>

                      {segmentResult.error ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>오류</AlertTitle>
                          <AlertDescription>{segmentResult.error}</AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>추출된 핸드</AlertTitle>
                            <AlertDescription>
                              {segmentResult.hands.length}개의 핸드가 발견되었습니다
                            </AlertDescription>
                          </Alert>

                          {segmentResult.hands.length > 0 && (
                            <div className="space-y-2">
                              <Label>핸드 데이터 (JSON)</Label>
                              <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
                                {JSON.stringify(segmentResult.hands, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Gemini 원본 응답</Label>
                            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
                              {segmentResult.rawResponse || "응답 없음"}
                            </pre>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>오류</AlertTitle>
                  <AlertDescription>
                    {result.error || "알 수 없는 오류가 발생했습니다"}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm">참고 사항</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>YouTube URL은 공개 동영상이어야 합니다</li>
              <li>시간은 hh:mm:ss 형식으로 입력합니다 (예: 00:01:00 = 1분)</li>
              <li>mm:ss 또는 ss 형식도 지원됩니다 (예: 01:30 = 1분 30초)</li>
              <li>최대 1시간(3600초) 세그먼트가 자동으로 분할됩니다</li>
              <li>Gemini API 키는 선택사항입니다 (.env.local에 설정되어 있으면 생략 가능)</li>
              <li>API 키를 입력하면 브라우저 localStorage에 저장됩니다</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
