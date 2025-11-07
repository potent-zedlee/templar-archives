'use client'

import { PlayerSeat } from './player-seat'
import { PlayingCard } from './playing-card'
import { formatCurrency } from '@/lib/utils'

interface Hand {
  handNumber: number
  stakes: string
  players: Array<{
    seat: number
    name: string
    position: string
    stackSize: number
    holeCards?: string[] | null
    isWinner?: boolean
  }>
  board: {
    flop?: string[]
    turn?: string | null
    river?: string | null
  }
  pot: number
}

interface PokerTableProps {
  hand: Hand
}

// 9-max seat positions (top-down, left-to-right)
const seatPositions = [
  { seat: 1, style: 'top-4 left-1/2 -translate-x-1/2' }, // Top center
  { seat: 2, style: 'top-16 left-20' }, // Top left
  { seat: 3, style: 'top-1/3 left-4' }, // Middle left
  { seat: 4, style: 'bottom-1/3 left-4' }, // Lower left
  { seat: 5, style: 'bottom-16 left-20' }, // Bottom left
  { seat: 6, style: 'bottom-4 left-1/2 -translate-x-1/2' }, // Bottom center
  { seat: 7, style: 'bottom-16 right-20' }, // Bottom right
  { seat: 8, style: 'bottom-1/3 right-4' }, // Lower right
  { seat: 9, style: 'top-1/3 right-4' }, // Middle right
]

export function PokerTable({ hand }: PokerTableProps) {
  // Map players to their seat positions
  const playersBySeat = new Map(hand.players.map((p) => [p.seat, p]))

  // Collect all board cards
  const boardCards: string[] = []
  if (hand.board.flop) boardCards.push(...hand.board.flop)
  if (hand.board.turn) boardCards.push(hand.board.turn)
  if (hand.board.river) boardCards.push(hand.board.river)

  return (
    <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-green-800 to-green-900 rounded-2xl border-8 border-amber-900 shadow-2xl overflow-hidden">
      {/* Felt texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-700/50 via-transparent to-green-950/50" />

      {/* Table center - Board and Pot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
        {/* Pot */}
        <div className="bg-yellow-600/20 border-2 border-yellow-600/40 rounded-full px-6 py-3 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-xs text-yellow-200/80 font-semibold">POT</div>
            <div className="text-2xl font-bold text-yellow-100">
              {formatCurrency(hand.pot)}
            </div>
          </div>
        </div>

        {/* Board cards */}
        {boardCards.length > 0 && (
          <div className="flex gap-2 bg-black/20 px-4 py-3 rounded-lg backdrop-blur-sm">
            {boardCards.map((card, idx) => (
              <PlayingCard key={idx} card={card} size="md" />
            ))}
          </div>
        )}

        {/* Hand info */}
        <div className="text-sm text-white/80 text-center">
          <div className="font-semibold">Hand #{hand.handNumber}</div>
          <div className="text-xs">{hand.stakes}</div>
        </div>
      </div>

      {/* Player seats */}
      {seatPositions.map(({ seat, style }) => {
        const player = playersBySeat.get(seat)
        if (!player) return null

        return (
          <div key={seat} className={`absolute ${style} z-20`}>
            <PlayerSeat player={player} />
          </div>
        )
      })}
    </div>
  )
}
