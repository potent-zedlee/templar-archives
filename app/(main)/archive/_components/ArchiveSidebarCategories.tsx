"use client"

/**
 * Archive Sidebar Categories - Flowbite Enhanced
 *
 * Flowbite 패턴을 활용한 개선:
 * - Accordion 스타일 개선
 * - 접근성 개선 (ARIA 속성)
 * - 시각적 계층 구조 강화
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CategoryLogo } from '@/components/category-logo'
import { useActiveCategoriesQuery } from '@/lib/queries/category-queries'
import type { GameType } from '@/lib/tournament-categories'
import { ChevronRight, LayoutGrid } from 'lucide-react'

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
    <nav className="space-y-1" aria-label="Category navigation">
      {/* ALL Button */}
      <button
        type="button"
        className={cn(
          "w-full flex items-start gap-2.5 min-h-[40px] py-2.5 px-3 rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-4",
          selectedCategory === 'All'
            ? "bg-gold-600 hover:bg-gold-700 text-white shadow-sm font-semibold focus:ring-gold-300"
            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-300"
        )}
        onClick={() => onCategoryChange('All')}
        aria-current={selectedCategory === 'All' ? 'page' : undefined}
      >
        <LayoutGrid className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span className="text-sm font-medium whitespace-normal text-left leading-tight flex-1">All Categories</span>
      </button>

      {/* Category List (Flowbite Accordion Style) */}
      <div className="space-y-1 pt-1">
        {rootCategories.map((category) => {
          const children = getChildren(category.id)
          const hasChildren = children.length > 0
          const isExpanded = expandedParentIds.has(category.id)
          const isSelected = selectedCategory === category.id

          return (
            <div key={category.id} className="space-y-0.5">
              {/* Parent Category */}
              <div className="flex items-start gap-1">
                {hasChildren && (
                  <button
                    type="button"
                    className={cn(
                      "w-6 min-h-[36px] flex items-center justify-center rounded-md flex-shrink-0 mt-0.5",
                      "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-gold-400"
                    )}
                    onClick={() => toggleParent(category.id)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.display_name}`}
                  >
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </button>
                )}
                <button
                  type="button"
                  className={cn(
                    "flex-1 flex items-start gap-2.5 min-h-[36px] py-2 px-3 rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-4",
                    !hasChildren && "ml-6",
                    isSelected
                      ? "bg-gold-600 hover:bg-gold-700 text-white shadow-sm font-semibold focus:ring-gold-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-300"
                  )}
                  onClick={() => onCategoryChange(category.id)}
                  aria-current={isSelected ? 'page' : undefined}
                >
                  <CategoryLogo
                    category={category}
                    size="sm"
                    className="w-4 h-4 flex-shrink-0 mt-0.5"
                    fallback="text"
                  />
                  <span className="text-sm font-medium whitespace-normal text-left leading-tight line-clamp-2 flex-1">
                    {category.display_name}
                  </span>
                </button>
              </div>

              {/* Child Categories (Collapsible) */}
              {isExpanded && hasChildren && (
                <div
                  className="ml-6 space-y-0.5 pl-4 border-l-2 border-gray-200 dark:border-gray-700"
                  role="group"
                  aria-label={`${category.display_name} subcategories`}
                >
                  {children.map((child) => {
                    const isChildSelected = selectedCategory === child.id
                    return (
                      <button
                        key={child.id}
                        type="button"
                        className={cn(
                          "w-full flex items-start gap-2.5 min-h-[32px] py-1.5 px-3 rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-4",
                          isChildSelected
                            ? "bg-gold-600 hover:bg-gold-700 text-white shadow-sm font-semibold focus:ring-gold-300"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 focus:ring-gray-300"
                        )}
                        onClick={() => onCategoryChange(child.id)}
                        aria-current={isChildSelected ? 'page' : undefined}
                      >
                        <CategoryLogo
                          category={child}
                          size="sm"
                          className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                          fallback="text"
                        />
                        <span className="text-xs font-medium whitespace-normal text-left leading-tight line-clamp-2 flex-1">
                          {child.display_name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
