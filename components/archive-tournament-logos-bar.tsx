"use client"

/**
 * Archive Tournament Logos Bar
 *
 * 수평 스크롤 가능한 투어 로고 바
 * - Netflix/Spotify 스타일 수평 스크롤
 * - ALL 버튼 + 주요 투어 로고
 * - 선택된 투어 강조
 * - 부모 카테고리 클릭 시 자식 카테고리 드롭다운 표시
 * - 게임 타입별 필터링 (토너먼트/캐쉬게임/둘 다)
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CategoryLogo } from '@/components/category-logo'
import { useActiveCategoriesQuery } from '@/lib/queries/category-queries'
import type { TournamentCategory as DatabaseCategory, GameType } from '@/lib/tournament-categories-db'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronDown } from 'lucide-react'

interface ArchiveTournamentLogosBarProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  gameType?: GameType  // 'tournament' | 'cash_game' | 'both' - 필터링할 게임 타입
  className?: string
}

export function ArchiveTournamentLogosBar({
  selectedCategory,
  onCategoryChange,
  gameType,
  className
}: ArchiveTournamentLogosBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

  // Fetch active categories from database
  const { data: allCategories = [] } = useActiveCategoriesQuery()

  // Filter categories by game type and get root categories only
  const rootCategories = useMemo(() => {
    let filtered = allCategories.filter(cat => !cat.parent_id)

    // Game type filter
    if (gameType && gameType !== 'both') {
      filtered = filtered.filter(cat => cat.game_type === gameType || cat.game_type === 'both')
    }

    // Sort by priority
    return filtered.sort((a, b) => a.priority - b.priority)
  }, [allCategories, gameType])

  // Get children for a parent category
  const getChildren = (parentId: string) => {
    let children = allCategories.filter(cat => cat.parent_id === parentId)

    // Game type filter for children
    if (gameType && gameType !== 'both') {
      children = children.filter(cat => cat.game_type === gameType || cat.game_type === 'both')
    }

    return children.sort((a, b) => a.priority - b.priority)
  }

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
          {rootCategories.map((category) => {
            const children = getChildren(category.id)
            const hasChildren = children.length > 0

            if (hasChildren) {
              // Parent category with children - show dropdown
              return (
                <Popover
                  key={category.id}
                  open={openPopoverId === category.id}
                  onOpenChange={(open) => {
                    setOpenPopoverId(open ? category.id : null)
                  }}
                >
                  <PopoverTrigger asChild>
                    <div className="flex-shrink-0 relative">
                      <TournamentLogoButton
                        category={category}
                        isSelected={selectedCategory === category.id}
                        onClick={() => {
                          onCategoryChange(category.id)
                          setOpenPopoverId(category.id)
                        }}
                        hasChildren={hasChildren}
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    className="w-auto p-2"
                    sideOffset={8}
                  >
                    <div className="space-y-1">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            onCategoryChange(child.id)
                            setOpenPopoverId(null)
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                            selectedCategory === child.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <div className="w-8 h-8 flex items-center justify-center">
                            <CategoryLogo
                              category={child.id}
                              size="sm"
                              className="w-6 h-6"
                              fallback="text"
                            />
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">
                            {child.display_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )
            } else {
              // Regular category without children
              return (
                <TournamentLogoButton
                  key={category.id}
                  category={category}
                  isSelected={selectedCategory === category.id}
                  onClick={() => onCategoryChange(category.id)}
                  hasChildren={false}
                />
              )
            }
          })}

          {/* Fade out effect at the end */}
          <div className="flex-shrink-0 w-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

interface TournamentLogoButtonProps {
  category: DatabaseCategory
  isSelected: boolean
  onClick: () => void
  hasChildren?: boolean
}

function TournamentLogoButton({
  category,
  isSelected,
  onClick,
  hasChildren = false
}: TournamentLogoButtonProps) {
  return (
    <button
      onClick={onClick}
      data-category-id={category.id}
      className={cn(
        "flex-shrink-0 flex flex-col items-center gap-2 group transition-all duration-200",
        "hover:scale-110",
        isSelected && "scale-110",
        "relative"
      )}
      aria-label={`Filter by ${category.display_name}`}
      aria-pressed={isSelected}
      aria-haspopup={hasChildren}
    >
      {/* Logo Container */}
      <div
        className={cn(
          "w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-200 overflow-hidden relative",
          isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20"
        )}
      >
        <CategoryLogo
          category={category.id}
          size="lg"
          className="w-12 h-12"
          fallback="text"
        />
        {hasChildren && (
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-primary/80 rounded-full flex items-center justify-center">
            <ChevronDown className="w-3 h-3 text-white" />
          </div>
        )}
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
        {category.display_name}
      </span>
    </button>
  )
}
