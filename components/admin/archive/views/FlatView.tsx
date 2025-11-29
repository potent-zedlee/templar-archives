'use client'

/**
 * FlatView Component
 *
 * 스트림 카드 그리드 뷰 (Pipeline 스타일)
 */

import { StreamCard } from '@/components/admin/StreamCard'
import { useAdminArchiveStore } from '@/stores/admin-archive-store'
import type { PipelineStream } from '@/lib/queries/admin-archive-queries'
import { Loader2 } from 'lucide-react'

interface FlatViewProps {
  streams: PipelineStream[]
  isLoading?: boolean
  onRetry?: (streamId: string) => void
}

export function FlatView({ streams, isLoading, onRetry }: FlatViewProps) {
  const { selectedItem, setSelectedItem } = useAdminArchiveStore()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>해당 상태의 스트림이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
      {streams.map((stream) => (
        <StreamCard
          key={stream.id}
          stream={stream}
          isSelected={selectedItem?.id === stream.id}
          onSelect={() =>
            setSelectedItem({
              type: 'stream',
              id: stream.id,
              tournamentId: stream.tournamentId,
              eventId: stream.eventId,
            })
          }
          onRetry={onRetry}
        />
      ))}
    </div>
  )
}
