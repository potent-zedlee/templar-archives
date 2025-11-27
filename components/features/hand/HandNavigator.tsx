"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PlayingCard, parseCard } from "@/components/common/PlayingCard"
import { cn } from "@/lib/utils"

interface HandNavigatorProps {
  currentHand: number
  totalHands: number
  players?: {
    name: string
    cards?: string
  }[]
  potSize?: number
  onPrevious?: () => void
  onNext?: () => void
  className?: string
}

export function HandNavigator({
  currentHand,
  totalHands,
  players = [],
  potSize = 0,
  onPrevious,
  onNext,
  className
}: HandNavigatorProps) {
  const hasPrevious = currentHand > 1
  const hasNext = currentHand < totalHands

  return (
    <div className={cn(
      "flex items-center justify-between p-4 bg-card border-b",
      className
    )}>
      {/* Left: Hand navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-lg font-semibold">
          Hand {currentHand}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!hasNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Center: Players info */}
      <div className="flex items-center gap-4">
        {players.map((player, index) => {
          const cards = player.cards?.split('') || []
          const card1 = cards.length >= 2 ? parseCard(cards.slice(0, 2).join('')) : null
          const card2 = cards.length >= 4 ? parseCard(cards.slice(2, 4).join('')) : null

          return (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm font-medium">{player.name}</span>
              {card1 && card2 && (
                <div className="flex gap-0.5">
                  <PlayingCard
                    rank={card1.rank}
                    suit={card1.suit}
                    size="sm"
                  />
                  <PlayingCard
                    rank={card2.rank}
                    suit={card2.suit}
                    size="sm"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Right: Pot size */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Pot</span>
        <Badge variant="secondary" className="text-base font-mono">
          {potSize.toLocaleString()}
        </Badge>
      </div>
    </div>
  )
}
