'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface CategoryLogoProps {
  category: string | { id: string; logo_url?: string | null; name?: string }
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

// 심볼 로고 우선 사용 매핑
const SYMBOL_LOGO_MAPPING: Record<string, string> = {
  '/logos/wsop.svg': '/logos/wsop-symbol.svg',
  '/logos/triton.svg': '/logos/triton-symbol.svg',
  '/logos/triton.png': '/logos/triton-symbol.svg',
  '/logos/wpt.svg': '/logos/wpt-symbol.svg',
}

export function CategoryLogo({
  category,
  size = 'md',
  className,
  fallback = 'text',
}: CategoryLogoProps) {
  // 카테고리 정보 가져오기
  let categoryData
  let logoPath: string | undefined

  if (typeof category === 'string') {
    // String인 경우 처리할 수 없으므로 undefined로 설정
    logoPath = undefined
  } else {
    // DB에서 가져온 객체인 경우 logo_url 사용
    if (category.logo_url) {
      logoPath = category.logo_url
    }
    categoryData = category
  }

  // 심볼 버전이 있으면 우선 사용
  if (logoPath && SYMBOL_LOGO_MAPPING[logoPath]) {
    logoPath = SYMBOL_LOGO_MAPPING[logoPath]
  }

  // If no logo exists for this category
  if (!logoPath) {
    if (fallback === 'none') return null

    const displayName = typeof category === 'string'
      ? (categoryData?.displayName || category)
      : (category.name || categoryData?.displayName || category.id)

    if (fallback === 'text') {
      return (
        <span className={cn('font-semibold', className)}>
          {displayName}
        </span>
      )
    }
    // fallback === 'icon'
    const firstChar = typeof category === 'string'
      ? category.charAt(0).toUpperCase()
      : (category.name?.[0] || category.id.charAt(0)).toUpperCase()

    return (
      <div
        className={cn(
          'flex items-center justify-center rounded bg-muted',
          SIZE_CLASSES[size],
          className
        )}
      >
        <span className="text-xs font-bold text-muted-foreground">
          {firstChar}
        </span>
      </div>
    )
  }

  const displayName = typeof category === 'string'
    ? (categoryData?.name || category)
    : (category.name || categoryData?.name || category.id)
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

  // SVG는 img 태그로 렌더링하여 원본 컬러 유지
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        SIZE_CLASSES[size],
        className
      )}
    >
      <img
        src={logoPath}
        alt={`${displayName} logo`}
        className="w-full h-full object-contain"
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
