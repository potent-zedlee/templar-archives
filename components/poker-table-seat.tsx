"use client"

import { PlayingCard, parseCard } from "./playing-card"
import { PositionBadge } from "./position-badge"
import { PlayerHoverCard } from "./player-hover-card"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"
import type { Player } from "@/lib/types/archive"

interface PokerTableSeatProps {
  player: {
    name: string
    position?: string
    avatar?: string
    stack: number // in BB
    cards?: string[] // e.g., ["As", "Kh"]
    isWinner?: boolean
  }
  playerData?: Player // Full player data for hover card
  showCards?: boolean
  isActive?: boolean
  className?: string
}

export function PokerTableSeat({
  player,
  playerData,
  showCards = false,
  isActive = false,
  className
}: PokerTableSeatProps) {
  const { name, position, avatar, stack, cards, isWinner } = player

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 relative",
        isActive && "ring-2 ring-yellow-400 rounded-lg p-2",
        className
      )}
    >
      {/* Position Badge */}
      {position && (
        <div className="absolute -top-2 -left-2 z-10">
          <PositionBadge position={position} />
        </div>
      )}

      {/* Player Avatar */}
      <div className="relative">
        <Avatar className={cn(
          "w-16 h-16 border-2",
          isWinner ? "border-yellow-400" : "border-white/20"
        )}>
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Winner Badge */}
        {isWinner && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs px-2 py-0.5">
              WIN
            </Badge>
          </div>
        )}
      </div>

      {/* Player Name with Hover Card */}
      <div className="text-center">
        {playerData ? (
          <PlayerHoverCard player={playerData} side="bottom">
            <div className="text-sm font-semibold text-foreground truncate max-w-[120px]">
              {name}
            </div>
          </PlayerHoverCard>
        ) : (
          <div className="text-sm font-semibold text-foreground truncate max-w-[120px]">
            {name}
          </div>
        )}
        <div className="text-xs font-mono text-blue-400">
          {stack.toFixed(1)} BB
        </div>
      </div>

      {/* Hole Cards */}
      {cards && cards.length > 0 && (
        <div className="flex gap-1">
          {cards.map((cardString, index) => {
            const card = parseCard(cardString)

            if (!card) {
              return (
                <PlayingCard
                  key={index}
                  rank="?"
                  suit="?"
                  faceUp={false}
                  size="sm"
                />
              )
            }

            return (
              <PlayingCard
                key={index}
                rank={card.rank}
                suit={card.suit}
                faceUp={showCards}
                size="sm"
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
