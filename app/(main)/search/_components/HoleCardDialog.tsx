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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface HoleCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (selection: { card1: string; card2: string; suited: boolean }) => void
}

const RANKS = ['?', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']

export function HoleCardDialog({ open, onOpenChange, onSelect }: HoleCardDialogProps) {
  const [card1, setCard1] = useState<string>('?')
  const [card2, setCard2] = useState<string>('?')
  const [suited, setSuited] = useState<boolean>(false)

  const handleReset = () => {
    setCard1('?')
    setCard2('?')
    setSuited(false)
  }

  const handleOk = () => {
    onSelect({ card1, card2, suited })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4">
        <DialogHeader>
          <DialogTitle>Select Cards</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Card 1 Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-300">Card 1</Label>
            <div className="grid grid-cols-7 gap-2">
              {RANKS.map((rank) => (
                <Button
                  key={`card1-${rank}`}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 w-full text-sm font-semibold",
                    card1 === rank
                      ? "border-green-500 bg-green-600 hover:bg-green-600 text-white"
                      : "border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300"
                  )}
                  onClick={() => setCard1(rank)}
                >
                  {rank}
                </Button>
              ))}
            </div>
          </div>

          {/* Card 2 Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-gray-300">Card 2</Label>
            <div className="grid grid-cols-7 gap-2">
              {RANKS.map((rank) => (
                <Button
                  key={`card2-${rank}`}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 w-full text-sm font-semibold",
                    card2 === rank
                      ? "border-green-500 bg-green-600 hover:bg-green-600 text-white"
                      : "border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300"
                  )}
                  onClick={() => setCard2(rank)}
                >
                  {rank}
                </Button>
              ))}
            </div>
          </div>

          {/* Suited Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="suited"
              checked={suited}
              onCheckedChange={(checked) => setSuited(checked === true)}
            />
            <label
              htmlFor="suited"
              className="text-sm font-medium text-gray-300 cursor-pointer"
            >
              Suited only
            </label>
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
