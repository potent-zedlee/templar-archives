/**
 * Hand Card Component
 *
 * 그리드 뷰에서 핸드를 카드 형태로 표시하는 컴포넌트
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Heart, ThumbsDown, Play, MoreHorizontal, Download, Share2, Bookmark, Sparkles } from 'lucide-react'
import type { Hand } from '@/lib/types/archive'
import { cn } from '@/lib/utils'

interface HandCardProps {
  hand: Hand
  onClick?: () => void
  onPlayHand?: (timestamp: string) => void
  className?: string
}

export function HandCard({ hand, onClick, onPlayHand, className }: HandCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [imageError, setImageError] = useState(false)

  // 썸네일 URL (없으면 플레이스홀더)
  const thumbnailUrl = hand.thumbnail_url || '/placeholder-hand.jpg'

  // 블라인드 포맷팅 함수
  const formatBlinds = (sb?: number, bb?: number, ante?: number): string => {
    if (!bb && !sb) return ''

    const formatChips = (chips: number) => {
      if (chips >= 1000000) return `${(chips / 1000000).toFixed(chips % 1000000 === 0 ? 0 : 1)}M`
      if (chips >= 1000) return `${(chips / 1000).toFixed(chips % 1000 === 0 ? 0 : 1)}k`
      return chips.toString()
    }

    const parts = []
    if (sb) parts.push(formatChips(sb))
    if (bb) parts.push(formatChips(bb))
    if (ante && ante > 0) parts.push(formatChips(ante))
    return parts.join('/')
  }

  // 좋아요/싫어요 토글
  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLiked(!isLiked)
    if (isDisliked) setIsDisliked(false)
  }

  const handleDislikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDisliked(!isDisliked)
    if (isLiked) setIsLiked(false)
  }

  // Play 버튼 클릭
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPlayHand?.(hand.timestamp)
  }

  // 메뉴 액션
  const handleMenuAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation()
    console.log(`Action: ${action}`, hand.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card
        className="group relative overflow-hidden cursor-pointer border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
        onClick={onClick}
      >
        {/* 썸네일 이미지 영역 */}
        <div className="aspect-video relative bg-muted overflow-hidden">
          {!imageError ? (
            <Image
              src={thumbnailUrl}
              alt={`Hand #${hand.number}`}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <Play className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Hover 시 Play 오버레이 */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <Button
              size="icon"
              variant="secondary"
              className="w-16 h-16 rounded-full"
              onClick={handlePlayClick}
            >
              <Play className="w-8 h-8" fill="currentColor" />
            </Button>
          </div>

          {/* AI 분석 배지 (우측 상단) */}
          {hand.confidence && hand.confidence > 0 && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                AI
              </Badge>
            </div>
          )}

          {/* 메뉴 버튼 (우측 상단) */}
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'download')}>
                  <Download className="w-4 h-4 mr-2" />
                  다운로드
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'share')}>
                  <Share2 className="w-4 h-4 mr-2" />
                  공유
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'bookmark')}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  북마크
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'edit')}>
                  수정
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 카드 콘텐츠 */}
        <div className="p-4 space-y-3">
          {/* 핸드 번호 + 타임스탬프 */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">Hand #{hand.number}</h3>
            <Badge variant="outline" className="text-xs">
              {hand.timestamp}
            </Badge>
          </div>

          {/* AI 요약 또는 핸드 설명 */}
          {hand.ai_summary ? (
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {hand.ai_summary}
              </p>
            </div>
          ) : hand.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {hand.description}
            </p>
          ) : null}

          {/* 메타 정보 (블라인드, 팟 사이즈, 보드 카드) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 블라인드 정보 */}
            {(hand.big_blind || hand.small_blind) && (
              <Badge variant="outline" className="text-xs font-mono">
                {formatBlinds(hand.small_blind, hand.big_blind, hand.ante)}
              </Badge>
            )}

            {/* 최종 팟 사이즈 (pot_river 우선) */}
            {(hand.pot_river || hand.pot_size) && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 font-semibold">
                ${(hand.pot_river || hand.pot_size)!.toLocaleString()}
              </Badge>
            )}

            {/* 보드 카드 */}
            {hand.board_cards && hand.board_cards.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {hand.board_cards.join(' ')}
              </Badge>
            )}
          </div>

          {/* 좋아요/싫어요 버튼 */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  'h-8 px-3',
                  isLiked && 'text-red-500 hover:text-red-600'
                )}
                onClick={handleLikeToggle}
              >
                <Heart className={cn('w-4 h-4 mr-1', isLiked && 'fill-current')} />
                <span className="text-xs">{(hand.likes_count || 0) + (isLiked ? 1 : 0)}</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  'h-8 px-3',
                  isDisliked && 'text-blue-500 hover:text-blue-600'
                )}
                onClick={handleDislikeToggle}
              >
                <ThumbsDown className={cn('w-4 h-4 mr-1', isDisliked && 'fill-current')} />
                <span className="text-xs">{(hand.dislikes_count || 0) + (isDisliked ? 1 : 0)}</span>
              </Button>
            </div>

            {/* 추가 메타데이터 */}
            {hand.created_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(hand.created_at).toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
