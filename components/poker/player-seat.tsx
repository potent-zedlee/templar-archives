'use client'

import { PlayingCard } from './playing-card'
import { formatCurrency } from '@/lib/utils'

interface PlayerSeatProps {
  player: {
    name: string
    position: string
    stackSize: number
    holeCards?: string[] | null
    isWinner?: boolean
    seat: number
  }
  isActive?: boolean
}

export function PlayerSeat({ player, isActive = false }: PlayerSeatProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Player info bubble */}
      <div
        className={`
        relative px-4 py-2 rounded-lg border-2
        ${isActive ? 'border-yellow-500 bg-yellow-500/10' : 'border-border bg-card'}
        ${player.isWinner ? 'ring-2 ring-green-500' : ''}
      `}
      >
        {/* Position badge */}
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold">
          {player.seat}
        </div>

        {/* Position label (BTN, SB, BB, etc.) */}
        {player.position && player.position !== 'Unknown' && (
          <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {player.position}
          </div>
        )}

        {/* Player name */}
        <div className="text-sm font-semibold whitespace-nowrap">
          {player.name}
        </div>

        {/* Stack size */}
        <div className="text-xs text-muted-foreground">
          {formatCurrency(player.stackSize)}
        </div>
      </div>

      {/* Hole cards */}
      {player.holeCards && player.holeCards.length > 0 && (
        <div className="flex gap-1">
          {player.holeCards.map((card, idx) => (
            <PlayingCard key={idx} card={card} size="sm" />
          ))}
        </div>
      )}
    </div>
  )
}
