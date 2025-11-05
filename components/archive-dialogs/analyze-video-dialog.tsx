"use client"

/**
 * Analyze Video Dialog
 *
 * Gemini AI를 사용하여 포커 영상에서 핸드 히스토리를 자동 추출하는 다이얼로그
 */

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Video, Users, Plus, X } from "lucide-react"
import type { Stream } from "@/lib/supabase"

interface AnalyzeVideoDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  day: Stream | null
  onSuccess?: (hands: any[]) => void
}

interface PlayerInput {
  id: string
  name: string
  position: string
}

type Platform = "triton" | "pokerstars" | "wsop" | "hustler"
type AnalysisStatus = "idle" | "analyzing" | "success" | "error"

export function AnalyzeVideoDialog({
  isOpen,
  onOpenChange,
  day,
  onSuccess
}: AnalyzeVideoDialogProps) {
  const [platform, setPlatform] = useState<Platform>("triton")
  const [players, setPlayers] = useState<PlayerInput[]>([])
  const [status, setStatus] = useState<AnalysisStatus>("idle")
  const [progress, setProgress] = useState("")
  const [error, setError] = useState("")
  const [extractedCount, setExtractedCount] = useState(0)

  // Add player
  const handleAddPlayer = () => {
    setPlayers([
      ...players,
      {
        id: Date.now().toString(),
        name: "",
        position: ""
      }
    ])
  }

  // Remove player
  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id))
  }

  // Update player
  const handleUpdatePlayer = (id: string, field: "name" | "position", value: string) => {
    setPlayers(players.map(p =>
      p.id === id ? { ...p, [field]: value } : p
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

    try {
      // Filter out empty players
      const validPlayers = players
        .filter(p => p.name.trim())
        .map(p => ({
          name: p.name,
          position: p.position || undefined
        }))

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          videoUrl: day.video_url,
          platform,
          dayId: day.id,
          players: validPlayers.length > 0 ? validPlayers : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || "분석에 실패했습니다")
      }

      // Success
      setStatus("success")
      setExtractedCount(data.handsExtracted)
      setProgress(`${data.handsExtracted}개의 핸드가 추출되어 데이터베이스에 저장되었습니다`)

      // Callback
      if (onSuccess && data.hands) {
        onSuccess(data.hands)
      }

      // Auto close after 2 seconds
      setTimeout(() => {
        onOpenChange(false)
        resetDialog()
      }, 2000)

    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다")
    }
  }

  // Reset dialog
  const resetDialog = () => {
    setStatus("idle")
    setProgress("")
    setError("")
    setExtractedCount(0)
  }

  // Handle close
  const handleClose = () => {
    if (status !== "analyzing") {
      onOpenChange(false)
      resetDialog()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI 핸드 히스토리 추출
          </DialogTitle>
          <DialogDescription>
            Gemini AI가 영상을 분석하여 핸드 히스토리를 자동으로 추출합니다
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <div className="space-y-6">
            {/* Video Info */}
            {day && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{day.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{day.video_url}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Platform Selection */}
            <div className="space-y-2">
              <Label>플랫폼 선택</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="triton">
                    <div className="flex items-center gap-2">
                      <span>Triton Poker</span>
                      <Badge variant="secondary" className="text-xs">고액 토너먼트</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="pokerstars">
                    <div className="flex items-center gap-2">
                      <span>PokerStars</span>
                      <Badge variant="secondary" className="text-xs">EPT, APPT, UKIPT</Badge>
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
                          onChange={(e) => handleUpdatePlayer(player.id, "name", e.target.value)}
                        />
                        <Select
                          value={player.position}
                          onValueChange={(v) => handleUpdatePlayer(player.id, "position", v)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="포지션" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BTN">BTN</SelectItem>
                            <SelectItem value="SB">SB</SelectItem>
                            <SelectItem value="BB">BB</SelectItem>
                            <SelectItem value="UTG">UTG</SelectItem>
                            <SelectItem value="MP">MP</SelectItem>
                            <SelectItem value="CO">CO</SelectItem>
                            <SelectItem value="HJ">HJ</SelectItem>
                          </SelectContent>
                        </Select>
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

            {/* Actions */}
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
                <p className="font-medium">분석 진행 중...</p>
                <p className="text-sm text-muted-foreground">{progress}</p>
              </div>
            </div>

            <Card className="p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground text-center">
                잠시만 기다려주세요. 영상 길이에 따라 1-3분 소요될 수 있습니다.
              </p>
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
                  분석 완료!
                </p>
                <p className="text-sm text-muted-foreground">{progress}</p>
              </div>
            </div>

            <Card className="p-4 bg-green-500/10 border-green-500/20">
              <div className="text-center space-y-1">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {extractedCount}개
                </p>
                <p className="text-sm text-muted-foreground">핸드가 추출되었습니다</p>
              </div>
            </Card>
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
      </DialogContent>
    </Dialog>
  )
}
