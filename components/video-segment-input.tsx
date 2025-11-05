/**
 * Video Segment Input Component
 *
 * 비디오 세그먼트 (구간) 입력 UI
 * Analysis-logic.md의 영상 구간 설정 기능 구현
 */

'use client'

import { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type {
  VideoSegment,
  SegmentType,
} from '@/lib/types/video-segments'
import {
  calculateSegmentDuration,
  getSegmentColor,
  getSegmentTypeLabel,
  validateSegment,
  secondsToTimeString,
} from '@/lib/types/video-segments'

interface VideoSegmentInputProps {
  segments: VideoSegment[]
  onChange: (segments: VideoSegment[]) => void
  className?: string
}

export function VideoSegmentInput({ segments, onChange, className }: VideoSegmentInputProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Add segment
  const handleAddSegment = () => {
    const newSegment: VideoSegment = {
      id: Date.now().toString(),
      type: 'gameplay',
      startTime: '00:00',
      endTime: '10:00',
    }

    onChange([...segments, newSegment])
  }

  // Remove segment
  const handleRemoveSegment = (id: string) => {
    onChange(segments.filter((s) => s.id !== id))

    // Remove error for this segment
    const newErrors = { ...errors }
    delete newErrors[id]
    setErrors(newErrors)
  }

  // Update segment
  const handleUpdateSegment = (
    id: string,
    field: keyof VideoSegment,
    value: string
  ) => {
    const updated = segments.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    )
    onChange(updated)

    // Validate
    const segment = updated.find((s) => s.id === id)
    if (segment && (field === 'startTime' || field === 'endTime')) {
      const error = validateSegment(segment)
      setErrors((prev) => ({
        ...prev,
        [id]: error || '',
      }))
    }
  }

  // Load template
  const handleLoadTemplate = () => {
    const template: VideoSegment[] = [
      {
        id: '1',
        type: 'countdown',
        startTime: '00:00',
        endTime: '00:30',
        label: 'Countdown',
      },
      {
        id: '2',
        type: 'opening',
        startTime: '00:30',
        endTime: '03:00',
        label: 'Opening',
      },
      {
        id: '3',
        type: 'gameplay',
        startTime: '03:00',
        endTime: '45:00',
        label: 'Game 1',
      },
    ]
    onChange(template)
    setErrors({})
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          영상 구간 설정
        </Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadTemplate}
          >
            템플릿 불러오기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSegment}
          >
            <Plus className="h-4 w-4 mr-1" />
            추가
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        게임플레이 구간만 AI 분석됩니다. 시간 형식: MM:SS 또는 HH:MM:SS
      </p>

      {segments.length === 0 ? (
        <Card className="p-6 bg-muted/30">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">아직 구간이 설정되지 않았습니다</p>
            <p className="text-xs">
              "템플릿 불러오기"로 시작하거나 "추가" 버튼으로 직접 설정하세요
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {segments.map((segment, index) => {
            const duration = calculateSegmentDuration(segment)
            const durationStr = secondsToTimeString(duration)
            const error = errors[segment.id]

            return (
              <Card
                key={segment.id}
                className="p-3"
                style={{
                  borderLeft: `4px solid ${getSegmentColor(segment.type)}`,
                }}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                      <Badge
                        style={{
                          backgroundColor: getSegmentColor(segment.type),
                        }}
                        className="text-white"
                      >
                        {getSegmentTypeLabel(segment.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {durationStr}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRemoveSegment(segment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Type & Label */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">타입</Label>
                      <Select
                        value={segment.type}
                        onValueChange={(value) =>
                          handleUpdateSegment(segment.id, 'type', value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="countdown">카운트다운</SelectItem>
                          <SelectItem value="opening">오프닝</SelectItem>
                          <SelectItem value="gameplay">게임플레이</SelectItem>
                          <SelectItem value="break">브레이크</SelectItem>
                          <SelectItem value="ending">엔딩</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">라벨 (선택)</Label>
                      <Input
                        value={segment.label || ''}
                        onChange={(e) =>
                          handleUpdateSegment(segment.id, 'label', e.target.value)
                        }
                        placeholder="예: Game 1"
                        className="h-8"
                      />
                    </div>
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">시작</Label>
                      <Input
                        value={segment.startTime}
                        onChange={(e) =>
                          handleUpdateSegment(segment.id, 'startTime', e.target.value)
                        }
                        placeholder="MM:SS"
                        className="h-8 font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">종료</Label>
                      <Input
                        value={segment.endTime}
                        onChange={(e) =>
                          handleUpdateSegment(segment.id, 'endTime', e.target.value)
                        }
                        placeholder="MM:SS"
                        className="h-8 font-mono"
                      />
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-xs text-red-500">{error}</p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {segments.length > 0 && (
        <Card className="p-3 mt-4 bg-blue-500/10 border-blue-500/20">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">전체 구간:</span>
              <span className="font-medium">{segments.length}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">게임플레이 구간:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {segments.filter((s) => s.type === 'gameplay').length}개
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
