"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { organizeVideos } from "@/lib/unsorted-videos"
import { toast } from "sonner"
import type { Tournament } from "@/lib/supabase"

interface MoveToExistingEventDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  tournaments: Tournament[]
  selectedVideoIds: Set<string>
  onSuccess?: () => void
}

export function MoveToExistingEventDialog({
  isOpen,
  onOpenChange,
  tournaments,
  selectedVideoIds,
  onSuccess,
}: MoveToExistingEventDialogProps) {
  const [moveToExistingTournamentId, setMoveToExistingTournamentId] = useState('')
  const [moveToSubEventId, setMoveToSubEventId] = useState('')
  const [movingVideos, setMovingVideos] = useState(false)

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setMoveToExistingTournamentId('')
      setMoveToSubEventId('')
      setMovingVideos(false)
    }
  }, [isOpen])

  const handleMove = async () => {
    if (!moveToSubEventId) {
      toast.error('Please select an event')
      return
    }

    if (selectedVideoIds.size === 0) {
      toast.error('No videos selected')
      return
    }

    setMovingVideos(true)
    try {
      const videoIds = Array.from(selectedVideoIds)
      const result = await organizeVideos(videoIds, moveToSubEventId)

      if (result.success) {
        toast.success(`${videoIds.length} video(s) moved successfully`)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to move videos')
      }
    } catch (error) {
      console.error('Error moving videos:', error)
      toast.error('Failed to move videos')
    } finally {
      setMovingVideos(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="move-existing-tournament">Tournament *</Label>
            <Select value={moveToExistingTournamentId} onValueChange={setMoveToExistingTournamentId}>
              <SelectTrigger id="move-existing-tournament">
                <SelectValue placeholder="Select a tournament" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="move-existing-subevent">Event *</Label>
            <Select
              value={moveToSubEventId}
              onValueChange={setMoveToSubEventId}
              disabled={!moveToExistingTournamentId}
            >
              <SelectTrigger id="move-existing-subevent">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {moveToExistingTournamentId &&
                  tournaments
                    .find(t => t.id === moveToExistingTournamentId)
                    ?.sub_events?.map((subEvent) => (
                      <SelectItem key={subEvent.id} value={subEvent.id}>
                        {subEvent.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-caption text-muted-foreground bg-muted/30 p-3 rounded-md">
            {selectedVideoIds.size} video{selectedVideoIds.size > 1 ? 's' : ''} will be moved to this event
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={movingVideos}
            >
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={movingVideos || !moveToSubEventId}>
              {movingVideos ? 'Moving...' : 'Move'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
