/**
 * CategoryTabs Component
 *
 * 카테고리별 퀵 필터 탭 컴포넌트
 * - Netflix/Spotify 스타일 수평 스크롤 탭
 * - 카테고리 로고 + 이름 + 카운트
 * - 클릭으로 토글 선택
 */

'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { CategoryLogo } from '@/components/common/CategoryLogo'
import { LayoutGrid } from 'lucide-react'
import type { TournamentCategory } from '@/lib/types/archive'

interface CategoryCount {
  category: TournamentCategory
  count: number
  logoUrl?: string
}

interface CategoryTabsProps {
  categories: CategoryCount[]
  selectedCategory: TournamentCategory | null
  onCategoryChange: (category: TournamentCategory | null) => void
  totalCount: number
  className?: string
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onCategoryChange,
  totalCount,
  className,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // 선택된 카테고리가 화면 중앙에 오도록 스크롤
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current
      const selected = selectedRef.current
      const containerRect = container.getBoundingClientRect()
      const selectedRect = selected.getBoundingClientRect()
      const scrollLeft =
        selected.offsetLeft - containerRect.width / 2 + selectedRect.width / 2

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      })
    }
  }, [selectedCategory])

  return (
    <div className={cn('relative', className)}>
      <ScrollArea className="w-full" ref={scrollRef}>
        <div className="flex items-center gap-1 pb-2">
          {/* All 버튼 */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              ref={selectedCategory === null ? selectedRef : undefined}
              variant={selectedCategory === null ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'h-8 px-3 whitespace-nowrap transition-all duration-200',
                selectedCategory === null && 'ring-1 ring-primary/50'
              )}
              onClick={() => onCategoryChange(null)}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
              All
              <Badge
                variant="outline"
                className={cn(
                  'ml-1.5 h-5 px-1.5 text-[10px] font-medium',
                  selectedCategory === null
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : ''
                )}
              >
                {totalCount}
              </Badge>
            </Button>
          </motion.div>

          {/* 구분선 */}
          <div className="h-5 w-px bg-border mx-1" />

          {/* 카테고리 탭들 */}
          {categories.map(({ category, count, logoUrl }) => (
            <motion.div
              key={category}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                ref={selectedCategory === category ? selectedRef : undefined}
                variant={selectedCategory === category ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 px-3 whitespace-nowrap transition-all duration-200',
                  selectedCategory === category && 'ring-1 ring-primary/50'
                )}
                onClick={() =>
                  onCategoryChange(
                    selectedCategory === category ? null : category
                  )
                }
              >
                {/* 카테고리 로고 */}
                {logoUrl ? (
                  <CategoryLogo
                    category={{ id: category, logo_url: logoUrl }}
                    size="sm"
                    className="w-4 h-4 mr-1.5"
                  />
                ) : (
                  <span className="w-4 h-4 mr-1.5 flex items-center justify-center text-[10px] font-bold bg-muted rounded">
                    {category.charAt(0)}
                  </span>
                )}
                {category}
                <Badge
                  variant="outline"
                  className={cn(
                    'ml-1.5 h-5 px-1.5 text-[10px] font-medium',
                    selectedCategory === category
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : ''
                  )}
                >
                  {count}
                </Badge>
              </Button>
            </motion.div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>

      {/* 좌우 그라데이션 페이드 */}
      <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  )
}
