"use client"

/**
 * Archive Sidebar Categories
 *
 * 사이드바 전용 카테고리 선택 컴포넌트
 * - 세로 목록 형식으로 최적화
 * - 부모/자식 카테고리 계층 지원
 * - 간결한 아이콘 + 텍스트 디자인
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CategoryLogo } from '@/components/category-logo'
import { useActiveCategoriesQuery } from '@/lib/queries/category-queries'
import type { GameType } from '@/lib/tournament-categories'
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ArchiveSidebarCategoriesProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  gameType?: GameType
}

export function ArchiveSidebarCategories({
  selectedCategory,
  onCategoryChange,
  gameType
}: ArchiveSidebarCategoriesProps) {
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(new Set())

  // Fetch active categories from database
  const { data: allCategories = [] } = useActiveCategoriesQuery()

  // Filter categories by game type and get root categories only
  const rootCategories = useMemo(() => {
    let filtered = allCategories.filter(cat => !cat.parent_id)

    // Game type filter
    if (gameType && gameType !== 'both') {
      filtered = filtered.filter(cat => cat.game_type === gameType || cat.game_type === 'both')
    }

    // Sort by name (alphabetical)
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [allCategories, gameType])

  // Get children for a parent category
  const getChildren = (parentId: string) => {
    let children = allCategories.filter(cat => cat.parent_id === parentId)

    // Game type filter for children
    if (gameType && gameType !== 'both') {
      children = children.filter(cat => cat.game_type === gameType || cat.game_type === 'both')
    }

    return children.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Toggle parent expansion
  const toggleParent = (parentId: string) => {
    const newExpanded = new Set(expandedParentIds)
    if (newExpanded.has(parentId)) {
      newExpanded.delete(parentId)
    } else {
      newExpanded.add(parentId)
    }
    setExpandedParentIds(newExpanded)
  }

  return (
    <div className="space-y-1">
      {/* ALL Button */}
      <Button
        variant={selectedCategory === 'All' ? 'default' : 'ghost'}
        className={cn(
          "w-full justify-start gap-2 h-9",
          selectedCategory === 'All' && "bg-primary text-primary-foreground"
        )}
        onClick={() => onCategoryChange('All')}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="text-sm font-medium">All</span>
      </Button>

      {/* Category List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-1 pr-2">
          {rootCategories.map((category) => {
            const children = getChildren(category.id)
            const hasChildren = children.length > 0
            const isExpanded = expandedParentIds.has(category.id)
            const isSelected = selectedCategory === category.id

            return (
              <div key={category.id} className="space-y-0.5">
                {/* Parent Category */}
                <div className="flex items-center gap-1">
                  {hasChildren && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-6 p-0"
                      onClick={() => toggleParent(category.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant={isSelected ? 'default' : 'ghost'}
                    className={cn(
                      "flex-1 justify-start gap-2 h-8",
                      !hasChildren && "ml-6",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => onCategoryChange(category.id)}
                  >
                    <CategoryLogo
                      category={category}
                      size="sm"
                      className="w-4 h-4 flex-shrink-0"
                      fallback="text"
                    />
                    <span className="text-xs font-medium truncate">
                      {category.display_name}
                    </span>
                  </Button>
                </div>

                {/* Child Categories */}
                {isExpanded && hasChildren && (
                  <div className="ml-8 space-y-0.5 border-l border-border/40 pl-2">
                    {children.map((child) => (
                      <Button
                        key={child.id}
                        variant={selectedCategory === child.id ? 'default' : 'ghost'}
                        className={cn(
                          "w-full justify-start gap-2 h-7",
                          selectedCategory === child.id && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => onCategoryChange(child.id)}
                      >
                        <CategoryLogo
                          category={child}
                          size="sm"
                          className="w-3.5 h-3.5 flex-shrink-0"
                          fallback="text"
                        />
                        <span className="text-xs truncate">
                          {child.display_name}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
