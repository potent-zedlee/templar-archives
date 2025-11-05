"use client"

/**
 * Archive Hand History
 *
 * 핸드 히스토리 섹션 컴포넌트 (카드 그리드 뷰)
 * - 핸드 카드 그리드 레이아웃
 * - 빈 상태 표시
 * - Hand History Dialog 통합
 */

import { useState, useMemo } from 'react'
import { Folder } from 'lucide-react'
import { useArchiveData } from './ArchiveDataContext'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { HandCard } from '@/components/hand-card'
import { HandHistoryDialog } from '@/components/hand-history-dialog'
import { Card } from '@/components/ui/card'

interface ArchiveHandHistoryProps {
  onSeekToTime?: (timeString: string) => void
  overrideHands?: Hand[]
}

export function ArchiveHandHistory({
  onSeekToTime,
  overrideHands,
}: ArchiveHandHistoryProps) {
  const { hands: contextHands, tournaments } = useArchiveData()

  // Use overrideHands if provided, otherwise use context hands
  const hands = overrideHands !== undefined ? overrideHands : contextHands
  const { selectedDay } = useArchiveDataStore()
  const { advancedFilters } = useArchiveUIStore()

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedHandIndex, setSelectedHandIndex] = useState(0)

  // Find selected day data
  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null

    for (const tournament of tournaments) {
      for (const subEvent of tournament.sub_events || []) {
        const day = subEvent.days?.find((d: any) => d.id === selectedDay)
        if (day) return { day, tournament }
      }
    }
    return null
  }, [selectedDay, tournaments])

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

  // Open hand detail dialog
  const handleOpenHandDetail = (index: number) => {
    setSelectedHandIndex(index)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-0">
      {/* Hand List */}
      <Card className="p-7 backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
              Hand History
            </h2>
            {filteredHands.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {filteredHands.length} {filteredHands.length === 1 ? 'hand' : 'hands'} found
              </p>
            )}
          </div>
        </div>

        {/* 그리드 레이아웃 */}
        {filteredHands.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredHands.map((hand, index) => (
              <HandCard
                key={hand.id}
                hand={hand}
                onClick={() => handleOpenHandDetail(index)}
                onPlayHand={(timestamp) => onSeekToTime?.(timestamp)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="inline-block p-8 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl">
              <Folder className="h-16 w-16 text-muted-foreground/40 mb-4 mx-auto" />
              <p className="text-xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent text-center">
                No Hands Available
              </p>
              <p className="text-sm text-muted-foreground/70 text-center max-w-md mb-4">
                이 영상은 아직 AI 분석이 완료되지 않았습니다.
              </p>
              <p className="text-xs text-muted-foreground/50 text-center max-w-md">
                위의 "AI 분석" 버튼을 클릭하여 핸드 히스토리를 자동으로 추출할 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Hand History Dialog */}
      {selectedDayData && filteredHands.length > 0 && (
        <HandHistoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          hand={filteredHands[selectedHandIndex]}
          day={selectedDayData.day}
          tournament={selectedDayData.tournament}
          allHands={filteredHands}
          currentHandIndex={selectedHandIndex}
          onHandChange={setSelectedHandIndex}
        />
      )}
    </div>
  )
}
