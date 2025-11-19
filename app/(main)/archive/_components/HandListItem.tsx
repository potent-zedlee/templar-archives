"use client"

/**
 * Hand List Item Component
 *
 * 포스트모던 디자인의 핸드 카드 컴포넌트
 * - Flowbite Badge, Button 사용
 * - 카드 표시, 플레이어 아바타, 좋아요/댓글 수
 */

import { memo } from 'react'
import { Badge, Avatar, Button } from 'flowbite-react'
import { Heart, MessageCircle, Eye, Play } from 'lucide-react'
import type { Hand } from '@/lib/types/archive'
import { formatDistanceToNow } from 'date-fns'

interface HandListItemProps {
  hand: Hand
  onClick?: (hand: Hand) => void
  onSeekToTime?: (timeString: string) => void
}

export const HandListItem = memo(function HandListItem({
  hand,
  onClick,
  onSeekToTime
}: HandListItemProps) {
  const handleClick = () => {
    onClick?.(hand)
  }

  const handleSeek = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSeekToTime && hand.timestamp) {
      onSeekToTime(hand.timestamp)
    }
  }

  return (
    <div
      className="card-postmodern hand-list-item mb-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg transition-all cursor-pointer"
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge color="warning" className="font-mono">
            #{hand.number}
          </Badge>
          {hand.timestamp && (
            <Button
              size="xs"
              color="light"
              onClick={handleSeek}
              className="gap-1"
            >
              <Play className="w-3 h-3" />
              {hand.timestamp}
            </Button>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {hand.created_at && formatDistanceToNow(new Date(hand.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Board Cards */}
      {(hand.board_flop || hand.board_turn || hand.board_river) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {hand.board_flop?.map((card, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-sm font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
            >
              {card}
            </span>
          ))}
          {hand.board_turn && (
            <span className="px-2 py-1 text-sm font-bold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
              {hand.board_turn}
            </span>
          )}
          {hand.board_river && (
            <span className="px-2 py-1 text-sm font-bold bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
              {hand.board_river}
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {hand.ai_summary && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">
          {hand.ai_summary}
        </p>
      )}

      {/* Players */}
      {hand.hand_players && hand.hand_players.length > 0 && (
        <div className="flex -space-x-2 mb-3">
          {hand.hand_players.slice(0, 5).map((hp) => (
            <Avatar
              key={hp.id}
              img={hp.player?.photo_url}
              alt={hp.player?.name || 'Player'}
              size="sm"
              className="ring-2 ring-white dark:ring-gray-800"
            />
          ))}
          {hand.hand_players.length > 5 && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800">
              +{hand.hand_players.length - 5}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{hand.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{hand.likes_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{hand.bookmarks_count || 0}</span>
          </div>
        </div>

        {hand.pot_river && (
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            Pot: ${(hand.pot_river / 100).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
})
