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
import type { Hand } from '@/lib/types/archive'

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
      for (const event of tournament.events || []) {
        const stream = event.streams?.find((s: any) => s.id === selectedDay)
        if (stream) return { day: stream, tournament }
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
      {/* Hand Grid or Empty State */}
      {filteredHands.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="inline-block p-10 rounded-lg bg-white border border-gray-200 shadow-sm max-w-lg">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-6 rounded-lg bg-gray-100 border border-gray-200">
                <Folder className="h-20 w-20 text-gray-400" />
              </div>
              <div className="space-y-3 text-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  No hands available
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-md">
                  이 영상은 아직 AI 분석이 완료되지 않았습니다.
                </p>
                <p className="text-xs text-gray-500 leading-relaxed max-w-md pt-2 border-t border-gray-200">
                  위의 "AI 분석" 버튼을 클릭하여 핸드 히스토리를 자동으로 추출할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
