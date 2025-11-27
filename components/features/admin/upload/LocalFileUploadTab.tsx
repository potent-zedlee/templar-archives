"use client"

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { Tournament } from '@/lib/types/archive'

interface LocalFileUploadTabProps {
  localFile: File | null
  setLocalFile: (file: File | null) => void
  localName: string
  setLocalName: (name: string) => void
  loading: boolean
  addToUnsorted: boolean
  setAddToUnsorted: (value: boolean) => void
  tournaments: Tournament[]
  selectedTournamentId: string | null
  setSelectedTournamentId: (id: string | null) => void
  selectedSubEventId: string | null
  setSelectedSubEventId: (id: string | null) => void
  selectedDayId: string | null
  setSelectedDayId: (id: string | null) => void
  createNewDay: boolean
  setCreateNewDay: (value: boolean) => void
  newDayName: string
  setNewDayName: (name: string) => void
  onUpload: () => void
}

export function LocalFileUploadTab({
  localFile,
  setLocalFile,
  localName,
  setLocalName,
  loading,
  addToUnsorted,
  setAddToUnsorted,
  tournaments,
  selectedTournamentId,
  setSelectedTournamentId,
  selectedSubEventId,
  setSelectedSubEventId,
  selectedDayId,
  setSelectedDayId,
  createNewDay,
  setCreateNewDay,
  newDayName,
  setNewDayName,
  onUpload,
}: LocalFileUploadTabProps) {
  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId)
  const subEvents = selectedTournament?.events || []
  const selectedSubEvent = selectedTournament?.events?.find(se => se.id === selectedSubEventId)
  const days = selectedSubEvent?.streams || []

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLocalFile(file)
      if (!localName) {
        // Auto-fill name from filename
        setLocalName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="local-name">Video Name</Label>
        <Input
          id="local-name"
          placeholder="e.g., WSOP 2024 Main Event Day 1"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="local-file">Select File</Label>
        <Input
          id="local-file"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
        />
        {localFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {localFile.name} ({(localFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Add to Unsorted Checkbox */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Checkbox
          id="add-to-unsorted-local"
          checked={addToUnsorted}
          onCheckedChange={(checked) => setAddToUnsorted(checked as boolean)}
        />
        <Label htmlFor="add-to-unsorted-local" className="cursor-pointer">
          Add to Unsorted (organize later)
        </Label>
      </div>

      {/* Tournament/SubEvent/Day Selection */}
      {!addToUnsorted && (
        <div className="space-y-3 pl-6 border-l-2">
          <div className="space-y-2">
            <Label htmlFor="tournament-select-local">Tournament</Label>
            <Select
              value={selectedTournamentId || 'none'}
              onValueChange={(value) => {
                setSelectedTournamentId(value === 'none' ? null : value)
                setSelectedSubEventId(null)
                setSelectedDayId(null)
              }}
            >
              <SelectTrigger id="tournament-select-local">
                <SelectValue placeholder="Select tournament" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select tournament</SelectItem>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subevent-select-local">Sub-Event</Label>
            <Select
              value={selectedSubEventId || 'none'}
              onValueChange={(value) => {
                setSelectedSubEventId(value === 'none' ? null : value)
                setSelectedDayId(null)
              }}
              disabled={!selectedTournamentId}
            >
              <SelectTrigger id="subevent-select-local">
                <SelectValue placeholder="Select sub-event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select sub-event</SelectItem>
                {subEvents.map((se) => (
                  <SelectItem key={se.id} value={se.id}>
                    {se.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="day-select-local">Day</Label>
            <Select
              value={selectedDayId || 'none'}
              onValueChange={(value) => {
                setSelectedDayId(value === 'none' ? null : value)
                setCreateNewDay(false)
              }}
              disabled={!selectedSubEventId || createNewDay}
            >
              <SelectTrigger id="day-select-local">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select day</SelectItem>
                {days.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="create-new-day-local"
              checked={createNewDay}
              onCheckedChange={(checked) => {
                setCreateNewDay(checked as boolean)
                if (checked) setSelectedDayId(null)
              }}
              disabled={!selectedSubEventId}
            />
            <Label htmlFor="create-new-day-local" className="cursor-pointer text-sm">
              Create new day
            </Label>
          </div>

          {createNewDay && (
            <div className="space-y-2">
              <Label htmlFor="new-day-name-local">New Day Name</Label>
              <Input
                id="new-day-name-local"
                placeholder="e.g., Day 1"
                value={newDayName}
                onChange={(e) => setNewDayName(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <Button
        className="w-full"
        onClick={onUpload}
        disabled={loading || !localFile || !localName}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : addToUnsorted ? (
          'Add to Unsorted'
        ) : (
          'Add to Tournament'
        )}
      </Button>
    </div>
  )
}
