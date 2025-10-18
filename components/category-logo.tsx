'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getCategoryById, getCategoryByAlias, normalizeCategoryName } from '@/lib/tournament-categories'

interface CategoryLogoProps {
  category: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fallback?: 'icon' | 'text' | 'none'
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

export function CategoryLogo({
  category,
  size = 'md',
  className,
  fallback = 'text',
}: CategoryLogoProps) {
  // 카테고리 정보 가져오기 (ID 또는 별칭으로)
  const categoryData = getCategoryById(category) || getCategoryByAlias(category)
  const logoPath = categoryData?.logoUrl

  // If no logo exists for this category
  if (!logoPath) {
    if (fallback === 'none') return null
    if (fallback === 'text') {
      const displayName = categoryData?.displayName || category
      return (
        <span className={cn('font-semibold', className)}>
          {displayName}
        </span>
      )
    }
    // fallback === 'icon'
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded bg-muted',
          SIZE_CLASSES[size],
          className
        )}
      >
        <span className="text-xs font-bold text-muted-foreground">
          {category.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  const displayName = categoryData?.name || category

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        SIZE_CLASSES[size],
        className
      )}
    >
      <Image
        src={logoPath}
        alt={`${displayName} logo`}
        fill
        className="object-contain dark:brightness-110 dark:contrast-90"
        sizes={
          size === 'sm'
            ? '16px'
            : size === 'md'
              ? '24px'
              : size === 'lg'
                ? '32px'
                : '48px'
        }
      />
    </div>
  )
}

/**
 * Check if a category has a logo available
 */
export function hasLogo(category: string): boolean {
  const categoryData = getCategoryById(category) || getCategoryByAlias(category)
  return !!categoryData?.logoUrl
}
