"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimeSegment, SegmentType, formatTime, parseTimestamp, calculateTotalAnalysisTime } from "@/types/segments"
import { Trash2, Plus, Clock, Video, Gamepad2, Coffee, Film } from "lucide-react"
import { cn } from "@/lib/utils"

interface SegmentManagerProps {
  segments: TimeSegment[]
  onChange: (segments: TimeSegment[]) => void
  currentTime: number
  videoDuration?: number
}

// Segment type configuration
const SEGMENT_TYPES: Record<SegmentType, { label: string; icon: any; color: string; bgColor: string }> = {
  countdown: {
    label: '카운트다운',
    icon: Clock,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800'
  },
  opening: {
    label: '오프닝',
    icon: Video,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  gameplay: {
    label: '게임플레이',
    icon: Gamepad2,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  break: {
    label: '브레이크',
    icon: Coffee,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
  },
  ending: {
    label: '엔딩',
    icon: Film,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
}

export function SegmentManager({ segments, onChange, currentTime, videoDuration }: SegmentManagerProps) {
  const [startInput, setStartInput] = useState("")
  const [endInput, setEndInput] = useState("")
  const [label, setLabel] = useState("")
  const [selectedType, setSelectedType] = useState<SegmentType>('gameplay')

  const addSegment = () => {
    const start = startInput ? parseTimestamp(startInput) : 0
    const end = endInput ? parseTimestamp(endInput) : currentTime

    if (end <= start) {
      alert("종료 시간은 시작 시간보다 커야 합니다")
      return
    }

    const newSegment: TimeSegment = {
      id: crypto.randomUUID(),
      type: selectedType,
      start,
      end,
      label: label || undefined
    }

    onChange([...segments, newSegment])
    setStartInput("")
    setEndInput("")
    setLabel("")
    setSelectedType('gameplay') // Reset to gameplay
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
          {/* Segment Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="type">세그먼트 타입</Label>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as SegmentType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SEGMENT_TYPES).map(([type, config]) => {
                  const Icon = config.icon
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", config.color)} />
                        <span>{config.label}</span>
                        {type === 'gameplay' && (
                          <span className="text-xs text-muted-foreground">(분석 대상)</span>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

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
              {segments.map((segment, index) => {
                const typeConfig = SEGMENT_TYPES[segment.type]
                const Icon = typeConfig.icon
                return (
                  <div
                    key={segment.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border-2",
                      typeConfig.bgColor,
                      segment.type === 'gameplay' && 'border-green-500'
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", typeConfig.color)} />
                        <span className={cn("text-sm font-medium", typeConfig.color)}>
                          {typeConfig.label}
                        </span>
                        {segment.type === 'gameplay' && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                            분석 대상
                          </span>
                        )}
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
                )
              })}
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
