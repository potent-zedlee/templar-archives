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
  "analysis": "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  "strategy": "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  "hand-review": "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
  "general": "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
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
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-body font-semibold">고급 필터</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-caption"
          >
            <X className="h-3 w-3 mr-1" />
            초기화
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label className="text-caption">카테고리</Label>
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
                  p-2 rounded-md text-caption font-medium transition-colors text-left
                  ${colorClass}
                  ${selectedCategory === category ? 'ring-2 ring-primary' : ''}
                `}
              >
                {categoryLabels[category as Post['category']]}
              </button>
            ))}
          </div>
          {selectedCategory && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-caption text-muted-foreground">선택됨:</span>
              <Badge className={categoryColors[selectedCategory]}>
                {categoryLabels[selectedCategory]}
              </Badge>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-caption">날짜 범위</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="date"
                value={dateFrom || ""}
                onChange={(e) => onDateFromChange(e.target.value)}
                placeholder="시작일"
                className="text-caption"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateTo || ""}
                onChange={(e) => onDateToChange(e.target.value)}
                placeholder="종료일"
                className="text-caption"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
