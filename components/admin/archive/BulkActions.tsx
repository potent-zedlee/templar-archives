/**
 * Bulk Actions Component
 *
 * 선택된 Stream들에 대한 대량 작업
 * - Publish All
 * - Unpublish All
 * - 여러 이벤트의 스트림들을 이벤트별로 그룹화하여 처리
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { bulkPublishStreams, bulkUnpublishStreams } from '@/app/actions/admin/archive-admin'

interface BulkActionsProps {
  selectedStreamIds: string[]
  selectedStreamMeta: Map<string, {tournamentId: string, eventId: string}>
  onSuccess?: () => void
  onClearSelection?: () => void
}

export function BulkActions({
  selectedStreamIds,
  selectedStreamMeta,
  onSuccess,
  onClearSelection
}: BulkActionsProps) {
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)

  if (selectedStreamIds.length === 0) return null

  const handleBulkPublish = async () => {
    setPublishing(true)
    try {
      // 이벤트별로 스트림 그룹화
      const streamsByEvent = new Map<string, {tournamentId: string, eventId: string, streamIds: string[]}>()

      selectedStreamIds.forEach(streamId => {
        const meta = selectedStreamMeta.get(streamId)
        if (!meta) return

        const key = `${meta.tournamentId}:${meta.eventId}`
        if (!streamsByEvent.has(key)) {
          streamsByEvent.set(key, {
            tournamentId: meta.tournamentId,
            eventId: meta.eventId,
            streamIds: []
          })
        }
        streamsByEvent.get(key)!.streamIds.push(streamId)
      })

      // 각 이벤트별로 bulk publish 실행
      let successCount = 0
      let errorCount = 0

      for (const group of streamsByEvent.values()) {
        const result = await bulkPublishStreams(group.tournamentId, group.eventId, group.streamIds)
        if (result.success) {
          successCount += group.streamIds.length
        } else {
          errorCount += group.streamIds.length
          console.error('Failed to publish group:', result.error)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} streams published successfully`)
        onSuccess?.()
        onClearSelection?.()
      }
      if (errorCount > 0) {
        toast.error(`Failed to publish ${errorCount} streams`)
      }
    } catch (error) {
      console.error('Error bulk publishing:', error)
      toast.error('Failed to publish streams')
    } finally {
      setPublishing(false)
    }
  }

  const handleBulkUnpublish = async () => {
    setUnpublishing(true)
    try {
      // 이벤트별로 스트림 그룹화
      const streamsByEvent = new Map<string, {tournamentId: string, eventId: string, streamIds: string[]}>()

      selectedStreamIds.forEach(streamId => {
        const meta = selectedStreamMeta.get(streamId)
        if (!meta) return

        const key = `${meta.tournamentId}:${meta.eventId}`
        if (!streamsByEvent.has(key)) {
          streamsByEvent.set(key, {
            tournamentId: meta.tournamentId,
            eventId: meta.eventId,
            streamIds: []
          })
        }
        streamsByEvent.get(key)!.streamIds.push(streamId)
      })

      // 각 이벤트별로 bulk unpublish 실행
      let successCount = 0
      let errorCount = 0

      for (const group of streamsByEvent.values()) {
        const result = await bulkUnpublishStreams(group.tournamentId, group.eventId, group.streamIds)
        if (result.success) {
          successCount += group.streamIds.length
        } else {
          errorCount += group.streamIds.length
          console.error('Failed to unpublish group:', result.error)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} streams unpublished successfully`)
        onSuccess?.()
        onClearSelection?.()
      }
      if (errorCount > 0) {
        toast.error(`Failed to unpublish ${errorCount} streams`)
      }
    } catch (error) {
      console.error('Error bulk unpublishing:', error)
      toast.error('Failed to unpublish streams')
    } finally {
      setUnpublishing(false)
    }
  }

  return (
    <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
      <span className="text-sm font-medium">
        {selectedStreamIds.length} stream{selectedStreamIds.length > 1 ? 's' : ''} selected
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkPublish}
          disabled={publishing || unpublishing}
        >
          {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Eye className="mr-2 h-4 w-4" />
          Publish All
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkUnpublish}
          disabled={publishing || unpublishing}
        >
          {unpublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <EyeOff className="mr-2 h-4 w-4" />
          Unpublish All
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={publishing || unpublishing}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
