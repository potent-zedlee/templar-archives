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
import { CategoryLogo } from '@/components/CategoryLogo'
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

      {/* Date/Time (Monospace) */}
      <div className="flex-shrink-0 text-sm text-mono text-text-muted min-w-[100px] font-bold">
        {date}
        {time && <span className="ml-1">{time}</span>}
      </div>

      {/* Postmodern Card Button */}
      <button
        onClick={onClick}
        className="card-postmodern-interactive flex-1 flex items-center gap-4 px-6 py-4"
      >
        {/* Logo with Gold Border */}
        {(logo || categoryData) && (
          <div className="flex-shrink-0 w-12 h-12 border-2 border-gold-700">
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

        {/* Title (Uppercase, Bold) */}
        <div className="flex-1 text-left text-heading-sm text-gold-400">
          {title}
        </div>
      </button>
    </div>
  )
}
