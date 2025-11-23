"use client"

/**
 * Archive Hand History - Flowbite Enhanced
 *
 * Flowbite 패턴을 활용한 개선:
 * - Card Grid 레이아웃 최적화
 * - Empty State 개선 (Alert 스타일)
 * - 접근성 개선
 */

import { useState, useMemo } from 'react'
import { Folder, AlertCircle } from 'lucide-react'
import { useArchiveData } from './ArchiveDataContext'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { HandCard } from '@/components/features/hand/HandCard'
import { HandHistoryDialog } from '@/components/features/hand/HandHistoryDialog'
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
        /* Flowbite Responsive Grid */
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
        /* Flowbite Alert/Empty State */
        <div className="flex items-center justify-center py-24 px-6">
          <div className="w-full max-w-xl">
            <div className="p-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-md">
              <div className="flex flex-col items-center space-y-4 text-center">
                {/* Icon */}
                <div className="p-5 bg-gray-100 dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                  <Folder className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                </div>

                {/* Heading */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    No hands available
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-md">
                    이 영상은 아직 AI 분석이 완료되지 않았습니다.
                  </p>
                </div>

                {/* Info Alert */}
                <div className="w-full p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                        AI 분석으로 핸드를 자동 추출하세요
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        위의 "AI 분석" 버튼을 클릭하여 핸드 히스토리를 자동으로 추출할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
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
