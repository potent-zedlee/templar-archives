/**
 * Interactive Video Timeline Component
 *
 * 드래그 앤 드롭으로 영상 구간을 조절할 수 있는 인터랙티브 타임라인
 */

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { VideoSegment, SegmentType } from '@/lib/types/video-segments'
import {
  timeStringToSeconds,
  secondsToTimeString,
  getSegmentColor,
  getSegmentTypeLabel,
} from '@/lib/types/video-segments'

interface InteractiveTimelineProps {
  segments: VideoSegment[]
  onChange: (segments: VideoSegment[]) => void
  totalDuration?: number
  className?: string
}

type DragState = {
  segmentId: string
  handle: 'start' | 'end' | 'move'
  initialX: number
  initialTime: number
} | null

export function InteractiveTimeline({
  segments,
  onChange,
  totalDuration,
  className,
}: InteractiveTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 전체 길이 계산
  const maxSeconds = totalDuration || (() => {
    let max = 3600 // 기본 1시간
    segments.forEach((seg) => {
      const endSeconds = timeStringToSeconds(seg.endTime)
      if (endSeconds > max) max = endSeconds
    })
    return max
  })()

  // 시간 마커 (0%, 25%, 50%, 75%, 100%)
  const timeMarkers = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    percent: ratio * 100,
    label: secondsToTimeString(Math.floor(maxSeconds * ratio), maxSeconds > 3600),
  }))

  // 세그먼트 위치 계산
  const getSegmentPosition = (segment: VideoSegment) => {
    const startSeconds = timeStringToSeconds(segment.startTime)
    const endSeconds = timeStringToSeconds(segment.endTime)
    return {
      left: (startSeconds / maxSeconds) * 100,
      width: ((endSeconds - startSeconds) / maxSeconds) * 100,
    }
  }

  // 마우스 X 좌표 → 시간(초) 변환
  const getTimeFromX = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0
    const rect = containerRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.floor(percent * maxSeconds)
  }, [maxSeconds])

  // 드래그 시작
  const handleMouseDown = (
    e: React.MouseEvent,
    segmentId: string,
    handle: 'start' | 'end' | 'move'
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const segment = segments.find((s) => s.id === segmentId)
    if (!segment) return

    const initialTime = handle === 'start'
      ? timeStringToSeconds(segment.startTime)
      : handle === 'end'
      ? timeStringToSeconds(segment.endTime)
      : timeStringToSeconds(segment.startTime)

    setDragState({
      segmentId,
      handle,
      initialX: e.clientX,
      initialTime,
    })
    setSelectedId(segmentId)
  }

  // 드래그 중
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return

    const newTime = getTimeFromX(e.clientX)
    const segment = segments.find((s) => s.id === dragState.segmentId)
    if (!segment) return

    const startSeconds = timeStringToSeconds(segment.startTime)
    const endSeconds = timeStringToSeconds(segment.endTime)

    let updatedSegment = { ...segment }

    if (dragState.handle === 'start') {
      // 시작 시간 조절 (종료 시간보다 작아야 함)
      const clampedTime = Math.max(0, Math.min(newTime, endSeconds - 10))
      updatedSegment.startTime = secondsToTimeString(clampedTime, maxSeconds > 3600)
    } else if (dragState.handle === 'end') {
      // 종료 시간 조절 (시작 시간보다 커야 함)
      const clampedTime = Math.max(startSeconds + 10, Math.min(newTime, maxSeconds))
      updatedSegment.endTime = secondsToTimeString(clampedTime, maxSeconds > 3600)
    } else if (dragState.handle === 'move') {
      // 전체 이동
      const delta = newTime - dragState.initialTime
      const duration = endSeconds - startSeconds
      const newStart = Math.max(0, Math.min(startSeconds + delta, maxSeconds - duration))
      const newEnd = newStart + duration
      updatedSegment.startTime = secondsToTimeString(newStart, maxSeconds > 3600)
      updatedSegment.endTime = secondsToTimeString(newEnd, maxSeconds > 3600)
    }

    onChange(segments.map((s) => (s.id === dragState.segmentId ? updatedSegment : s)))
  }, [dragState, segments, onChange, getTimeFromX, maxSeconds])

  // 드래그 종료
  const handleMouseUp = useCallback(() => {
    setDragState(null)
  }, [])

  // 전역 이벤트 리스너
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState, handleMouseMove, handleMouseUp])

  // 세그먼트 추가
  const handleAddSegment = () => {
    const lastSegment = segments[segments.length - 1]
    const newStartSeconds = lastSegment
      ? timeStringToSeconds(lastSegment.endTime)
      : 0
    const newEndSeconds = Math.min(newStartSeconds + 600, maxSeconds) // 10분 추가

    const newSegment: VideoSegment = {
      id: Date.now().toString(),
      type: 'gameplay',
      startTime: secondsToTimeString(newStartSeconds, maxSeconds > 3600),
      endTime: secondsToTimeString(newEndSeconds, maxSeconds > 3600),
    }

    onChange([...segments, newSegment])
    setSelectedId(newSegment.id)
  }

  // 세그먼트 삭제
  const handleDelete = () => {
    if (!selectedId) return
    onChange(segments.filter((s) => s.id !== selectedId))
    setSelectedId(null)
  }

  // 타입 변경
  const handleTypeChange = (type: SegmentType) => {
    if (!selectedId) return
    onChange(segments.map((s) => (s.id === selectedId ? { ...s, type } : s)))
  }

  // 템플릿 불러오기
  const handleLoadTemplate = () => {
    const template: VideoSegment[] = [
      { id: '1', type: 'countdown', startTime: '00:00', endTime: '00:30' },
      { id: '2', type: 'opening', startTime: '00:30', endTime: '03:00' },
      { id: '3', type: 'gameplay', startTime: '03:00', endTime: '30:00' },
      { id: '4', type: 'break', startTime: '30:00', endTime: '35:00' },
      { id: '5', type: 'gameplay', startTime: '35:00', endTime: '60:00' },
      { id: '6', type: 'ending', startTime: '60:00', endTime: '63:00' },
    ]
    onChange(template)
    setSelectedId(null)
  }

  const selectedSegment = segments.find((s) => s.id === selectedId)

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">영상 구간 설정</h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleLoadTemplate}>
              템플릿 불러오기
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddSegment}>
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
            {selectedId && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                삭제
              </Button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div
          ref={containerRef}
          className="relative h-16 bg-muted/30 rounded-lg cursor-crosshair select-none"
        >
          {segments.map((segment) => {
            const pos = getSegmentPosition(segment)
            const isSelected = segment.id === selectedId

            return (
              <div
                key={segment.id}
                className={`absolute top-0 bottom-0 transition-all ${
                  isSelected ? 'ring-2 ring-white ring-offset-2' : ''
                }`}
                style={{
                  left: `${pos.left}%`,
                  width: `${pos.width}%`,
                  backgroundColor: getSegmentColor(segment.type),
                }}
                onMouseDown={(e) => handleMouseDown(e, segment.id, 'move')}
              >
                {/* 좌측 핸들 */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 cursor-ew-resize"
                  onMouseDown={(e) => handleMouseDown(e, segment.id, 'start')}
                />

                {/* 레이블 */}
                {pos.width > 5 && (
                  <div className="absolute inset-0 flex items-center justify-center px-2">
                    <span className="text-white text-xs font-medium truncate">
                      {getSegmentTypeLabel(segment.type)}
                    </span>
                  </div>
                )}

                {/* 우측 핸들 */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 hover:bg-white/50 cursor-ew-resize"
                  onMouseDown={(e) => handleMouseDown(e, segment.id, 'end')}
                />
              </div>
            )
          })}
        </div>

        {/* Time Markers */}
        <div className="relative h-6 text-xs text-muted-foreground">
          {timeMarkers.map((marker) => (
            <div
              key={marker.percent}
              className="absolute"
              style={{ left: `${marker.percent}%` }}
            >
              <div className="relative -translate-x-1/2">
                <div className="absolute bottom-full w-px h-2 bg-border left-1/2 -translate-x-1/2" />
                <div className="whitespace-nowrap">{marker.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Segment Info */}
        {selectedSegment && (
          <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg">
            <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">시작:</span>{' '}
                <span className="font-mono">{selectedSegment.startTime}</span>
              </div>
              <div>
                <span className="text-muted-foreground">종료:</span>{' '}
                <span className="font-mono">{selectedSegment.endTime}</span>
              </div>
            </div>
            <Select
              value={selectedSegment.type}
              onValueChange={(v) => handleTypeChange(v as SegmentType)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="countdown">카운트다운</SelectItem>
                <SelectItem value="opening">오프닝시퀀스</SelectItem>
                <SelectItem value="gameplay">게임플레이</SelectItem>
                <SelectItem value="break">브레이크</SelectItem>
                <SelectItem value="ending">엔딩시퀀스</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center">
          구간을 드래그하여 이동, 좌우 가장자리를 드래그하여 시작/종료 시간 조절
        </p>
      </div>
    </Card>
  )
}
