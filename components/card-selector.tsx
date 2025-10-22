"use client"

/**
 * Card Selector Component
 *
 * 포커 카드 선택 UI (52장 덱)
 * - 홀 카드 선택 (최대 2장)
 * - 핸드 밸류 선택 (최대 5장)
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card as UICard } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CardSuit, CardRank, CardString } from "@/lib/types/archive"

interface CardSelectorProps {
  value?: CardString[]
  onChange: (cards: CardString[]) => void
  maxCards?: number
  label?: string
  className?: string
}

const CARD_RANKS: CardRank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
const CARD_SUITS: CardSuit[] = ['♠', '♥', '♦', '♣']

const SUIT_COLORS: Record<CardSuit, string> = {
  '♠': 'text-foreground',
  '♥': 'text-red-600 dark:text-red-400',
  '♦': 'text-red-600 dark:text-red-400',
  '♣': 'text-foreground',
}

export function CardSelector({
  value = [],
  onChange,
  maxCards = 5,
  label,
  className
}: CardSelectorProps) {
  const [selectedCards, setSelectedCards] = useState<CardString[]>(value)

  useEffect(() => {
    setSelectedCards(value)
  }, [value])

  const handleCardClick = (card: CardString) => {
    let newCards: CardString[]

    if (selectedCards.includes(card)) {
      // 카드 선택 해제
      newCards = selectedCards.filter(c => c !== card)
    } else {
      // 최대 개수 체크
      if (selectedCards.length >= maxCards) {
        // 최대 개수 도달 시 첫 번째 카드를 제거하고 새 카드 추가
        newCards = [...selectedCards.slice(1), card]
      } else {
        // 카드 추가
        newCards = [...selectedCards, card]
      }
    }

    setSelectedCards(newCards)
    onChange(newCards)
  }

  const handleClearCard = (card: CardString) => {
    const newCards = selectedCards.filter(c => c !== card)
    setSelectedCards(newCards)
    onChange(newCards)
  }

  const handleClearAll = () => {
    setSelectedCards([])
    onChange([])
  }

  return (
    <div className={cn("space-y-4", className)}>
      {label && <Label>{label}</Label>}

      {/* 선택된 카드 표시 */}
      {selectedCards.length > 0 && (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <span className="text-sm text-muted-foreground">Selected:</span>
          <div className="flex gap-2 flex-1">
            {selectedCards.map((card) => {
              const suit = card.slice(-1) as CardSuit
              const rank = card.slice(0, -1)
              return (
                <div
                  key={card}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-background border"
                >
                  <span className={cn("font-bold text-sm", SUIT_COLORS[suit])}>
                    {rank}{suit}
                  </span>
                  <button
                    onClick={() => handleClearCard(card)}
                    className="hover:bg-muted rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* 카드 덱 */}
      <UICard className="p-4">
        <div className="space-y-3">
          {CARD_SUITS.map((suit) => (
            <div key={suit} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn("text-xl font-bold", SUIT_COLORS[suit])}>
                  {suit}
                </span>
                <div className="flex-1 border-t border-border/50" />
              </div>
              <div className="grid grid-cols-13 gap-1">
                {CARD_RANKS.map((rank) => {
                  const cardString: CardString = `${rank}${suit}`
                  const isSelected = selectedCards.includes(cardString)

                  return (
                    <button
                      key={cardString}
                      onClick={() => handleCardClick(cardString)}
                      className={cn(
                        "flex items-center justify-center h-10 rounded border-2 font-bold text-sm transition-all",
                        "hover:scale-110 hover:shadow-md",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-md"
                          : "bg-background border-border hover:border-primary/50",
                        SUIT_COLORS[suit]
                      )}
                      disabled={selectedCards.length >= maxCards && !isSelected}
                    >
                      {rank}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </UICard>

      {/* 안내 텍스트 */}
      <p className="text-xs text-muted-foreground">
        {selectedCards.length}/{maxCards} cards selected
        {maxCards === 2 && " (Hole Cards)"}
        {maxCards === 5 && " (Board Cards)"}
      </p>
    </div>
  )
}
