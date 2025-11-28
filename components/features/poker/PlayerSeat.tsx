import { HoleCards } from './Card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PlayerSeatData {
  id: string
  seat: number
  position?: string
  name: string
  stack: number
  holeCards?: string[] | null
  isWinner?: boolean
  finalAmount?: number
  handDescription?: string
  flagCode?: string
}

interface PlayerSeatProps {
  player: PlayerSeatData
  className?: string
  showCards?: boolean
  highlighted?: boolean
}

export function PlayerSeat({
  player,
  className,
  showCards = true,
  highlighted = false,
}: PlayerSeatProps) {
  const initials = player.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const formatStack = (stack: number) => {
    if (stack >= 1000000) return `${(stack / 1000000).toFixed(1)}M`
    if (stack >= 1000) return `${(stack / 1000).toFixed(1)}K`
    return stack.toLocaleString()
  }

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
        highlighted
          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 shadow-lg'
          : 'border-border bg-card',
        player.isWinner &&
          'ring-2 ring-green-500 border-green-500 bg-green-50 dark:bg-green-950/20',
        className
      )}
    >
      {/* Seat Number */}
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow">
        {player.seat}
      </div>

      {/* Winner Crown */}
      {player.isWinner && (
        <div className="absolute -top-3 -right-3 text-yellow-500">
          <Trophy className="w-6 h-6 fill-current" />
        </div>
      )}

      {/* Avatar */}
      <Avatar className="w-16 h-16 border-2 border-background">
        <AvatarImage
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
          alt={player.name}
        />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="text-center">
        <div className="font-semibold text-sm truncate max-w-[120px]">
          {player.name}
        </div>
        {player.position && (
          <Badge variant="outline" className="mt-1 text-xs">
            {player.position}
          </Badge>
        )}
      </div>

      {/* Stack */}
      <div className="text-center">
        <div className="text-xs text-muted-foreground">Stack</div>
        <div className="font-bold text-sm">{formatStack(player.stack)}</div>
      </div>

      {/* Hole Cards */}
      {showCards && player.holeCards && player.holeCards.length > 0 && (
        <div className="mt-1">
          <HoleCards cards={player.holeCards} size="sm" />
        </div>
      )}

      {/* Winner Info */}
      {player.isWinner && (
        <div className="mt-2 w-full">
          <div className="bg-green-500 text-white text-xs font-bold py-1 px-2 rounded text-center">
            WIN
            {player.finalAmount && player.finalAmount > 0 && (
              <div className="text-[10px] mt-0.5">
                +{formatStack(player.finalAmount)}
              </div>
            )}
          </div>
          {player.handDescription && (
            <div className="text-[10px] text-center text-muted-foreground mt-1 truncate">
              {player.handDescription}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
