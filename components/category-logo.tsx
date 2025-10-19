'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getCategoryById, getCategoryByAlias } from '@/lib/tournament-categories'

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
  const isPng = logoPath.endsWith('.png')

  // PNG 파일은 Next.js Image 사용 (최적화된 이미지 로딩)
  if (isPng) {
    return (
      <div
        className={cn(
          'flex items-center justify-center relative',
          SIZE_CLASSES[size],
          className
        )}
      >
        <Image
          src={logoPath}
          alt={`${displayName} logo`}
          fill
          className="object-contain"
        />
      </div>
    )
  }

  // SVG는 CSS mask를 사용하여 currentColor로 렌더링 (다크모드 대응)
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        SIZE_CLASSES[size],
        className
      )}
      style={{
        maskImage: `url(${logoPath})`,
        WebkitMaskImage: `url(${logoPath})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        backgroundColor: 'currentColor',
      }}
      role="img"
      aria-label={`${displayName} logo`}
    />
  )
}

/**
 * Check if a category has a logo available
 */
export function hasLogo(category: string): boolean {
  const categoryData = getCategoryById(category) || getCategoryByAlias(category)
  return !!categoryData?.logoUrl
}
