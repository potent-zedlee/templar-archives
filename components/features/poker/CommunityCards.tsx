import { Card } from './Card'
import { cn } from '@/lib/utils'

interface CommunityCardsProps {
  flop?: string[] | null // ["As", "Kh", "Qd"]
  turn?: string | null // "7c"
  river?: string | null // "3s"
  potSize?: number | null
  className?: string
}

export function CommunityCards({
  flop,
  turn,
  river,
  potSize,
  className,
}: CommunityCardsProps) {
  const allCards = [
    ...(flop || []),
    turn,
    river,
  ].filter((card): card is string => Boolean(card))

  if (allCards.length === 0 && !potSize) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-green-800 to-green-900 rounded-lg border-2 border-yellow-600 shadow-2xl',
        className
      )}
    >
      {/* Pot Size */}
      {potSize !== null && potSize !== undefined && (
        <div className="text-center">
          <div className="text-yellow-300 text-sm font-medium mb-1">POT</div>
          <div className="text-white text-2xl font-bold">
            {potSize >= 1000000
              ? `${(potSize / 1000000).toFixed(1)}M`
              : potSize >= 1000
              ? `${(potSize / 1000).toFixed(1)}K`
              : potSize.toLocaleString()}
          </div>
        </div>
      )}

      {/* Community Cards */}
      {allCards.length > 0 && (
        <div className="flex gap-2">
          {allCards.map((card, idx) => (
            <Card key={idx} card={card} size="lg" />
          ))}
        </div>
      )}

      {/* Street Indicators */}
      {allCards.length > 0 && (
        <div className="flex gap-4 text-xs text-yellow-300/80">
          {flop && flop.length === 3 && <span>Flop</span>}
          {turn && <span>Turn</span>}
          {river && <span>River</span>}
        </div>
      )}
    </div>
  )
}
