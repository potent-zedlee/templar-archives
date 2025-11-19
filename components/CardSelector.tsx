"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface CardSelectorProps {
  selected: string[]
  onSelect: (cards: string[]) => void
  maxCards?: number
  label: string
  description?: string
}

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
const SUITS = [
  { symbol: 's', name: '♠', color: 'text-gray-900 dark:text-white' },
  { symbol: 'h', name: '♥', color: 'text-red-600 dark:text-red-400' },
  { symbol: 'd', name: '♦', color: 'text-red-600 dark:text-red-400' },
  { symbol: 'c', name: '♣', color: 'text-gray-900 dark:text-white' },
]

export function CardSelector({
  selected,
  onSelect,
  maxCards = 1,
  label,
  description
}: CardSelectorProps) {
  const handleCardClick = (card: string) => {
    if (selected.includes(card)) {
      onSelect(selected.filter(c => c !== card))
    } else if (selected.length < maxCards) {
      onSelect([...selected, card])
    }
  }

  const handleClear = () => {
    onSelect([])
  }

  const getSuitColor = (suitSymbol: string) => {
    const suit = SUITS.find(s => s.symbol === suitSymbol)
    return suit?.color || 'text-gray-900 dark:text-white'
  }

  const getSuitName = (suitSymbol: string) => {
    const suit = SUITS.find(s => s.symbol === suitSymbol)
    return suit?.name || suitSymbol
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-auto py-1 px-2 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* 선택된 카드 표시 */}
      {selected.length > 0 && (
        <div className="flex gap-2 flex-wrap p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
          {selected.map(card => {
            const rank = card.slice(0, -1)
            const suit = card.slice(-1)
            return (
              <div
                key={card}
                className="px-2 py-1 bg-white dark:bg-gray-800 border border-green-500 rounded text-sm font-mono font-bold flex items-center gap-1"
              >
                <span>{rank}</span>
                <span className={getSuitColor(suit)}>{getSuitName(suit)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* 카드 그리드 */}
      <div className="grid grid-cols-4 gap-1">
        {SUITS.map(suit => (
          <div key={suit.symbol} className="space-y-1">
            {RANKS.map(rank => {
              const card = `${rank}${suit.symbol}`
              const isSelected = selected.includes(card)
              const isDisabled = !isSelected && selected.length >= maxCards

              return (
                <button
                  key={card}
                  type="button"
                  onClick={() => handleCardClick(card)}
                  disabled={isDisabled}
                  className={cn(
                    "w-full px-1.5 py-1 text-xs font-mono font-bold rounded border transition-all",
                    isSelected
                      ? "bg-green-600 text-white border-green-600 shadow-md scale-105"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20",
                    isDisabled && "opacity-30 cursor-not-allowed hover:border-gray-300 hover:bg-white dark:hover:bg-gray-800"
                  )}
                >
                  <span>{rank}</span>
                  <span className={isSelected ? 'text-white' : getSuitColor(suit.symbol)}>
                    {suit.name}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
