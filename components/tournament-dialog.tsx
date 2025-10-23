"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import type { Tournament } from "@/lib/supabase"

interface TournamentDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editingTournamentId: string
  onSave: () => void
  onCancel: () => void
  newTournamentName: string
  setNewTournamentName: (name: string) => void
  newCategory: Tournament["category"]
  setNewCategory: (category: Tournament["category"]) => void
  newGameType: 'tournament' | 'cash-game'
  setNewGameType: (gameType: 'tournament' | 'cash-game') => void
  newLocation: string
  setNewLocation: (location: string) => void
  newStartDate: string
  setNewStartDate: (date: string) => void
  newEndDate: string
  setNewEndDate: (date: string) => void
  isUserAdmin: boolean
}

export function TournamentDialog({
  isOpen,
  onOpenChange,
  editingTournamentId,
  onSave,
  onCancel,
  newTournamentName,
  setNewTournamentName,
  newCategory,
  setNewCategory,
  newGameType,
  setNewGameType,
  newLocation,
  setNewLocation,
  newStartDate,
  setNewStartDate,
  newEndDate,
  setNewEndDate,
  isUserAdmin,
}: TournamentDialogProps) {
  const [saving, setSaving] = useState(false)
  const supabase = createClientSupabaseClient()

  if (!isUserAdmin) return null

  const handleSave = async () => {
    // Validation
    if (!newTournamentName.trim() || !newLocation.trim() || !newStartDate || !newEndDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)

    // Map category display name to category_id
    const getCategoryId = (category: string): string => {
      const mapping: Record<string, string> = {
        'WSOP': 'wsop',
        'Triton': 'triton',
        'EPT': 'ept',
        'APT': 'apt',
        'APL': 'apl',
        'Hustler Casino Live': 'hustler',
        'WSOP Classic': 'wsop',
        'GGPOKER': 'ggpoker',
      }
      return mapping[category] || category.toLowerCase().replace(/\s+/g, '-')
    }

    // Log the data being submitted
    const tournamentData = {
      name: newTournamentName.trim(),
      category_id: getCategoryId(newCategory),
      game_type: newGameType,
      location: newLocation.trim(),
      start_date: newStartDate,
      end_date: newEndDate,
    }
    console.log('Submitting tournament data:', tournamentData)

    try {
      if (editingTournamentId) {
        // Update existing tournament
        const { data, error } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', editingTournamentId)
          .select()

        if (error) {
          console.error('Supabase update error:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          throw error
        }
        console.log('Tournament updated successfully:', data)
        toast.success('Tournament updated successfully')
      } else {
        // Create new tournament
        const { data, error } = await supabase
          .from('tournaments')
          .insert(tournamentData)
          .select()

        if (error) {
          console.error('Supabase insert error:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          console.error('Error code:', error.code)
          console.error('Error message:', error.message)
          console.error('Error hint:', error.hint)
          console.error('Error details:', error.details)
          throw error
        }
        console.log('Tournament created successfully:', data)
        toast.success('Tournament created successfully')
      }

      // Call success callback
      onSave()
    } catch (error: any) {
      console.error('Error saving tournament:', error)
      const errorMessage = error?.message || error?.hint || 'Unknown error'
      toast.error(`Failed to save tournament: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTournamentId ? "Edit Tournament" : "Add Tournament"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={newCategory} onValueChange={(value) => setNewCategory(value as Tournament["category"])}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WSOP">WSOP</SelectItem>
                <SelectItem value="Triton">Triton</SelectItem>
                <SelectItem value="EPT">EPT</SelectItem>
                <SelectItem value="APT">APT</SelectItem>
                <SelectItem value="APL">APL</SelectItem>
                <SelectItem value="Hustler Casino Live">Hustler Casino Live</SelectItem>
                <SelectItem value="WSOP Classic">WSOP Classic</SelectItem>
                <SelectItem value="GGPOKER">GGPOKER</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-type">Game Type</Label>
            <Select value={newGameType} onValueChange={(value) => setNewGameType(value as 'tournament' | 'cash-game')}>
              <SelectTrigger>
                <SelectValue placeholder="Select game type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tournament">Tournament</SelectItem>
                <SelectItem value="cash-game">Cash Game</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tournament-name">Tournament Name</Label>
            <Input
              id="tournament-name"
              placeholder="e.g., 2025 WSOP Main Event"
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Las Vegas, Seoul, Online"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingTournamentId ? "Edit" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
