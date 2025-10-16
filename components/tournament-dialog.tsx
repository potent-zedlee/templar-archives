"use client"

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
  newLocation,
  setNewLocation,
  newStartDate,
  setNewStartDate,
  newEndDate,
  setNewEndDate,
  isUserAdmin,
}: TournamentDialogProps) {
  if (!isUserAdmin) return null

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
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              {editingTournamentId ? "Edit" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
