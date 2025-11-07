'use client'

interface PlayingCardProps {
  card: string // Format: "As" = Ace of spades, "Kh" = King of hearts
  size?: 'sm' | 'md' | 'lg'
}

const suitSymbols: Record<string, string> = {
  s: '♠', // spades
  h: '♥', // hearts
  d: '♦', // diamonds
  c: '♣', // clubs
}

const suitColors: Record<string, string> = {
  s: 'text-gray-900 dark:text-gray-100',
  h: 'text-red-600 dark:text-red-500',
  d: 'text-red-600 dark:text-red-500',
  c: 'text-gray-900 dark:text-gray-100',
}

const cardSizes = {
  sm: 'w-8 h-11 text-xs',
  md: 'w-12 h-16 text-sm',
  lg: 'w-16 h-22 text-base',
}

export function PlayingCard({ card, size = 'md' }: PlayingCardProps) {
  if (!card || card.length < 2) {
    // Back of card
    return (
      <div
        className={`${cardSizes[size]} bg-blue-600 border-2 border-blue-700 rounded flex items-center justify-center`}
      >
        <div className="text-white text-opacity-50">🂠</div>
      </div>
    )
  }

  const rank = card.slice(0, -1) // All except last character
  const suit = card.slice(-1).toLowerCase() // Last character

  const suitSymbol = suitSymbols[suit] || '?'
  const suitColor = suitColors[suit] || 'text-gray-900'

  return (
    <div
      className={`${cardSizes[size]} bg-white dark:bg-gray-100 border-2 border-gray-300 rounded shadow-sm flex flex-col items-center justify-center font-bold ${suitColor}`}
    >
      <div className="leading-none">{rank}</div>
      <div className="text-lg leading-none">{suitSymbol}</div>
    </div>
  )
}
