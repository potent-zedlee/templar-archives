/**
 * Bulk Actions Component
 *
 * 선택된 Stream들에 대한 대량 작업
 * - Publish All
 * - Unpublish All
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { bulkPublishStreams, bulkUnpublishStreams } from '@/app/actions/admin/archive-admin'

interface BulkActionsProps {
  selectedStreamIds: string[]
  onSuccess?: () => void
  onClearSelection?: () => void
}

export function BulkActions({
  selectedStreamIds,
  onSuccess,
  onClearSelection
}: BulkActionsProps) {
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)

  if (selectedStreamIds.length === 0) return null

  const handleBulkPublish = async () => {
    setPublishing(true)
    try {
      const result = await bulkPublishStreams(selectedStreamIds)

      if (result.success) {
        toast.success(`${selectedStreamIds.length} streams published successfully`)
        onSuccess?.()
        onClearSelection?.()
      } else {
        toast.error(result.error || 'Failed to publish streams')
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
      const result = await bulkUnpublishStreams(selectedStreamIds)

      if (result.success) {
        toast.success(`${selectedStreamIds.length} streams unpublished successfully`)
        onSuccess?.()
        onClearSelection?.()
      } else {
        toast.error(result.error || 'Failed to unpublish streams')
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
