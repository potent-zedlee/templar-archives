"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TimeSegment, formatTime, parseTimestamp, calculateTotalAnalysisTime } from "@/types/segments"
import { Trash2, Plus } from "lucide-react"

interface SegmentManagerProps {
  segments: TimeSegment[]
  onChange: (segments: TimeSegment[]) => void
  currentTime: number
  videoDuration?: number
}

export function SegmentManager({ segments, onChange, currentTime, videoDuration }: SegmentManagerProps) {
  const [startInput, setStartInput] = useState("")
  const [endInput, setEndInput] = useState("")
  const [label, setLabel] = useState("")

  const addSegment = () => {
    const start = startInput ? parseTimestamp(startInput) : 0
    const end = endInput ? parseTimestamp(endInput) : currentTime

    if (end <= start) {
      alert("종료 시간은 시작 시간보다 커야 합니다")
      return
    }

    const newSegment: TimeSegment = {
      id: crypto.randomUUID(),
      type: 'gameplay',
      start,
      end,
      label: label || undefined
    }

    onChange([...segments, newSegment])
    setStartInput("")
    setEndInput("")
    setLabel("")
  }

  const removeSegment = (id: string) => {
    onChange(segments.filter(s => s.id !== id))
  }

  const setCurrentAsStart = () => {
    setStartInput(formatTime(currentTime))
  }

  const setCurrentAsEnd = () => {
    setEndInput(formatTime(currentTime))
  }

  const totalAnalysisTime = calculateTotalAnalysisTime(segments)

  return (
    <Card>
      <CardHeader>
        <CardTitle>분석 구간 설정</CardTitle>
        <CardDescription>
          실제 게임 플레이 구간만 지정하여 분석 시간을 단축하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 구간 추가 폼 */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">시작 시간 (HH:MM:SS)</Label>
              <div className="flex gap-2">
                <Input
                  id="start"
                  placeholder="00:00:00"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={setCurrentAsStart}
                  className="shrink-0"
                >
                  현재
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end">종료 시간 (HH:MM:SS)</Label>
              <div className="flex gap-2">
                <Input
                  id="end"
                  placeholder="00:00:00"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={setCurrentAsEnd}
                  className="shrink-0"
                >
                  현재
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">구간 라벨 (선택사항)</Label>
            <Input
              id="label"
              placeholder="예: Day 1 - Session 1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <Button onClick={addSegment} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            구간 추가
          </Button>
        </div>

        {/* 추가된 구간 목록 */}
        {segments.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">추가된 구간 ({segments.length}개)</h4>
              <p className="text-sm text-muted-foreground">
                총 분석 시간: {formatTime(totalAnalysisTime)}
              </p>
            </div>

            <div className="space-y-2">
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        구간 {index + 1}
                      </span>
                      {segment.label && (
                        <span className="text-xs text-muted-foreground">
                          - {segment.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatTime(segment.start)} ~ {formatTime(segment.end)}
                      <span className="ml-2">
                        (길이: {formatTime(segment.end - segment.start)})
                      </span>
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSegment(segment.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {videoDuration && (
              <div className="text-sm text-muted-foreground bg-accent/10 p-3 rounded-lg">
                <p>
                  전체 영상: {formatTime(videoDuration)} →
                  분석 구간: {formatTime(totalAnalysisTime)} ({' '}
                  {Math.round((totalAnalysisTime / videoDuration) * 100)}% 단축)
                </p>
              </div>
            )}
          </div>
        )}

        {segments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>아직 추가된 구간이 없습니다</p>
            <p className="text-sm mt-1">
              플레이어로 구간을 찾아 "현재" 버튼을 눌러 시작/종료 지점을 지정하세요
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
