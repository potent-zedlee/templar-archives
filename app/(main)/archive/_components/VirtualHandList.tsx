"use client"

/**
 * Virtual Hand List Component
 *
 * @tanstack/react-virtual을 사용한 가상 스크롤링
 * 10,000개 이상의 핸드도 60fps 유지
 */

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Hand } from '@/lib/types/archive'
import { HandListItem } from './HandListItem'

interface VirtualHandListProps {
  hands: Hand[]
  onHandClick?: (hand: Hand) => void
  onSeekToTime?: (timeString: string) => void
}

export function VirtualHandList({
  hands,
  onHandClick,
  onSeekToTime
}: VirtualHandListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: hands.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Hand item 예상 높이 (px)
    overscan: 10, // 화면 밖 렌더링할 아이템 수
  })

  if (hands.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No hands available</p>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      style={{
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const hand = hands[virtualRow.index]

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <HandListItem
                hand={hand}
                onClick={onHandClick}
                onSeekToTime={onSeekToTime}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
