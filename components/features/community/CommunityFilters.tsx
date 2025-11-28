"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import type { PostCategory } from "@/lib/queries/community-queries"

interface CommunityFiltersProps {
  selectedCategory?: PostCategory
  dateFrom?: string
  dateTo?: string
  onCategoryChange: (category?: PostCategory) => void
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
  onReset: () => void
}

const categoryColors: Record<PostCategory, string> = {
  "analysis": "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800",
  "strategy": "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800",
  "hand-review": "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800",
  "general": "bg-muted text-foreground hover:bg-accent"
}

const categoryLabels: Record<PostCategory, string> = {
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
    <Card className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">고급 필터</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            초기화
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-foreground">카테고리</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(categoryColors).map(([category, colorClass]) => (
              <button
                key={category}
                onClick={() => {
                  if (selectedCategory === category) {
                    onCategoryChange(undefined)
                  } else {
                    onCategoryChange(category as PostCategory)
                  }
                }}
                className={`
                  p-2 rounded-md text-xs font-medium transition-colors text-left
                  ${colorClass}
                  ${selectedCategory === category ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}
                `}
              >
                {categoryLabels[category as PostCategory]}
              </button>
            ))}
          </div>
          {selectedCategory && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-muted-foreground">선택됨:</span>
              <Badge className={categoryColors[selectedCategory]}>
                {categoryLabels[selectedCategory]}
              </Badge>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-foreground">날짜 범위</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input
                type="date"
                value={dateFrom || ""}
                onChange={(e) => onDateFromChange(e.target.value)}
                placeholder="시작일"
                className="text-xs rounded-md bg-muted border text-foreground"
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateTo || ""}
                onChange={(e) => onDateToChange(e.target.value)}
                placeholder="종료일"
                className="text-xs rounded-md bg-muted border text-foreground"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
