"use client"

import { useState } from "react"
import { BoardCards } from "./board-cards"
import { PokerTableSeat } from "./poker-table-seat"
import { Button } from "./ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible"

interface PokerTablePlayer {
  name: string
  position?: string
  avatar?: string
  stack: number
  cards?: string[]
  isWinner?: boolean
  playerData?: {
    id: string
    name: string
    normalized_name: string
    aliases?: string[]
    bio?: string
    is_pro?: boolean
    photo_url?: string
    country?: string
    total_winnings?: number
    created_at?: string
  }
}

interface PokerTableProps {
  players: PokerTablePlayer[]
  boardCards?: string[]
  potSize?: number
  currentStreet?: "preflop" | "flop" | "turn" | "river"
  showAllCards?: boolean
  defaultOpen?: boolean
  className?: string
}

export function PokerTable({
  players,
  boardCards = [],
  potSize = 0,
  currentStreet = "river",
  showAllCards = true,
  defaultOpen = true,
  className
}: PokerTableProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // 9-max table positions (absolute positioning)
  const seatPositions = [
    { top: "10%", left: "50%", transform: "translateX(-50%)" }, // Seat 1 (top)
    { top: "20%", left: "75%", transform: "translateX(-50%)" }, // Seat 2
    { top: "45%", left: "85%", transform: "translateX(-50%)" }, // Seat 3
    { top: "70%", left: "75%", transform: "translateX(-50%)" }, // Seat 4
    { top: "80%", left: "50%", transform: "translateX(-50%)" }, // Seat 5 (bottom)
    { top: "70%", left: "25%", transform: "translateX(-50%)" }, // Seat 6
    { top: "45%", left: "15%", transform: "translateX(-50%)" }, // Seat 7
    { top: "20%", left: "25%", transform: "translateX(-50%)" }, // Seat 8
    { top: "10%", left: "50%", transform: "translateX(-50%)" }, // Seat 9 (overflow, same as 1)
  ]

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Poker Table</h3>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isOpen ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide Table
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show Table
              </>
            )}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="relative w-full h-[500px] bg-gradient-to-br from-green-800 via-green-700 to-green-900 rounded-3xl border-8 border-amber-900 shadow-2xl">
          {/* Table felt pattern */}
          <div className="absolute inset-0 rounded-3xl opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />

          {/* Center area - Board cards and pot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
            {/* Pot size */}
            <div className="bg-yellow-500/20 backdrop-blur-sm rounded-full px-6 py-3 border-2 border-yellow-500/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">
                  💰 {potSize.toFixed(1)} BB
                </div>
              </div>
            </div>

            {/* Board cards */}
            {boardCards.length > 0 && (
              <BoardCards
                cards={boardCards}
                currentStreet={currentStreet}
                size="md"
              />
            )}
          </div>

          {/* Players */}
          {players.map((player, index) => {
            const position = seatPositions[index % seatPositions.length]

            return (
              <div
                key={index}
                className="absolute"
                style={{
                  top: position.top,
                  left: position.left,
                  transform: position.transform
                }}
              >
                <PokerTableSeat
                  player={player}
                  playerData={player.playerData}
                  showCards={showAllCards}
                  isActive={false}
                />
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
