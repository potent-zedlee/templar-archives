"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { organizeVideos } from "@/lib/unsorted-videos"
import { toast } from "sonner"
import type { Tournament } from "@/lib/supabase"

interface MoveToNewEventDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  tournaments: Tournament[]
  selectedVideoIds: Set<string>
  onSuccess?: () => void
}

export function MoveToNewEventDialog({
  isOpen,
  onOpenChange,
  tournaments,
  selectedVideoIds,
  onSuccess,
}: MoveToNewEventDialogProps) {
  const [moveToTournamentId, setMoveToTournamentId] = useState('')
  const [moveToEventName, setMoveToEventName] = useState('')
  const [moveToEventDate, setMoveToEventDate] = useState('')
  const [movingVideos, setMovingVideos] = useState(false)

  const supabase = createClientSupabaseClient()

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setMoveToTournamentId('')
      setMoveToEventName('')
      setMoveToEventDate('')
      setMovingVideos(false)
    }
  }, [isOpen])

  const handleMove = async () => {
    if (!moveToTournamentId || !moveToEventName.trim() || !moveToEventDate) {
      toast.error('Please fill in all required fields')
      return
    }

    if (selectedVideoIds.size === 0) {
      toast.error('No videos selected')
      return
    }

    setMovingVideos(true)
    try {
      // 1. Create new SubEvent
      const { data: subEventData, error: subEventError } = await supabase
        .from('sub_events')
        .insert({
          tournament_id: moveToTournamentId,
          name: moveToEventName.trim(),
          date: moveToEventDate,
        })
        .select()
        .single()

      if (subEventError) throw subEventError

      // 2. Move all selected videos to the new SubEvent
      const videoIds = Array.from(selectedVideoIds)
      const result = await organizeVideos(videoIds, subEventData.id)

      if (result.success) {
        toast.success(`${videoIds.length} video(s) moved to new event "${moveToEventName}"`)
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to move videos')
      }
    } catch (error) {
      console.error('Error creating new event:', error)
      toast.error('Failed to create new event')
    } finally {
      setMovingVideos(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to New Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="move-tournament">Tournament *</Label>
            <Select value={moveToTournamentId} onValueChange={setMoveToTournamentId}>
              <SelectTrigger id="move-tournament">
                <SelectValue placeholder="Select a tournament" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {tournaments.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No tournaments available
                  </div>
                ) : (
                  tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="move-event-name">Event Name *</Label>
            <Input
              id="move-event-name"
              placeholder="e.g., Main Event, High Roller"
              value={moveToEventName}
              onChange={(e) => setMoveToEventName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="move-event-date">Date *</Label>
            <Input
              id="move-event-date"
              type="date"
              value={moveToEventDate}
              onChange={(e) => setMoveToEventDate(e.target.value)}
            />
          </div>

          <div className="text-caption text-muted-foreground bg-muted/30 p-3 rounded-md">
            {selectedVideoIds.size} video{selectedVideoIds.size > 1 ? 's' : ''} will be moved to this new event
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={movingVideos}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={movingVideos || !moveToTournamentId || !moveToEventName.trim() || !moveToEventDate}
            >
              {movingVideos ? 'Creating...' : 'Create & Move'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
