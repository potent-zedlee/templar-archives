"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { Post } from "@/lib/supabase-community"

interface CommunityFiltersProps {
  selectedCategory?: Post['category']
  dateFrom?: string
  dateTo?: string
  onCategoryChange: (category?: Post['category']) => void
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
  onReset: () => void
}

const categoryColors: Record<Post['category'], string> = {
  "analysis": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  "strategy": "bg-green-100 text-green-700 hover:bg-green-200",
  "hand-review": "bg-purple-100 text-purple-700 hover:bg-purple-200",
  "general": "bg-gray-100 text-gray-700 hover:bg-gray-200"
}

const categoryLabels: Record<Post['category'], string> = {
  "analysis": "Analysis",
  "strategy": "Strategy",
  "hand-review": "Hand Review",
  "general": "General"
}

export function CommunityFilters({
  selectedCategory,
  dateFrom,
  dateTo,
  onCategoryChange,
  onDateFromChange,
  onDateToChange,
  onReset
}: CommunityFiltersProps) {
  const hasFilters = selectedCategory || dateFrom || dateTo

  return (
    <Card className="p-4 rounded-lg border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">고급 필터</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs text-gray-600"
          >
            <X className="h-3 w-3 mr-1" />
            초기화
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-700">카테고리</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(categoryColors).map(([category, colorClass]) => (
              <button
                key={category}
                onClick={() => {
                  if (selectedCategory === category) {
                    onCategoryChange(undefined)
                  } else {
                    onCategoryChange(category as Post['category'])
                  }
                }}
                className={`
                  p-2 rounded-md text-xs font-medium transition-colors text-left
                  ${colorClass}
                  ${selectedCategory === category ? 'ring-2 ring-blue-400' : ''}
                `}
              >
                {categoryLabels[category as Post['category']]}
              </button>
            ))}
          </div>
          {selectedCategory && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-600">선택됨:</span>
              <Badge className={categoryColors[selectedCategory]}>
                {categoryLabels[selectedCategory]}
              </Badge>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-700">날짜 범위</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="date"
                value={dateFrom || ""}
                onChange={(e) => onDateFromChange(e.target.value)}
                placeholder="시작일"
                className="text-xs rounded-md"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateTo || ""}
                onChange={(e) => onDateToChange(e.target.value)}
                placeholder="종료일"
                className="text-xs rounded-md"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
