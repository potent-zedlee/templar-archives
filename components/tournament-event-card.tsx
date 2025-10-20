"use client"

/**
 * Tournament Event Card
 *
 * 3D 배너 스타일의 토너먼트 이벤트 카드
 * - 토너먼트별 테마 색상
 * - 호버 애니메이션
 * - 체크박스 선택
 */

import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import { CategoryLogo } from '@/components/category-logo'
import { getCategoryById } from '@/lib/tournament-categories'
import { cn } from '@/lib/utils'

export interface TournamentEventCardProps {
  id: string
  date: string
  time?: string
  title: string
  category?: string
  logo?: string
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onClick?: () => void
}

export function TournamentEventCard({
  id,
  date,
  time,
  title,
  category,
  logo,
  isSelected = false,
  onSelect,
  onClick,
}: TournamentEventCardProps) {
  // Get category theme
  const categoryData = category ? getCategoryById(category) : null
  const theme = categoryData?.theme || {
    gradient: 'from-gray-800 via-gray-700 to-gray-600',
    text: 'text-white',
    shadow: 'shadow-gray-800/50',
  }

  return (
    <div className="group flex items-center gap-3 py-2">
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
        className="flex-shrink-0"
        aria-label={`Select ${title}`}
      />

      {/* Date/Time */}
      <div className="flex-shrink-0 text-sm text-muted-foreground min-w-[100px]">
        {date}
        {time && <span className="ml-1">{time}</span>}
      </div>

      {/* 3D Banner */}
      <button
        onClick={onClick}
        className={cn(
          "flex-1 flex items-center gap-4 px-6 py-4 rounded-xl",
          "bg-gradient-to-r transition-all duration-300",
          "hover:scale-[1.02] hover:shadow-2xl",
          "relative overflow-hidden",
          theme.gradient,
          theme.shadow
        )}
      >
        {/* Logo */}
        {(logo || categoryData) && (
          <div className="flex-shrink-0 w-12 h-12">
            {categoryData ? (
              <CategoryLogo
                category={categoryData.id}
                size="lg"
                className="w-full h-full"
                fallback="icon"
              />
            ) : (
              <img src={logo} alt="" className="w-full h-full object-contain" />
            )}
          </div>
        )}

        {/* Title */}
        <div className={cn("flex-1 text-left font-semibold", theme.text)}>
          {title}
        </div>

        {/* 3D Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </button>
    </div>
  )
}
