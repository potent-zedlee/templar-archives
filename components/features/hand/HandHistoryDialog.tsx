"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { VideoPlayer } from "./video-player"
import { PokerTable } from "./poker-table"
import { HandNavigator } from "./hand-navigator"
import { HandSummary } from "./hand-summary"
import { HandComments } from "./hand-comments"
import { HandHistoryTimeline } from "./hand-history-timeline"
import {
  Download,
  ChevronLeft,
  Share2,
  Bookmark,
  MessageSquare,
  Heart,
  MoreHorizontal
} from "lucide-react"
import { Badge } from "./ui/badge"
import type { FirestoreStream } from "@/lib/firestore-types"

interface HandData {
  id: string
  number: string
  description?: string
  timestamp?: string
  pot_size?: number
  board_cards?: string[]
  hand_players?: Array<{
    player?: {
      id?: string
      name: string
      normalized_name?: string
      avatar?: string
      aliases?: string[]
      bio?: string
      is_pro?: boolean
      photo_url?: string
      country?: string
      total_winnings?: number
      created_at?: string
    }
    position?: string
    cards?: string[] | string | null  // Support legacy format
    stack?: number
    is_winner?: boolean
  }>
  streets?: {
    preflop?: { actions?: any[]; pot?: number }
    flop?: { actions?: any[]; pot?: number }
    turn?: { actions?: any[]; pot?: number }
    river?: { actions?: any[]; pot?: number }
  }
}

interface HandHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hand: HandData
  day: Stream
  tournament?: {
    name: string
    category?: string
  }
  allHands?: HandData[]
  currentHandIndex?: number
  onHandChange?: (index: number) => void
}

export function HandHistoryDialog({
  open,
  onOpenChange,
  hand,
  day,
  tournament,
  allHands = [],
  currentHandIndex = 0,
  onHandChange
}: HandHistoryDialogProps) {
  const [seekTime, setSeekTime] = useState<number | null>(null)

  // Parse timestamp for video seeking
  const handleSeekToTime = (timeString: string) => {
    const parts = timeString.split(':')
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10)
      const seconds = parseInt(parts[1], 10)
      setSeekTime(minutes * 60 + seconds)
    }
  }

  // Transform hand data for PokerTable
  const tableData = useMemo(() => {
    const players = hand.hand_players?.map(hp => ({
      name: hp.player?.name || "Unknown",
      position: hp.position,
      avatar: hp.player?.avatar,
      stack: hp.stack || 0,
      cards: hp.cards,
      isWinner: hp.is_winner,
      playerData: hp.player ? {
        id: hp.player.id || '',
        name: hp.player.name,
        normalized_name: hp.player.normalized_name || hp.player.name.toLowerCase(),
        aliases: hp.player.aliases,
        bio: hp.player.bio,
        is_pro: hp.player.is_pro,
        photo_url: hp.player.photo_url,
        country: hp.player.country,
        total_winnings: hp.player.total_winnings,
        created_at: hp.player.created_at
      } : undefined
    })) || []

    return {
      players,
      boardCards: hand.board_cards || [],
      potSize: hand.pot_size || 0
    }
  }, [hand])

  // Transform for HandNavigator
  const navigatorPlayers = useMemo(() => {
    return hand.hand_players?.slice(0, 2).map(hp => ({
      name: hp.player?.name || "Unknown",
      cards: hp.cards?.join('')
    })) || []
  }, [hand])

  // Download hand as JSON
  const handleDownload = () => {
    const dataStr = JSON.stringify(hand, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `hand-${hand.number}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b bg-card flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div>
                <DialogTitle className="text-lg">
                  {tournament?.name || "Tournament"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {day.name}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleDownload}>
                <Download className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Bookmark className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Video + Details */}
          <div className="w-1/2 flex flex-col border-r">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Video Player */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <VideoPlayer day={day} seekTime={seekTime} />
                </div>

                {/* Hand Navigator */}
                <HandNavigator
                  currentHand={currentHandIndex + 1}
                  totalHands={allHands.length}
                  players={navigatorPlayers}
                  potSize={hand.pot_size}
                  onPrevious={() => onHandChange?.(currentHandIndex - 1)}
                  onNext={() => onHandChange?.(currentHandIndex + 1)}
                />

                {/* Hand Summary */}
                <HandSummary
                  handId={hand.id}
                  title={`Hand #${hand.number}`}
                  summary={hand.description || ""}
                  editable={false}
                />

                {/* Comments */}
                <HandComments handId={hand.id} />
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Poker Table + Timeline */}
          <div className="w-1/2 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Poker Table (Collapsible) */}
                <PokerTable
                  players={tableData.players}
                  boardCards={tableData.boardCards}
                  potSize={tableData.potSize}
                  currentStreet="river"
                  showAllCards={true}
                  defaultOpen={true}
                />

                {/* Hand History Timeline */}
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-3">Action History</h3>
                  <HandHistoryTimeline
                    players={hand.hand_players?.map(hp => ({
                      name: hp.player?.name || "Unknown",
                      position: hp.position || "Unknown",
                      cards: hp.cards?.join('') || "",
                      stackBefore: hp.stack || 0,
                      stackAfter: hp.stack || 0,
                      stackChange: 0
                    })) || []}
                    communityCards={{
                      preflop: [],
                      flop: hand.board_cards?.slice(0, 3) || [],
                      turn: hand.board_cards?.slice(3, 4) || [],
                      river: hand.board_cards?.slice(4, 5) || []
                    }}
                    actions={{
                      preflop: hand.streets?.preflop?.actions || [],
                      flop: hand.streets?.flop?.actions || [],
                      turn: hand.streets?.turn?.actions || [],
                      river: hand.streets?.river?.actions || []
                    }}
                    streets={{
                      preflop: hand.streets?.preflop || { actions: [], pot: 0 },
                      flop: hand.streets?.flop || { actions: [], pot: 0 },
                      turn: hand.streets?.turn || { actions: [], pot: 0 },
                      river: hand.streets?.river || { actions: [], pot: 0 }
                    }}
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
