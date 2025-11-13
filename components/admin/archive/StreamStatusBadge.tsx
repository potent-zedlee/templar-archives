/**
 * Stream Status Badge Component
 *
 * Stream의 상태를 표시하는 뱃지 컴포넌트
 * - draft: 회색 (미발행)
 * - published: 초록 (발행됨)
 * - archived: 노란 (아카이브됨)
 */

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, FileText, Archive } from 'lucide-react'
import type { ContentStatus } from '@/lib/types/archive'

interface StreamStatusBadgeProps {
  status: ContentStatus
  className?: string
}

export function StreamStatusBadge({ status, className }: StreamStatusBadgeProps) {
  if (status === 'published') {
    return (
      <Badge variant="default" className={className}>
        <CheckCircle2 className="h-3 w-3" />
        Published
      </Badge>
    )
  }

  if (status === 'archived') {
    return (
      <Badge variant="warning" className={className}>
        <Archive className="h-3 w-3" />
        Archived
      </Badge>
    )
  }

  // draft
  return (
    <Badge variant="outline" className={className}>
      <FileText className="h-3 w-3" />
      Draft
    </Badge>
  )
}
