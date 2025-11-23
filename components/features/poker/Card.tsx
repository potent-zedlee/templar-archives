import { cn } from '@/lib/utils'

interface CardProps {
  card: string // Format: "As", "Kh", "Qd", "Jc", "Ts", "9h", etc.
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SUIT_SYMBOLS: Record<string, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
}

const RANK_DISPLAY: Record<string, string> = {
  A: 'A',
  K: 'K',
  Q: 'Q',
  J: 'J',
  T: '10',
  '9': '9',
  '8': '8',
  '7': '7',
  '6': '6',
  '5': '5',
  '4': '4',
  '3': '3',
  '2': '2',
}

const RED_SUITS = ['h', 'd']

export function Card({ card, className, size = 'md' }: CardProps) {
  if (!card || card.length < 2) {
    return (
      <div
        className={cn(
          'bg-gray-700 border border-gray-600 rounded flex items-center justify-center',
          size === 'sm' && 'w-8 h-12 text-xs',
          size === 'md' && 'w-12 h-16 text-sm',
          size === 'lg' && 'w-16 h-24 text-base',
          className
        )}
      >
        <span className="text-gray-500">?</span>
      </div>
    )
  }

  const rank = card[0].toUpperCase()
  const suit = card[1].toLowerCase()
  const suitSymbol = SUIT_SYMBOLS[suit] || '?'
  const rankDisplay = RANK_DISPLAY[rank] || rank
  const isRed = RED_SUITS.includes(suit)

  return (
    <div
      className={cn(
        'bg-white border-2 rounded flex flex-col items-center justify-center font-bold shadow-md',
        isRed ? 'text-red-600 border-red-200' : 'text-gray-900 border-gray-200',
        size === 'sm' && 'w-8 h-12 text-xs',
        size === 'md' && 'w-12 h-16 text-sm',
        size === 'lg' && 'w-16 h-24 text-base',
        className
      )}
    >
      <span className="leading-none">{rankDisplay}</span>
      <span className={cn('text-lg leading-none', size === 'sm' && 'text-sm')}>
        {suitSymbol}
      </span>
    </div>
  )
}

// Hole cards component (2 cards side by side)
export function HoleCards({
  cards,
  className,
  size = 'sm',
}: {
  cards: string[]
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  if (!cards || cards.length === 0) return null

  return (
    <div className={cn('flex gap-0.5', className)}>
      {cards.map((card, idx) => (
        <Card key={idx} card={card} size={size} />
      ))}
    </div>
  )
}
