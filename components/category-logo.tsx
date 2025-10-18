'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Category to logo filename mapping
 * SVG files should be placed in /public/logos/
 */
const CATEGORY_LOGOS: Record<string, string> = {
  'WSOP': '/logos/wsop.svg',
  'Triton': '/logos/triton.svg',
  'EPT': '/logos/ept.svg',
  'Hustler Casino Live': '/logos/hustler.svg',
  'APT': '/logos/apt.svg',
  'APL': '/logos/apl.svg',
  'GGPOKER': '/logos/ggpoker.svg',
}

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
  const logoPath = CATEGORY_LOGOS[category]

  // If no logo exists for this category
  if (!logoPath) {
    if (fallback === 'none') return null
    if (fallback === 'text') {
      return (
        <span className={cn('font-semibold', className)}>
          {category === 'Hustler Casino Live' ? 'Hustler' : category}
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
          {category.charAt(0)}
        </span>
      </div>
    )
  }

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
        alt={`${category} logo`}
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
  return category in CATEGORY_LOGOS
}

/**
 * Get all categories that have logos
 */
export function getCategoriesWithLogos(): string[] {
  return Object.keys(CATEGORY_LOGOS)
}
