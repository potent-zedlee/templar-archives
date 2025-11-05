"use client"

import { cn } from "@/lib/utils"

interface PlayingCardProps {
  rank: string // "A", "K", "Q", "J", "10", "9", ..., "2"
  suit: string // "♠", "♥", "♣", "♦"
  faceUp?: boolean
  className?: string
  size?: "sm" | "md" | "lg"
}

export function PlayingCard({
  rank,
  suit,
  faceUp = true,
  className,
  size = "md"
}: PlayingCardProps) {
  const isRed = suit === "♥" || suit === "♦"

  const sizeClasses = {
    sm: "w-8 h-11 text-xs",
    md: "w-12 h-16 text-sm",
    lg: "w-16 h-22 text-base"
  }

  if (!faceUp) {
    return (
      <div
        className={cn(
          "rounded border-2 border-white/20 flex items-center justify-center",
          "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800",
          "shadow-lg",
          sizeClasses[size],
          className
        )}
      >
        <div className="text-white/40 font-bold text-xs">
          🃏
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded border-2 border-gray-300 bg-white flex flex-col items-center justify-between p-1",
        "shadow-lg",
        sizeClasses[size],
        className
      )}
    >
      {/* Top rank and suit */}
      <div className="flex flex-col items-center leading-none">
        <span className={cn(
          "font-bold",
          isRed ? "text-red-600" : "text-black"
        )}>
          {rank}
        </span>
        <span className={cn(
          "text-lg leading-none",
          isRed ? "text-red-600" : "text-black"
        )}>
          {suit}
        </span>
      </div>

      {/* Center suit (large) */}
      <div className={cn(
        "text-2xl",
        isRed ? "text-red-600" : "text-black"
      )}>
        {suit}
      </div>

      {/* Bottom rank and suit (rotated) */}
      <div className="flex flex-col items-center leading-none rotate-180">
        <span className={cn(
          "font-bold",
          isRed ? "text-red-600" : "text-black"
        )}>
          {rank}
        </span>
        <span className={cn(
          "text-lg leading-none",
          isRed ? "text-red-600" : "text-black"
        )}>
          {suit}
        </span>
      </div>
    </div>
  )
}

// Helper function to parse card string (e.g., "As" -> {rank: "A", suit: "♠"})
export function parseCard(cardString: string): { rank: string; suit: string } | null {
  if (!cardString || cardString.length < 2) return null

  const rank = cardString.slice(0, -1)
  const suitChar = cardString.slice(-1).toLowerCase()

  const suitMap: Record<string, string> = {
    's': '♠',
    'h': '♥',
    'c': '♣',
    'd': '♦'
  }

  const suit = suitMap[suitChar]
  if (!suit) return null

  return { rank: rank.toUpperCase(), suit }
}
