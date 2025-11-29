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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"
import type { PayoutRow } from "@/hooks/useArchiveState"
import { createEvent, updateEvent, saveEventPayouts } from "@/app/actions/archive"

interface SubEventDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedTournamentId: string
  editingSubEventId: string
  onSuccess?: () => void
}

export function SubEventDialog({
  isOpen,
  onOpenChange,
  selectedTournamentId,
  editingSubEventId,
  onSuccess,
}: SubEventDialogProps) {
  // Form state
  const [newSubEventName, setNewSubEventName] = useState("")
  const [newSubEventDate, setNewSubEventDate] = useState("")
  const [newSubEventEventNumber, setNewSubEventEventNumber] = useState("")
  const [newSubEventPrize, setNewSubEventPrize] = useState("")
  const [newSubEventWinner, setNewSubEventWinner] = useState("")
  const [newSubEventBuyIn, setNewSubEventBuyIn] = useState("")
  const [newSubEventEntryCount, setNewSubEventEntryCount] = useState("")
  const [newSubEventBlindStructure, setNewSubEventBlindStructure] = useState("")
  const [newSubEventLevelDuration, setNewSubEventLevelDuration] = useState("")
  const [newSubEventStartingStack, setNewSubEventStartingStack] = useState("")
  const [newSubEventNotes, setNewSubEventNotes] = useState("")

  // Payout state
  const [payouts, setPayouts] = useState<PayoutRow[]>([{ rank: 1, playerName: "", prizeAmount: "" }])
  const [hendonMobHtml, setHendonMobHtml] = useState("")
  const [csvText, setCsvText] = useState("")
  const [loadingPayouts, setLoadingPayouts] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  // Load existing data when editing
  useEffect(() => {
    if (isOpen && editingSubEventId) {
      loadSubEventData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingSubEventId])

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const loadSubEventData = async () => {
    try {
      setLoadingData(true)
      // Fetch event data via API
      const response = await fetch(`/api/events/${editingSubEventId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch event data')
      }
      const { data: subEvent } = await response.json()

      if (subEvent) {
        setNewSubEventName(subEvent.name || "")
        // Handle Firestore Timestamp format
        setNewSubEventDate(subEvent.date?._seconds
          ? new Date(subEvent.date._seconds * 1000).toISOString().split('T')[0]
          : subEvent.date || "")
        setNewSubEventEventNumber(subEvent.eventNumber || "")
        setNewSubEventPrize(subEvent.totalPrize || "")
        setNewSubEventWinner(subEvent.winner || "")
        setNewSubEventBuyIn(subEvent.buyIn || "")
        setNewSubEventEntryCount(subEvent.entryCount?.toString() || "")
        setNewSubEventBlindStructure(subEvent.blindStructure || "")
        setNewSubEventLevelDuration(subEvent.levelDuration?.toString() || "")
        setNewSubEventStartingStack(subEvent.startingStack?.toString() || "")
        setNewSubEventNotes(subEvent.notes || "")
      }

      // Load existing payouts via API
      const payoutsResponse = await fetch(`/api/events/${editingSubEventId}/payouts`)
      if (payoutsResponse.ok) {
        const { data: existingPayouts } = await payoutsResponse.json()

        if (existingPayouts && existingPayouts.length > 0) {
          const loadedPayouts = existingPayouts.map((p: { rank: number; playerName: string; prizeAmount: number }) => ({
            rank: p.rank,
            playerName: p.playerName,
            prizeAmount: formatPrizeAmount(p.prizeAmount),
          }))
          setPayouts(loadedPayouts)
        } else {
          setPayouts([{ rank: 1, playerName: "", prizeAmount: "" }])
        }
      }
    } catch (error) {
      console.error('Error loading sub event:', error)
      toast.error('Failed to load event data')
    } finally {
      setLoadingData(false)
    }
  }

  const resetForm = () => {
    setNewSubEventName("")
    setNewSubEventDate("")
    setNewSubEventEventNumber("")
    setNewSubEventPrize("")
    setNewSubEventWinner("")
    setNewSubEventBuyIn("")
    setNewSubEventEntryCount("")
    setNewSubEventBlindStructure("")
    setNewSubEventLevelDuration("")
    setNewSubEventStartingStack("")
    setNewSubEventNotes("")
    setPayouts([{ rank: 1, playerName: "", prizeAmount: "" }])
    setHendonMobHtml("")
    setCsvText("")
  }

  // Payout helper functions
  const addPayoutRow = () => {
    setPayouts([...payouts, { rank: payouts.length + 1, playerName: "", prizeAmount: "" }])
  }

  const removePayoutRow = (index: number) => {
    if (payouts.length === 1) return
    const newPayouts = payouts.filter((_, i) => i !== index)
    setPayouts(newPayouts.map((p, i) => ({ ...p, rank: i + 1 })))
  }

  const updatePayoutRow = (index: number, field: keyof PayoutRow, value: string | number) => {
    const newPayouts = [...payouts]
    newPayouts[index] = { ...newPayouts[index], [field]: value }
    setPayouts(newPayouts)
  }

  // Format cents to display
  const formatPrizeAmount = (cents: number): string => {
    const dollars = cents / 100
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Load payouts from HTML
  const loadPayoutsFromHtml = async () => {
    if (!hendonMobHtml.trim()) return

    setLoadingPayouts(true)
    try {
      const response = await fetch('/api/parse-hendon-mob-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: hendonMobHtml.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse HTML')
      }

      if (data.payouts && data.payouts.length > 0) {
        const loadedPayouts = data.payouts.map((p: { rank: number; playerName: string; prizeAmount: string }) => ({
          rank: p.rank,
          playerName: p.playerName,
          prizeAmount: p.prizeAmount,
        }))
        setPayouts(loadedPayouts)
        setHendonMobHtml("")
        toast.success(`${loadedPayouts.length} payouts loaded successfully`)
      } else {
        toast.error('Payout information not found')
      }
    } catch (error: unknown) {
      console.error('Error loading payouts from HTML:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load payouts'
      toast.error(errorMessage)
    } finally {
      setLoadingPayouts(false)
    }
  }

  // Load payouts from CSV
  const loadPayoutsFromCsv = async () => {
    if (!csvText.trim()) return

    setLoadingPayouts(true)
    try {
      const response = await fetch('/api/parse-payout-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvText.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse CSV')
      }

      if (data.payouts && data.payouts.length > 0) {
        const loadedPayouts = data.payouts.map((p: { rank: number; playerName: string; prizeAmount: string }) => ({
          rank: p.rank,
          playerName: p.playerName,
          prizeAmount: p.prizeAmount,
        }))
        setPayouts(loadedPayouts)
        setCsvText("")
        toast.success(`${loadedPayouts.length} payouts loaded successfully`)
      } else {
        toast.error('Payout information not found')
      }
    } catch (error: unknown) {
      console.error('Error loading payouts from CSV:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load payouts'
      toast.error(errorMessage)
    } finally {
      setLoadingPayouts(false)
    }
  }

  const handleSubmit = async () => {
    if (!newSubEventName.trim() || !newSubEventDate) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      const subEventData = {
        name: newSubEventName.trim(),
        date: newSubEventDate,
        event_number: newSubEventEventNumber || undefined,
        total_prize: newSubEventPrize || undefined,
        winner: newSubEventWinner || undefined,
        buy_in: newSubEventBuyIn || undefined,
        entry_count: newSubEventEntryCount ? parseInt(newSubEventEntryCount) : undefined,
        blind_structure: newSubEventBlindStructure || undefined,
        level_duration: newSubEventLevelDuration ? parseInt(newSubEventLevelDuration) : undefined,
        starting_stack: newSubEventStartingStack ? parseInt(newSubEventStartingStack) : undefined,
        notes: newSubEventNotes || undefined,
      }

      let result
      let targetSubEventId = editingSubEventId

      if (editingSubEventId) {
        // Update existing event via Server Action
        result = await updateEvent(editingSubEventId, subEventData)
      } else {
        // Create new event via Server Action
        result = await createEvent(selectedTournamentId, subEventData)
        if (result.success && result.data) {
          targetSubEventId = result.data.id
        }
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      // Save payouts via Server Action
      const payoutResult = await saveEventPayouts(targetSubEventId, payouts)

      if (!payoutResult.success) {
        console.warn('[SubEventDialog] Payout save failed:', payoutResult.error)
        // Don't throw - event was saved successfully
      }

      toast.success(editingSubEventId ? 'Event updated successfully' : 'Event added successfully')

      onOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      console.error('[SubEventDialog] Error saving sub event:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save event'
      toast.error(errorMessage)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{editingSubEventId ? "Edit Event" : "Add Event"}</DialogTitle>
        </DialogHeader>
        {loadingData ? (
          <div className="flex items-center justify-center h-[500px]">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="payout">Payout</TabsTrigger>
              <TabsTrigger value="structure">Blind Structure</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subevent-name">Event Name *</Label>
                    <Input
                      id="subevent-name"
                      placeholder="e.g., Main Event, High Roller"
                      value={newSubEventName}
                      onChange={(e) => setNewSubEventName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subevent-date">Date *</Label>
                    <Input
                      id="subevent-date"
                      type="date"
                      value={newSubEventDate}
                      onChange={(e) => setNewSubEventDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subevent-event-number">Event Number</Label>
                    <Input
                      id="subevent-event-number"
                      placeholder="e.g., #15, Event 1A, #1"
                      value={newSubEventEventNumber}
                      onChange={(e) => setNewSubEventEventNumber(e.target.value)}
                    />
                    <p className="text-caption text-muted-foreground">
                      Optional. Supports both sequential numbering and official event codes.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subevent-prize">Total Prize</Label>
                    <Input
                      id="subevent-prize"
                      placeholder="e.g., $10,000,000"
                      value={newSubEventPrize}
                      onChange={(e) => setNewSubEventPrize(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subevent-winner">Winner</Label>
                    <Input
                      id="subevent-winner"
                      placeholder="e.g., Daniel Negreanu"
                      value={newSubEventWinner}
                      onChange={(e) => setNewSubEventWinner(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subevent-buyin">Buy-in</Label>
                    <Input
                      id="subevent-buyin"
                      placeholder="e.g., $10,000 + $400"
                      value={newSubEventBuyIn}
                      onChange={(e) => setNewSubEventBuyIn(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subevent-entries">Entry Count</Label>
                    <Input
                      id="subevent-entries"
                      type="number"
                      placeholder="e.g., 8569"
                      value={newSubEventEntryCount}
                      onChange={(e) => setNewSubEventEntryCount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subevent-level-duration">Level Duration (min)</Label>
                    <Input
                      id="subevent-level-duration"
                      type="number"
                      placeholder="e.g., 60"
                      value={newSubEventLevelDuration}
                      onChange={(e) => setNewSubEventLevelDuration(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subevent-starting-stack">Starting Stack</Label>
                    <Input
                      id="subevent-starting-stack"
                      type="number"
                      placeholder="e.g., 60000"
                      value={newSubEventStartingStack}
                      onChange={(e) => setNewSubEventStartingStack(e.target.value)}
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Payout Tab */}
            <TabsContent value="payout" className="space-y-4 mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  <Tabs defaultValue="html" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="html">HTML</TabsTrigger>
                      <TabsTrigger value="csv">CSV</TabsTrigger>
                      <TabsTrigger value="manual">Manual</TabsTrigger>
                    </TabsList>

                    <TabsContent value="html" className="space-y-2 mt-3">
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border overflow-hidden">
                        <Label className="text-sm font-medium">Paste HTML Source Code</Label>
                        <Textarea
                          placeholder="1. Open Hendon Mob page in browser&#10;2. Right-click → 'View Page Source' (or Ctrl+U)&#10;3. Copy all HTML (Ctrl+A, Ctrl+C)&#10;4. Paste here"
                          value={hendonMobHtml}
                          onChange={(e) => setHendonMobHtml(e.target.value)}
                          disabled={loadingPayouts}
                          className="h-[150px] max-h-[150px] w-full overflow-x-auto overflow-y-auto font-mono text-xs resize-none break-all"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={loadPayoutsFromHtml}
                            disabled={!hendonMobHtml.trim() || loadingPayouts}
                            className="flex-1"
                          >
                            {loadingPayouts ? "Loading..." : "Parse HTML"}
                          </Button>
                        </div>
                        <p className="text-caption text-muted-foreground">
                          Recommended method. Bypasses bot protection.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="csv" className="space-y-2 mt-3">
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border overflow-hidden">
                        <Label className="text-sm font-medium">Paste CSV Data</Label>
                        <Textarea
                          placeholder="Format:&#10;Rank, Player Name, Prize Amount&#10;1, John Doe, $10,000,000&#10;2, Jane Smith, $5,500,000&#10;3, Bob Johnson, $3,000,000&#10;...&#10;&#10;Or without header:&#10;1, John Doe, $10M&#10;2, Jane Smith, $5.5M"
                          value={csvText}
                          onChange={(e) => setCsvText(e.target.value)}
                          disabled={loadingPayouts}
                          className="h-[150px] max-h-[150px] w-full overflow-x-auto overflow-y-auto font-mono text-xs resize-none break-all"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={loadPayoutsFromCsv}
                            disabled={!csvText.trim() || loadingPayouts}
                            className="flex-1"
                          >
                            {loadingPayouts ? "Loading..." : "Parse CSV"}
                          </Button>
                        </div>
                        <p className="text-caption text-muted-foreground">
                          Works with any tournament. Supports $10M or $10,000,000 format.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="manual" className="space-y-2 mt-3">
                      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Enter Payout Information</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addPayoutRow}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Place
                          </Button>
                        </div>
                        <p className="text-caption text-muted-foreground mb-2">
                          Format: $10M, $10,000,000, or 10000000
                        </p>
                        <ScrollArea className="h-[200px] max-h-[200px]">
                          <div className="space-y-2 pr-3">
                            {payouts.map((payout, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-16">
                                  <Input
                                    placeholder="#"
                                    value={payout.rank}
                                    disabled
                                    className="text-center"
                                  />
                                </div>
                                <div className="flex-1">
                                  <Input
                                    placeholder="Player Name"
                                    value={payout.playerName}
                                    onChange={(e) => updatePayoutRow(index, 'playerName', e.target.value)}
                                  />
                                </div>
                                <div className="w-40">
                                  <Input
                                    placeholder="Prize (e.g. $10M)"
                                    value={payout.prizeAmount}
                                    onChange={(e) => updatePayoutRow(index, 'prizeAmount', e.target.value)}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePayoutRow(index)}
                                  disabled={payouts.length === 1}
                                  className="h-9 w-9 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Blind Structure Tab */}
            <TabsContent value="structure" className="space-y-4 mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subevent-blind-structure">Blind Structure</Label>
                    <Textarea
                      id="subevent-blind-structure"
                      placeholder="Level 1: 100/200/200&#10;Level 2: 200/400/400&#10;Level 3: 300/600/600&#10;..."
                      value={newSubEventBlindStructure}
                      onChange={(e) => setNewSubEventBlindStructure(e.target.value)}
                      className="min-h-[300px] resize-none font-mono text-xs"
                    />
                    <p className="text-caption text-muted-foreground">
                      Enter blind levels in any format
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subevent-notes">Notes</Label>
                    <Textarea
                      id="subevent-notes"
                      placeholder="Additional notes or information about the event"
                      value={newSubEventNotes}
                      onChange={(e) => setNewSubEventNotes(e.target.value)}
                      className="min-h-[150px] resize-none"
                    />
                    <p className="text-caption text-muted-foreground">
                      Any extra information (e.g., special rules, format, etc.)
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loadingData}>
            {editingSubEventId ? "Edit" : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
