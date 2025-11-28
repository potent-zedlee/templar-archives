'use client'

/**
 * Category Filter Component
 *
 * 카테고리별 필터 버튼 그룹
 * StatusFilter 옆에 배치
 */

import { Button } from '@/components/ui/button'

const CATEGORY_OPTIONS = [
  { value: 'All', label: 'ALL' },
  { value: 'EPT', label: 'EPT' },
  { value: 'Triton', label: 'Triton' },
  { value: 'WSOP', label: 'WSOP' },
  { value: 'APT', label: 'APT' },
  { value: 'APL', label: 'APL' },
  { value: 'Hustler Casino Live', label: 'HCL' },
  { value: 'GGPOKER', label: 'GG' },
] as const

interface CategoryFilterProps {
  value: string
  onChange: (value: string) => void
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {CATEGORY_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(opt.value)}
          className="h-8 px-3 text-xs"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}
