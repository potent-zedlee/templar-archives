"use client"

import { PlayingCard, parseCard } from "./PlayingCard"
import { cn } from "@/lib/utils"

interface BoardCardsProps {
  cards: string[] // e.g., ["As", "Kh", "Qd", "Jc", "10s"]
  currentStreet?: "preflop" | "flop" | "turn" | "river"
  className?: string
  size?: "sm" | "md" | "lg"
}

export function BoardCards({
  cards,
  currentStreet = "river",
  className,
  size = "md"
}: BoardCardsProps) {
  // Determine which cards to show based on current street
  const visibleCards = getVisibleCards(cards, currentStreet)

  return (
    <div className={cn("flex gap-2 items-center", className)}>
      {visibleCards.map((cardString, index) => {
        const card = parseCard(cardString)

        if (!card) {
          return (
            <div
              key={index}
              className="w-12 h-16 rounded border-2 border-dashed border-white/20 bg-white/5"
            />
          )
        }

        // Add spacing after flop (3rd card) and turn (4th card)
        const addSpacing = index === 2 || index === 3

        return (
          <div key={index} className={cn(addSpacing && "mr-2")}>
            <PlayingCard
              rank={card.rank}
              suit={card.suit}
              size={size}
              className="shadow-xl"
            />
          </div>
        )
      })}

      {/* Show placeholders for remaining cards */}
      {Array.from({ length: 5 - visibleCards.length }).map((_, index) => (
        <div
          key={`placeholder-${index}`}
          className={cn(
            "w-12 h-16 rounded border-2 border-dashed border-white/20 bg-white/5",
            // Add spacing for visual grouping
            (visibleCards.length + index === 3 || visibleCards.length + index === 4) && "ml-2"
          )}
        />
      ))}
    </div>
  )
}

function getVisibleCards(cards: string[], street: string): string[] {
  if (!cards || cards.length === 0) return []

  switch (street) {
    case "preflop":
      return []
    case "flop":
      return cards.slice(0, 3)
    case "turn":
      return cards.slice(0, 4)
    case "river":
      return cards.slice(0, 5)
    default:
      return cards
  }
}
