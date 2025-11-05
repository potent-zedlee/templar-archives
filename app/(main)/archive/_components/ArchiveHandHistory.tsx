"use client"

/**
 * Archive Hand History
 *
 * 핸드 히스토리 섹션 컴포넌트
 * - 비디오 헤더 (재생, 다운로드, 닫기)
 * - 핸드 리스트 (Accordion)
 * - 빈 상태 표시
 */

import { Folder } from 'lucide-react'
import { useArchiveData } from './ArchiveDataContext'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { HandListAccordion } from '@/components/hand-list-accordion'
import { Card } from '@/components/ui/card'
import { useMemo } from 'react'

interface ArchiveHandHistoryProps {
  onSeekToTime?: (timeString: string) => void
}

export function ArchiveHandHistory({
  onSeekToTime,
}: ArchiveHandHistoryProps) {
  const { hands } = useArchiveData()
  const { advancedFilters } = useArchiveUIStore()

  // Filter hands based on advanced filters
  const filteredHands = useMemo(() => {
    let filtered = [...hands]

    // Filter by player name
    if (advancedFilters.playerName?.trim()) {
      const playerQuery = advancedFilters.playerName.toLowerCase()
      filtered = filtered.filter((hand) =>
        hand.hand_players?.some((hp) =>
          hp.player?.name?.toLowerCase().includes(playerQuery)
        )
      )
    }

    // Filter by hole cards
    if (advancedFilters.holeCards && advancedFilters.holeCards.length > 0) {
      filtered = filtered.filter((hand) => {
        return hand.hand_players?.some((hp) => {
          const playerCards = hp.cards || []
          // Check if player has all specified hole cards
          return advancedFilters.holeCards!.every((card) =>
            playerCards.includes(card)
          )
        })
      })
    }

    // Filter by hand value (board cards)
    if (advancedFilters.handValue && advancedFilters.handValue.length > 0) {
      filtered = filtered.filter((hand) => {
        const boardCards = hand.board_cards || []
        // Check if board contains all specified cards
        return advancedFilters.handValue!.every((card) =>
          boardCards.includes(card)
        )
      })
    }

    return filtered
  }, [hands, advancedFilters])

  // Transform hands for HandListAccordion
  const transformedHands = useMemo(() => {
    return filteredHands.map((hand) => {
      // Parse timestamp: Supports "MM:SS-MM:SS" or "MM:SS" format
      const timestamp = hand.timestamp || ''
      const parts = timestamp.split('-')
      const startTime = parts[0] || '00:00'
      const endTime = parts[1] || parts[0] || '00:00'

      return {
        handNumber: hand.number || '???',
        summary: hand.description || 'Hand Info',
        timestamp: 0,
        startTime,
        endTime,
        duration: 0,
        winner:
          hand.hand_players?.find((hp) => hp.position === 'BTN')?.player?.name || 'Unknown',
        potSize: hand.pot_size || 0,
        players:
          hand.hand_players?.map((hp) => ({
            name: hp.player?.name || 'Unknown',
            position: hp.position || 'Unknown',
            cards: hp.cards?.join('') || '',
            stackBefore: 0,
            stackAfter: 0,
            stackChange: 0,
          })) || [],
        communityCards: {
          preflop: [],
          flop: hand.board_cards?.slice(0, 3) || [],
          turn: hand.board_cards?.slice(3, 4) || [],
          river: hand.board_cards?.slice(4, 5) || [],
        },
        actions: {
          preflop: [],
          flop: [],
          turn: [],
          river: [],
        },
        streets: {
          preflop: { actions: [], pot: 0 },
          flop: { actions: [], pot: 0 },
          turn: { actions: [], pot: 0 },
          river: { actions: [], pot: 0 },
        },
        confidence: 0.8,
      }
    })
  }, [filteredHands])

  return (
    <div className="space-y-0">
      {/* Hand List */}
      <Card className="p-7 backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden">
        <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight mb-7">
          Hand History
        </h2>
        <div>
          {hands.length > 0 ? (
            <HandListAccordion
              handIds={hands.map((hand) => hand.id)}
              hands={transformedHands}
              onPlayHand={(startTime) => {
                onSeekToTime?.(startTime)
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="inline-block p-8 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl">
                <Folder className="h-16 w-16 text-muted-foreground/40 mb-4 mx-auto" />
                <p className="text-xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent text-center">
                  No Hands Available
                </p>
                <p className="text-sm text-muted-foreground/70 text-center max-w-md">
                  Import hands from external systems. API: POST /api/import-hands
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
