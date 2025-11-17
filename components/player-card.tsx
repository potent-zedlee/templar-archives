/**
 * Player Card Component
 *
 * People 섹션에서 플레이어를 카드 형태로 표시하는 컴포넌트
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayerCardProps {
  player: {
    id: string
    name: string
    photo_url?: string | null
    country?: string | null
    hand_count?: number
  }
  className?: string
  index?: number
}

export function PlayerCard({ player, className, index = 0 }: PlayerCardProps) {
  // 플레이어 이름의 첫 글자 (Fallback)
  const initials = player.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn('flex-shrink-0', className)}
    >
      <Link href={`/players/${player.id}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 p-4 cursor-pointer min-w-[140px]">
          <div className="flex flex-col items-center space-y-3">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full border-2 border-gray-100 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-700">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700">
                  {initials ? (
                    <span className="text-xl font-semibold text-white">
                      {initials}
                    </span>
                  ) : (
                    <User className="h-6 w-6 text-white" />
                  )}
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-center space-y-1 w-full">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                {player.name}
              </p>

              {/* Country */}
              {player.country && (
                <p className="text-xs text-gray-600 dark:text-gray-400">{player.country}</p>
              )}
            </div>

            {/* Hand Count Badge */}
            {player.hand_count !== undefined && player.hand_count > 0 && (
              <div className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded font-mono">
                {player.hand_count} {player.hand_count === 1 ? 'hand' : 'hands'}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/**
 * Player Card List Component
 * 가로 스크롤 가능한 플레이어 카드 리스트
 */
interface PlayerCardListProps {
  players: Array<{
    id: string
    name: string
    photo_url?: string | null
    country?: string | null
    hand_count?: number
  }>
  className?: string
}

export function PlayerCardList({ players, className }: PlayerCardListProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No players found
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto pb-4', className)}>
      <div className="flex gap-3 px-1">
        {players.map((player, index) => (
          <PlayerCard key={player.id} player={player} index={index} />
        ))}
      </div>
    </div>
  )
}
