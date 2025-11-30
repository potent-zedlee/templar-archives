'use client'

import * as React from 'react'
import {
  HeartCrack,
  Flame,
  Shield,
  Angry,
  Eye,
  Sparkles,
  Turtle,
  Theater,
  Coins,
  TrendingUp,
  Trophy,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// 시맨틱 태그 설정 타입
type TagKey =
  | '#BadBeat'
  | '#Cooler'
  | '#HeroCall'
  | '#Tilt'
  | '#SoulRead'
  | '#SuckOut'
  | '#SlowPlay'
  | '#Bluff'
  | '#AllIn'
  | '#BigPot'
  | '#FinalTable'
  | '#BubblePlay'

interface TagConfig {
  icon: LucideIcon
  color: string
  description: string
}

// 태그별 설정
const TAG_CONFIG: Record<TagKey, TagConfig> = {
  '#BadBeat': {
    icon: HeartCrack,
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    description: '95%+ 에퀴티에서 역전패',
  },
  '#Cooler': {
    icon: Flame,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    description: '프리미엄 vs 프리미엄 (AA vs KK 등)',
  },
  '#HeroCall': {
    icon: Shield,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: '블러프 캐치 성공',
  },
  '#Tilt': {
    icon: Angry,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    description: '틸트 상태 플레이',
  },
  '#SoulRead': {
    icon: Eye,
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    description: '정확한 핸드 리딩',
  },
  '#SuckOut': {
    icon: Sparkles,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    description: '아웃츠로 역전승',
  },
  '#SlowPlay': {
    icon: Turtle,
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    description: '강한 핸드로 체크/콜',
  },
  '#Bluff': {
    icon: Theater,
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    description: '약한 핸드로 큰 베팅',
  },
  '#AllIn': {
    icon: Coins,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: '올인 상황',
  },
  '#BigPot': {
    icon: TrendingUp,
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: '대형 팟 (100BB+)',
  },
  '#FinalTable': {
    icon: Trophy,
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    description: '파이널 테이블',
  },
  '#BubblePlay': {
    icon: Target,
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: '버블 상황 플레이',
  },
}

// 사이즈별 스타일
const SIZE_STYLES = {
  sm: 'text-xs px-1.5 py-0.5 gap-0.5 [&>svg]:size-3',
  md: 'text-sm px-2 py-1 gap-1 [&>svg]:size-3.5',
  lg: 'text-base px-3 py-1.5 gap-1.5 [&>svg]:size-4',
}

interface SemanticTagsProps {
  /** 표시할 태그 목록 */
  tags: string[]
  /** 배지 크기 */
  size?: 'sm' | 'md' | 'lg'
  /** 툴팁 표시 여부 */
  showTooltip?: boolean
  /** 최대 표시 개수, 나머지는 +N으로 표시 */
  maxDisplay?: number
  /** 추가 className */
  className?: string
}

/**
 * 시맨틱 태그 배지 컴포넌트
 *
 * @example
 * ```tsx
 * <SemanticTags
 *   tags={['#BadBeat', '#AllIn', '#BigPot']}
 *   size="md"
 *   showTooltip
 * />
 * ```
 */
export function SemanticTags({
  tags,
  size = 'md',
  showTooltip = true,
  maxDisplay,
  className,
}: SemanticTagsProps) {
  // 유효한 태그만 필터링
  const validTags = tags.filter((tag) => tag in TAG_CONFIG) as TagKey[]

  if (validTags.length === 0) {
    return null
  }

  // 표시할 태그와 나머지 태그 분리
  const displayTags = maxDisplay ? validTags.slice(0, maxDisplay) : validTags
  const remainingCount = maxDisplay && validTags.length > maxDisplay
    ? validTags.length - maxDisplay
    : 0

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {displayTags.map((tag) => {
        const config = TAG_CONFIG[tag]
        const Icon = config.icon

        const badgeContent = (
          <Badge
            variant="outline"
            className={cn(
              'transition-all duration-200',
              config.color,
              SIZE_STYLES[size],
              showTooltip && 'cursor-help hover:scale-105'
            )}
          >
            <Icon />
            <span>{tag}</span>
          </Badge>
        )

        if (showTooltip) {
          return (
            <Tooltip key={tag}>
              <TooltipTrigger asChild>
                {badgeContent}
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{tag}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.description}
                </p>
              </TooltipContent>
            </Tooltip>
          )
        }

        return <React.Fragment key={tag}>{badgeContent}</React.Fragment>
      })}

      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className={cn(
                'cursor-help transition-all duration-200 hover:scale-105',
                SIZE_STYLES[size]
              )}
            >
              +{remainingCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">
              {validTags.slice(maxDisplay).join(', ')}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

// 개별 태그 배지 컴포넌트 (단일 태그 표시용)
interface SemanticTagBadgeProps {
  tag: TagKey
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  onClick?: () => void
  className?: string
}

export function SemanticTagBadge({
  tag,
  size = 'md',
  showTooltip = true,
  onClick,
  className,
}: SemanticTagBadgeProps) {
  const config = TAG_CONFIG[tag]
  const Icon = config.icon

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        'transition-all duration-200',
        config.color,
        SIZE_STYLES[size],
        (showTooltip || onClick) && 'cursor-pointer hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <Icon />
      <span>{tag}</span>
    </Badge>
  )

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{tag}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {config.description}
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return badgeContent
}

// 태그 설정 export (다른 컴포넌트에서 사용 가능)
export { TAG_CONFIG, type TagKey, type TagConfig }
