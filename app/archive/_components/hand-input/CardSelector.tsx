'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ===========================
// Types
// ===========================

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const
const SUITS = ['s', 'h', 'd', 'c'] as const // spades, hearts, diamonds, clubs

type Rank = (typeof RANKS)[number]
type Suit = (typeof SUITS)[number]

interface CardSelectorProps {
  value: string[] // e.g., ["As", "Kh"]
  onChange: (cards: string[]) => void
  maxCards?: number
  label?: string
  placeholder?: string
}

// ===========================
// Card Selector Component
// ===========================

export function CardSelector({
  value,
  onChange,
  maxCards = 2,
  label,
  placeholder = 'e.g., As Kh',
}: CardSelectorProps) {
  const [textInput, setTextInput] = useState(value.join(' '))

  // Handle text input
  const handleTextChange = (text: string) => {
    setTextInput(text)

    // Parse text input
    const cards = parseCardString(text)
    if (cards.length <= maxCards) {
      onChange(cards)
    }
  }

  // Handle grid selection
  const handleCardClick = (card: string) => {
    if (value.includes(card)) {
      // Remove card
      const newCards = value.filter((c) => c !== card)
      onChange(newCards)
      setTextInput(newCards.join(' '))
    } else {
      // Add card (if not at max)
      if (value.length < maxCards) {
        const newCards = [...value, card]
        onChange(newCards)
        setTextInput(newCards.join(' '))
      }
    }
  }

  // Clear all
  const handleClear = () => {
    onChange([])
    setTextInput('')
  }

  return (
    <div className="space-y-3">
      {label && <label className="text-sm font-medium">{label}</label>}

      {/* Text Input */}
      <div className="flex gap-2">
        <Input
          value={textInput}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        {value.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Visual Grid */}
      <div className="grid grid-cols-13 gap-1 p-3 bg-muted/50 rounded-lg">
        {RANKS.map((rank) => (
          <div key={rank} className="space-y-1">
            {SUITS.map((suit) => {
              const card = `${rank}${suit}`
              const isSelected = value.includes(card)
              const isDisabled = !isSelected && value.length >= maxCards

              return (
                <button
                  key={card}
                  type="button"
                  onClick={() => handleCardClick(card)}
                  disabled={isDisabled}
                  className={cn(
                    'w-8 h-10 text-xs font-bold rounded border-2 transition-all',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border',
                    isDisabled && 'opacity-30 cursor-not-allowed',
                    getSuitColor(suit)
                  )}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span>{rank === 'T' ? '10' : rank}</span>
                    <span className="text-xs">{getSuitSymbol(suit)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Selected cards display */}
      {value.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Selected: <span className="font-medium">{value.join(' ')}</span>
        </div>
      )}
    </div>
  )
}

// ===========================
// Helper Functions
// ===========================

function parseCardString(input: string): string[] {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9SHDC]/g, '')
  const cards: string[] = []

  let i = 0
  while (i < cleaned.length) {
    // Parse rank
    let rank = cleaned[i]
    if (rank === '1' && cleaned[i + 1] === '0') {
      rank = 'T'
      i++
    }
    i++

    // Parse suit
    const suit = cleaned[i]?.toLowerCase()
    if (suit && ['s', 'h', 'd', 'c'].includes(suit)) {
      cards.push(`${rank}${suit}`)
      i++
    }
  }

  return cards
}

function getSuitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    s: '♠',
    h: '♥',
    d: '♦',
    c: '♣',
  }
  return symbols[suit]
}

function getSuitColor(suit: Suit): string {
  return suit === 'h' || suit === 'd' ? 'text-red-600' : 'text-foreground'
}
