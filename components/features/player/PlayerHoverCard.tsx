/**
 * Player Hover Card Component
 *
 * 인스타그램 스타일의 플레이어 프로필 호버 카드
 * 핸드 히스토리에서 플레이어 이름에 마우스를 올리면 프로필 정보 표시
 */

'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, Trophy, MapPin, ExternalLink } from 'lucide-react'
import type { Player } from '@/lib/types/archive'
import { cn } from '@/lib/utils'

interface PlayerHoverCardProps {
  player: Player
  children: ReactNode
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function PlayerHoverCard({
  player,
  children,
  className,
  side = 'top'
}: PlayerHoverCardProps) {
  // 플레이어 이름의 첫 글자 (Fallback)
  const initials = player.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // 상금 포맷팅
  const formatWinnings = (amount?: number) => {
    if (!amount) return 'N/A'
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toLocaleString()}`
  }

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className={cn('cursor-pointer hover:underline', className)}>
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align="center"
        className="w-[320px] p-0 overflow-hidden border-border/50 shadow-2xl bg-card/95 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 헤더 영역 */}
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border/50">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-lg">
                {player.photo_url ? (
                  <AvatarImage src={player.photo_url} alt={player.name} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-semibold text-lg">
                    {initials || <User className="h-6 w-6" />}
                  </AvatarFallback>
                )}
              </Avatar>

              {/* 이름 및 국가 */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base leading-tight line-clamp-1">
                    {player.name}
                  </h3>
                  {player.is_pro && (
                    <Badge
                      variant="secondary"
                      className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-xs px-1.5 py-0"
                    >
                      PRO
                    </Badge>
                  )}
                </div>

                {player.country && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{player.country}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 정보 영역 */}
          <div className="p-4 space-y-3">
            {/* Bio */}
            {player.bio && (
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {player.bio}
              </p>
            )}

            {/* 상금 정보 */}
            {player.total_winnings !== undefined && player.total_winnings > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/20">
                <Trophy className="w-4 h-4 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Total Winnings</p>
                  <p className="font-semibold text-sm text-green-600 dark:text-green-400">
                    {formatWinnings(player.total_winnings)}
                  </p>
                </div>
              </div>
            )}

            {/* 프로필 보기 버튼 */}
            <Link href={`/players/${player.id}`}>
              <Button
                size="sm"
                className="w-full group"
                variant="outline"
              >
                <span className="flex-1">View Profile</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </HoverCardContent>
    </HoverCard>
  )
}
