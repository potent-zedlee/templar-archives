/**
 * HandTimelineOverlay Component
 *
 * 비디오 타임라인에 핸드 마커를 시각화하는 오버레이
 * - YouTube/Twitch 챕터 스타일 시각화
 * - 핸드 위치 마커
 * - 호버 시 핸드 미리보기
 * - 클릭 시 해당 타임스탬프로 이동
 */

'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Users, Clock, TrendingUp } from 'lucide-react'
import type { Hand } from '@/lib/types/archive'

interface HandTimelineOverlayProps {
  hands: Hand[]
  videoDuration: number // 초 단위
  currentTime: number // 초 단위
  onSeek: (time: number) => void
  selectedHandId?: string
  className?: string
}

interface HandMarker {
  hand: Hand
  position: number // 0-100%
  start: number
  end: number
}

/**
 * 시간 포맷팅 (초 → HH:MM:SS)
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * 핸드의 하이라이트 플레이어 가져오기
 */
function getHighlightPlayers(hand: Hand): string[] {
  return (
    hand.hand_players
      ?.filter(hp => hp.player?.name)
      .slice(0, 2)
      .map(hp => hp.player?.name || hp.poker_position || 'Unknown') || []
  )
}

/**
 * 핫 분포 계산 (핸드 밀집도)
 */
function calculateHeatMap(
  hands: Hand[],
  duration: number,
  segments: number = 50
): number[] {
  const segmentDuration = duration / segments
  const heatMap = new Array(segments).fill(0)

  hands.forEach(hand => {
    if (hand.video_timestamp_start) {
      const segmentIndex = Math.min(
        Math.floor(hand.video_timestamp_start / segmentDuration),
        segments - 1
      )
      heatMap[segmentIndex]++
    }
  })

  // 정규화 (0-1)
  const maxCount = Math.max(...heatMap, 1)
  return heatMap.map(count => count / maxCount)
}

export function HandTimelineOverlay({
  hands,
  videoDuration,
  currentTime,
  onSeek,
  selectedHandId,
  className,
}: HandTimelineOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredHand, setHoveredHand] = useState<Hand | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  // 핸드 마커 계산
  const markers: HandMarker[] = useMemo(() => {
    if (videoDuration <= 0) return []

    return hands
      .filter(h => h.video_timestamp_start != null)
      .map(hand => ({
        hand,
        position: ((hand.video_timestamp_start || 0) / videoDuration) * 100,
        start: hand.video_timestamp_start || 0,
        end: hand.video_timestamp_end || (hand.video_timestamp_start || 0) + 120,
      }))
      .sort((a, b) => a.start - b.start)
  }, [hands, videoDuration])

  // 히트맵 계산
  const heatMap = useMemo(
    () => calculateHeatMap(hands, videoDuration),
    [hands, videoDuration]
  )

  // 현재 재생 위치
  const playheadPosition = useMemo(
    () => videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0,
    [currentTime, videoDuration]
  )

  // 타임라인 클릭 핸들러
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || videoDuration <= 0) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const time = percentage * videoDuration

    onSeek(Math.max(0, Math.min(time, videoDuration)))
  }, [videoDuration, onSeek])

  // 마커 호버 핸들러
  const handleMarkerHover = useCallback((
    hand: Hand | null,
    e?: React.MouseEvent
  ) => {
    setHoveredHand(hand)
    if (e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }, [])

  // 마커 클릭 핸들러
  const handleMarkerClick = useCallback((hand: Hand, e: React.MouseEvent) => {
    e.stopPropagation()
    if (hand.video_timestamp_start != null) {
      onSeek(hand.video_timestamp_start)
    }
  }, [onSeek])

  if (videoDuration <= 0) return null

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-12 bg-muted/50 rounded-lg overflow-hidden cursor-pointer',
        className
      )}
      onClick={handleTimelineClick}
    >
      {/* 히트맵 배경 */}
      <div className="absolute inset-0 flex">
        {heatMap.map((intensity, i) => (
          <div
            key={i}
            className="flex-1 transition-colors"
            style={{
              backgroundColor: `rgba(34, 197, 94, ${intensity * 0.3})`,
            }}
          />
        ))}
      </div>

      {/* 타임라인 트랙 */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-border rounded-full">
        {/* 재생된 부분 */}
        <div
          className="absolute left-0 top-0 h-full bg-green-500 rounded-full transition-all duration-100"
          style={{ width: `${playheadPosition}%` }}
        />
      </div>

      {/* 핸드 마커들 */}
      {markers.map((marker) => {
        const isSelected = selectedHandId === marker.hand.id
        const isCurrent =
          currentTime >= marker.start &&
          currentTime <= marker.end

        return (
          <motion.button
            key={marker.hand.id}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
              'w-3 h-3 rounded-full border-2 transition-all',
              'hover:scale-150 hover:z-20',
              isSelected
                ? 'bg-green-500 border-green-300 scale-125 z-10'
                : isCurrent
                ? 'bg-yellow-500 border-yellow-300 scale-110'
                : 'bg-muted-foreground/70 border-background hover:bg-green-400'
            )}
            style={{ left: `${marker.position}%` }}
            onClick={(e) => handleMarkerClick(marker.hand, e)}
            onMouseEnter={(e) => handleMarkerHover(marker.hand, e)}
            onMouseLeave={() => handleMarkerHover(null)}
            whileHover={{ scale: 1.5 }}
            title={`Hand #${marker.hand.number}`}
          />
        )
      })}

      {/* 재생 헤드 */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-30 transition-all duration-100"
        style={{ left: `${playheadPosition}%` }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow" />
      </div>

      {/* 타임 라벨 (시작/끝) */}
      <div className="absolute bottom-1 left-2 text-[10px] text-muted-foreground">
        {formatTime(0)}
      </div>
      <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
        {formatTime(videoDuration)}
      </div>

      {/* 호버 툴팁 */}
      <AnimatePresence>
        {hoveredHand && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 pointer-events-none"
            style={{
              left: Math.min(
                Math.max(tooltipPosition.x, 100),
                (containerRef.current?.offsetWidth || 300) - 100
              ),
              bottom: '100%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
            }}
          >
            <HandTooltip hand={hoveredHand} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * 핸드 툴팁 컴포넌트
 */
function HandTooltip({ hand }: { hand: Hand }) {
  const highlightPlayers = getHighlightPlayers(hand)
  const potSize = hand.pot_size || hand.pot_river || hand.pot_turn || hand.pot_flop || 0

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-xl min-w-[200px]">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <Badge variant="secondary" className="text-xs">
          Hand #{hand.number}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatTime(hand.video_timestamp_start || 0)}
        </div>
      </div>

      {/* 플레이어 */}
      {highlightPlayers.length > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-foreground">
            {highlightPlayers.join(', ')}
          </span>
        </div>
      )}

      {/* 팟 사이즈 */}
      {potSize > 0 && (
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-green-500" />
          <span className="text-xs font-medium">
            Pot: {potSize.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}
