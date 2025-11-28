import { PlayerSeat, PlayerSeatData } from './PlayerSeat'
import { CommunityCards } from './CommunityCards'
import { cn } from '@/lib/utils'

interface PokerTableProps {
  players: PlayerSeatData[]
  flop?: string[] | null
  turn?: string | null
  river?: string | null
  potSize?: number | null
  className?: string
  highlightedPlayerId?: string | null
  showCards?: boolean
}

// Calculate player position on ellipse (6-9 max)
// Returns { top, left, transform } CSS properties
function getSeatPosition(seat: number, totalSeats: number) {
  // Distribute evenly around an ellipse
  // Seat 1 starts at top-left (about 10 o'clock position)
  const startAngle = -110 // degrees
  const angleStep = 360 / totalSeats
  const angle = startAngle + (seat - 1) * angleStep
  const radians = (angle * Math.PI) / 180

  // Ellipse parameters (center at 50%, 50%)
  const radiusX = 42 // % from center horizontally
  const radiusY = 35 // % from center vertically

  const x = 50 + radiusX * Math.cos(radians)
  const y = 50 + radiusY * Math.sin(radians)

  return {
    position: 'absolute' as const,
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
  }
}

export function PokerTable({
  players,
  flop,
  turn,
  river,
  potSize,
  className,
  highlightedPlayerId,
  showCards = true,
}: PokerTableProps) {
  // Sort players by seat number
  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat)
  const totalSeats = sortedPlayers.length

  if (totalSeats === 0) {
    return (
      <div className="w-full aspect-[16/10] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
        <p className="text-muted-foreground">No players in this hand</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Table Container */}
      <div className="relative w-full aspect-[16/10] min-h-[600px]">
        {/* Poker Table (Ellipse) */}
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="relative w-full h-full">
            {/* Table Surface */}
            <div
              className="absolute inset-0 rounded-[50%] bg-gradient-to-br from-green-700 via-green-800 to-green-900 border-[12px] border-amber-900 shadow-2xl"
              style={{
                boxShadow:
                  'inset 0 0 60px rgba(0,0,0,0.5), 0 20px 60px rgba(0,0,0,0.4)',
              }}
            >
              {/* Table Inner Border */}
              <div className="absolute inset-4 rounded-[50%] border-2 border-amber-800/50" />
            </div>

            {/* Community Cards (Center) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <CommunityCards
                flop={flop}
                turn={turn}
                river={river}
                potSize={potSize}
              />
            </div>

            {/* Player Seats */}
            {sortedPlayers.map((player) => (
              <div
                key={player.id}
                style={getSeatPosition(player.seat, totalSeats)}
                className="z-20"
              >
                <PlayerSeat
                  player={player}
                  showCards={showCards}
                  highlighted={player.id === highlightedPlayerId}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Players Legend (Mobile) */}
      <div className="mt-6 lg:hidden">
        <div className="text-sm font-medium mb-2">Players:</div>
        <div className="grid grid-cols-2 gap-2">
          {sortedPlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-2 p-2 rounded border"
            >
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                {player.seat}
              </div>
              <div className="flex-1 text-sm">
                <div className="font-medium truncate">{player.name}</div>
                <div className="text-xs text-muted-foreground">
                  {player.position || '-'}
                </div>
              </div>
              {player.isWinner && (
                <div className="text-green-500 text-xs font-bold">WIN</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
