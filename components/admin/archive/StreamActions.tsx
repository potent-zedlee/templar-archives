/**
 * Stream Actions Component
 *
 * Stream에 대한 액션 버튼
 * - Publish/Unpublish 토글
 * - 체크리스트 모달 열기
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckSquare, Eye, EyeOff, Edit3 } from 'lucide-react'
import { StreamChecklist } from './StreamChecklist'
import type { ContentStatus } from '@/lib/types/archive'

interface StreamActionsProps {
  streamId: string
  streamName: string
  currentStatus: ContentStatus
  videoUrl?: string
  onStatusChange?: () => void
  onOpenHandInput?: () => void
}

export function StreamActions({
  streamId,
  streamName,
  currentStatus,
  videoUrl,
  onStatusChange,
  onOpenHandInput
}: StreamActionsProps) {
  const [checklistOpen, setChecklistOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {/* Hand Input Mode 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onOpenHandInput}
        title="Hand Input Mode"
      >
        <Edit3 className="h-4 w-4" />
      </Button>

      {/* Checklist 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setChecklistOpen(true)}
        title="View Checklist"
      >
        <CheckSquare className="h-4 w-4" />
      </Button>

      {/* Publish/Unpublish 토글 버튼 */}
      {currentStatus === 'published' ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Unpublish 액션은 StreamChecklist 내부에서 처리
            setChecklistOpen(true)
          }}
          title="Unpublish Stream"
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setChecklistOpen(true)}
          title="Publish Stream"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}

      {/* Checklist Modal */}
      <StreamChecklist
        isOpen={checklistOpen}
        onOpenChange={setChecklistOpen}
        streamId={streamId}
        streamName={streamName}
        currentStatus={currentStatus}
        onStatusChange={onStatusChange}
      />
    </div>
  )
}
