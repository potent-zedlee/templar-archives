/**
 * Video Segment Timeline Component
 *
 * 비디오 세그먼트를 시각적으로 보여주는 타임라인 컴포넌트
 * 게임플레이 구간을 강조하여 표시
 */

'use client'

import { useMemo } from 'react'
import type { VideoSegment } from '@/lib/types/video-segments'
import {
  timeStringToSeconds,
  secondsToTimeString,
  getSegmentColor,
  getSegmentTypeLabel,
} from '@/lib/types/video-segments'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface VideoSegmentTimelineProps {
  segments: VideoSegment[]
  totalDuration?: string // "HH:MM:SS" 또는 "MM:SS"
  className?: string
}

export function VideoSegmentTimeline({
  segments,
  totalDuration,
  className,
}: VideoSegmentTimelineProps) {
  // 전체 길이 계산 (segments나 totalDuration 중 큰 값 사용)
  const totalSeconds = useMemo(() => {
    let max = 0

    // segments에서 최대 시간 찾기
    segments.forEach((seg) => {
      const endSeconds = timeStringToSeconds(seg.endTime)
      if (endSeconds > max) {
        max = endSeconds
      }
    })

    // totalDuration이 있으면 비교
    if (totalDuration) {
      const durationSeconds = timeStringToSeconds(totalDuration)
      if (durationSeconds > max) {
        max = durationSeconds
      }
    }

    return max
  }, [segments, totalDuration])

  // 각 세그먼트의 위치와 너비 계산
  const segmentPositions = useMemo(() => {
    return segments.map((seg) => {
      const startSeconds = timeStringToSeconds(seg.startTime)
      const endSeconds = timeStringToSeconds(seg.endTime)
      const durationSeconds = endSeconds - startSeconds

      const leftPercent = (startSeconds / totalSeconds) * 100
      const widthPercent = (durationSeconds / totalSeconds) * 100

      return {
        segment: seg,
        left: leftPercent,
        width: widthPercent,
        startSeconds,
        endSeconds,
        durationSeconds,
      }
    })
  }, [segments, totalSeconds])

  // 시간 마커 (0%, 25%, 50%, 75%, 100%)
  const timeMarkers = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const seconds = Math.floor(totalSeconds * ratio)
      return {
        percent: ratio * 100,
        label: secondsToTimeString(seconds, totalSeconds > 3600),
      }
    })
  }, [totalSeconds])

  if (segments.length === 0) {
    return null
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">타임라인</h4>
          <Badge variant="outline" className="text-xs">
            전체: {secondsToTimeString(totalSeconds, totalSeconds > 3600)}
          </Badge>
        </div>

        {/* Timeline Bar */}
        <div className="relative h-12 bg-muted/30 rounded-lg overflow-hidden">
          {segmentPositions.map((pos) => (
            <div
              key={pos.segment.id}
              className="absolute top-0 bottom-0 cursor-pointer transition-opacity hover:opacity-80 group"
              style={{
                left: `${pos.left}%`,
                width: `${pos.width}%`,
                backgroundColor: getSegmentColor(pos.segment.type),
              }}
              title={`${getSegmentTypeLabel(pos.segment.type)}: ${pos.segment.startTime} - ${pos.segment.endTime}`}
            >
              {/* Label (if wide enough) */}
              {pos.width > 8 && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium px-1">
                  <span className="truncate">
                    {pos.segment.label || getSegmentTypeLabel(pos.segment.type)}
                  </span>
                </div>
              )}

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-popover border rounded-md shadow-lg p-2 text-xs whitespace-nowrap">
                  <div className="font-medium">
                    {pos.segment.label || getSegmentTypeLabel(pos.segment.type)}
                  </div>
                  <div className="text-muted-foreground">
                    {pos.segment.startTime} - {pos.segment.endTime}
                  </div>
                  <div className="text-muted-foreground">
                    {secondsToTimeString(pos.durationSeconds)}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                {/* Tick mark */}
                <div className="absolute bottom-full w-px h-2 bg-border left-1/2 -translate-x-1/2" />
                {/* Label */}
                <div className="whitespace-nowrap">{marker.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {Array.from(new Set(segments.map((s) => s.type))).map((type) => (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getSegmentColor(type) }}
              />
              <span>{getSegmentTypeLabel(type)}</span>
              <Badge variant="outline" className="text-xs">
                {segments.filter((s) => s.type === type).length}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
