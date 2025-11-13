/**
 * Status Filter Component
 *
 * Stream 상태별 필터 탭
 * - All, Draft, Published, Archived
 */

'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ContentStatus } from '@/lib/types/archive'

interface StatusFilterProps {
  value: ContentStatus | 'all'
  onChange: (value: ContentStatus | 'all') => void
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <Tabs value={value} onValueChange={onChange as (value: string) => void}>
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="draft">Draft</TabsTrigger>
        <TabsTrigger value="published">Published</TabsTrigger>
        <TabsTrigger value="archived">Archived</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
