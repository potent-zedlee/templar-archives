"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface HandValueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (selection: { handType: string | null; matchType: 'exact' | 'at-least' | 'at-most' }) => void
}

interface Card {
  rank: string
  suit: string
  color: 'red' | 'black' | 'gray'
}

interface HandType {
  name: string
  cards: Card[]
}

const handTypes: HandType[] = [
  {
    name: 'Royal Flush',
    cards: [
      { rank: '10', suit: '♥', color: 'red' },
      { rank: 'J', suit: '♥', color: 'red' },
      { rank: 'Q', suit: '♥', color: 'red' },
      { rank: 'K', suit: '♥', color: 'red' },
      { rank: 'A', suit: '♥', color: 'red' }
    ]
  },
  {
    name: 'Straight Flush',
    cards: [
      { rank: 'A', suit: '♣', color: 'black' },
      { rank: '6', suit: '♣', color: 'black' },
      { rank: '7', suit: '♣', color: 'black' },
      { rank: '8', suit: '♣', color: 'black' },
      { rank: '9', suit: '♣', color: 'black' }
    ]
  },
  {
    name: 'Four of a Kind',
    cards: [
      { rank: 'A', suit: '♠', color: 'black' },
      { rank: 'A', suit: '♥', color: 'red' },
      { rank: 'A', suit: '♦', color: 'red' },
      { rank: 'A', suit: '♣', color: 'black' },
      { rank: '?', suit: '', color: 'gray' }
    ]
  },
  {
    name: 'Full House',
    cards: [
      { rank: 'A', suit: '♠', color: 'black' },
      { rank: 'A', suit: '♦', color: 'red' },
      { rank: 'A', suit: '♥', color: 'red' },
      { rank: 'K', suit: '♥', color: 'red' },
      { rank: 'K', suit: '♠', color: 'black' }
    ]
  },
  {
    name: 'Flush',
    cards: [
      { rank: '6', suit: '♦', color: 'red' },
      { rank: '8', suit: '♦', color: 'red' },
      { rank: '9', suit: '♦', color: 'red' },
      { rank: 'K', suit: '♦', color: 'red' },
      { rank: 'A', suit: '♦', color: 'red' }
    ]
  },
  {
    name: 'Straight',
    cards: [
      { rank: '2', suit: '♥', color: 'red' },
      { rank: '3', suit: '♦', color: 'red' },
      { rank: '4', suit: '♣', color: 'black' },
      { rank: '5', suit: '♥', color: 'red' },
      { rank: '6', suit: '♥', color: 'red' }
    ]
  },
  {
    name: 'Three of a Kind',
    cards: [
      { rank: 'A', suit: '♠', color: 'black' },
      { rank: 'A', suit: '♥', color: 'red' },
      { rank: 'A', suit: '♦', color: 'red' },
      { rank: '?', suit: '', color: 'gray' },
      { rank: '?', suit: '', color: 'gray' }
    ]
  },
  {
    name: 'Two Pair',
    cards: [
      { rank: 'A', suit: '♠', color: 'black' },
      { rank: 'A', suit: '♥', color: 'red' },
      { rank: 'K', suit: '♠', color: 'black' },
      { rank: 'K', suit: '♥', color: 'red' },
      { rank: '?', suit: '', color: 'gray' }
    ]
  },
  {
    name: 'Pair',
    cards: [
      { rank: 'A', suit: '♠', color: 'black' },
      { rank: 'A', suit: '♥', color: 'red' },
      { rank: '?', suit: '', color: 'gray' },
      { rank: '?', suit: '', color: 'gray' },
      { rank: '?', suit: '', color: 'gray' }
    ]
  },
  {
    name: 'High card',
    cards: [
      { rank: 'K', suit: '♠', color: 'black' },
      { rank: '?', suit: '', color: 'gray' },
      { rank: '?', suit: '', color: 'gray' },
      { rank: '?', suit: '', color: 'gray' },
      { rank: '?', suit: '', color: 'gray' }
    ]
  }
]

const matchTypes: Array<'exact' | 'at-least' | 'at-most'> = ['exact', 'at-least', 'at-most']

export function HandValueDialog({ open, onOpenChange, onSelect }: HandValueDialogProps) {
  const [selectedHandType, setSelectedHandType] = useState<string | null>(null)
  const [matchType, setMatchType] = useState<'exact' | 'at-least' | 'at-most'>('exact')

  const handleReset = () => {
    setSelectedHandType(null)
    setMatchType('exact')
  }

  const handleOk = () => {
    onSelect({ handType: selectedHandType, matchType })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-4 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Cards</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {/* Hand Types List */}
          {handTypes.map((handType) => (
            <Button
              key={handType.name}
              variant="outline"
              className={cn(
                "w-full h-auto py-3 px-4 justify-between",
                selectedHandType === handType.name
                  ? "border-green-500 bg-green-600/10 hover:bg-green-600/20"
                  : "border-border bg-muted hover:bg-accent"
              )}
              onClick={() => setSelectedHandType(handType.name)}
            >
              <span className="text-sm font-semibold text-foreground">
                {handType.name}
              </span>
              <div className="flex gap-1">
                {handType.cards.map((card, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-14 bg-white rounded flex flex-col items-center justify-center border border-border"
                  >
                    <div
                      className={cn(
                        "text-lg font-bold",
                        card.color === 'red' && "text-red-600",
                        card.color === 'black' && "text-black",
                        card.color === 'gray' && "text-muted-foreground"
                      )}
                    >
                      {card.rank}
                    </div>
                    {card.suit && (
                      <div
                        className={cn(
                          "text-sm",
                          card.color === 'red' && "text-red-600",
                          card.color === 'black' && "text-black"
                        )}
                      >
                        {card.suit}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Button>
          ))}
        </div>

        {/* Match Type Selection */}
        <div className="space-y-2 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground mb-2">Match Type</div>
          <div className="grid grid-cols-3 gap-2">
            {matchTypes.map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs",
                  matchType === type
                    ? "border-green-500 bg-green-600 hover:bg-green-600 text-white"
                    : "border-border bg-muted hover:bg-accent text-foreground"
                )}
                onClick={() => setMatchType(type)}
              >
                {type === 'exact' && 'Exact Match'}
                {type === 'at-least' && 'At Least'}
                {type === 'at-most' && 'At Most'}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleOk}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
