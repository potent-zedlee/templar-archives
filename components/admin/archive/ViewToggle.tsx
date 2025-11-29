'use client'

/**
 * ViewToggle Component
 *
 * Tree View / Flat View 전환 토글
 */

import { LayoutList, LayoutGrid } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAdminArchiveStore } from '@/stores/admin-archive-store'

export function ViewToggle() {
  const { viewMode, setViewMode } = useAdminArchiveStore()

  return (
    <ToggleGroup
      type="single"
      value={viewMode}
      onValueChange={(value) => {
        if (value) setViewMode(value as 'tree' | 'flat')
      }}
      className="border rounded-md"
    >
      <ToggleGroupItem value="tree" aria-label="Tree view" className="px-3">
        <LayoutList className="h-4 w-4 mr-2" />
        <span className="text-sm">Tree</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="flat" aria-label="Flat view" className="px-3">
        <LayoutGrid className="h-4 w-4 mr-2" />
        <span className="text-sm">Flat</span>
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
