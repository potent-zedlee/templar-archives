"use client"

/**
 * Archive Hand History
 *
 * 핸드 히스토리 섹션 컴포넌트
 * - 비디오 헤더 (재생, 다운로드, 닫기)
 * - 핸드 리스트 (Accordion)
 * - 빈 상태 표시
 */

import { CheckCircle, X, Play, Download, Folder } from 'lucide-react'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { useArchiveData } from './ArchiveDataContext'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { HandListAccordion } from '@/components/hand-list-accordion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/empty-state'
import { useMemo } from 'react'

export function ArchiveHandHistory() {
  const { tournaments, hands } = useArchiveData()
  const { setSelectedDay } = useArchiveDataStore()
  const { openVideoDialog, advancedFilters } = useArchiveUIStore()

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

  // Get selected day data
  const selectedDayData = useMemo(() => {
    for (const tournament of tournaments) {
      for (const subEvent of tournament.sub_events || []) {
        const day = subEvent.days?.find((d) => d.selected)
        if (day) {
          return {
            day,
            subEvent,
            tournament,
          }
        }
      }
    }
    return null
  }, [tournaments])

  // Build breadcrumb title
  const title = useMemo(() => {
    if (!selectedDayData) return 'Select a day'

    const parts = []
    if (selectedDayData.tournament.name) parts.push(selectedDayData.tournament.name)
    if (selectedDayData.subEvent.name) parts.push(selectedDayData.subEvent.name)
    if (selectedDayData.day.name) parts.push(selectedDayData.day.name)

    return parts.join(' › ') || 'Select a day'
  }, [selectedDayData])

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

  const handleCloseHandHistory = () => {
    setSelectedDay(null)
    // React Query가 hands를 자동으로 관리
  }

  return (
    <div className="space-y-6">
      {/* Video Header */}
      <Card className="p-5 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-md border-2 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {title}
            </h2>
            {selectedDayData && hands.length > 0 && (
              <div className="flex items-center gap-2 text-caption text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{hands.length} hands</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {selectedDayData && (selectedDayData.day.video_url || selectedDayData.day.video_file || selectedDayData.day.video_nas_path) && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const videoUrl = selectedDayData.day.video_url || selectedDayData.day.video_file || selectedDayData.day.video_nas_path || ''
                  openVideoDialog(videoUrl)
                }}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Play
              </Button>
            )}
            <Button variant="outline" size="icon" title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseHandHistory}
              title="Close Hand History"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Hand List */}
      <Card className="p-6 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-md border-2 shadow-lg hover:shadow-xl transition-all duration-300">
        <h2 className="text-xl font-bold mb-6">Hand History</h2>
        <div>
          {hands.length > 0 ? (
            <HandListAccordion
              handIds={hands.map((hand) => hand.id)}
              hands={transformedHands}
              onPlayHand={(startTime) => {
                openVideoDialog(startTime)
              }}
            />
          ) : (
            <EmptyState
              icon={Folder}
              title="No Hands Available"
              description="Import hands from external systems. API: POST /api/import-hands"
              variant="inline"
            />
          )}
        </div>
      </Card>
    </div>
  )
}
