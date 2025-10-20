"use client"

/**
 * Archive Tournament Logos Bar
 *
 * 수평 스크롤 가능한 투어 로고 바
 * - Netflix/Spotify 스타일 수평 스크롤
 * - ALL 버튼 + 주요 투어 로고
 * - 선택된 투어 강조
 */

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CategoryLogo } from '@/components/category-logo'
import { POPULAR_CATEGORIES } from '@/lib/tournament-categories'
import type { TournamentCategory } from '@/lib/tournament-categories'

interface ArchiveTournamentLogosBarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  className?: string
}

export function ArchiveTournamentLogosBar({
  selectedCategory,
  onCategoryChange,
  className
}: ArchiveTournamentLogosBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 인기 투어 목록 (priority 순으로 정렬)
  const popularTours = POPULAR_CATEGORIES.sort((a, b) => a.priority - b.priority)

  // Auto-scroll to selected tournament
  useEffect(() => {
    if (!scrollRef.current || selectedCategory === 'All') return

    const selectedElement = scrollRef.current.querySelector(`[data-category-id="${selectedCategory}"]`)
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [selectedCategory])

  return (
    <div
      className={cn(
        "w-full bg-[#1a1a1a] border-b border-border/40",
        className
      )}
    >
      <div className="container max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Horizontal Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex items-center gap-6 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* ALL Button */}
          <button
            onClick={() => onCategoryChange('All')}
            className={cn(
              "flex-shrink-0 flex flex-col items-center gap-2 group transition-all duration-200",
              "hover:scale-110"
            )}
            aria-label="Show all tournaments"
            aria-pressed={selectedCategory === 'All'}
          >
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200",
                selectedCategory === 'All'
                  ? "text-white ring-2 ring-primary shadow-lg scale-110"
                  : "text-gray-400"
              )}
            >
              ALL
            </div>
            <span
              className={cn(
                "text-xs font-medium transition-colors duration-200",
                selectedCategory === 'All'
                  ? "text-white"
                  : "text-gray-400"
              )}
            >
              All
            </span>
          </button>

          {/* Tournament Logos */}
          {popularTours.map((tournament) => (
            <TournamentLogoButton
              key={tournament.id}
              tournament={tournament}
              isSelected={selectedCategory === tournament.id || selectedCategory === tournament.name}
              onClick={() => onCategoryChange(tournament.id)}
            />
          ))}

          {/* Fade out effect at the end */}
          <div className="flex-shrink-0 w-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

interface TournamentLogoButtonProps {
  tournament: TournamentCategory
  isSelected: boolean
  onClick: () => void
}

function TournamentLogoButton({
  tournament,
  isSelected,
  onClick
}: TournamentLogoButtonProps) {
  return (
    <button
      onClick={onClick}
      data-category-id={tournament.id}
      className={cn(
        "flex-shrink-0 flex flex-col items-center gap-2 group transition-all duration-200",
        "hover:scale-110",
        isSelected && "scale-110"
      )}
      aria-label={`Filter by ${tournament.displayName}`}
      aria-pressed={isSelected}
    >
      {/* Logo Container */}
      <div
        className={cn(
          "w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-200 overflow-hidden",
          isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20"
        )}
      >
        <CategoryLogo
          category={tournament.id}
          size="lg"
          className="w-12 h-12"
          fallback="text"
        />
      </div>

      {/* Tournament Name */}
      <span
        className={cn(
          "text-xs font-medium transition-colors duration-200 max-w-[64px] text-center truncate",
          isSelected
            ? "text-white"
            : "text-gray-400 group-hover:text-gray-300"
        )}
      >
        {tournament.displayName}
      </span>
    </button>
  )
}
