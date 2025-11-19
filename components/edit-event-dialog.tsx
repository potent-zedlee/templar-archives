"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Event } from "@/lib/supabase"

interface EventPayout {
  id?: string
  rank: number
  player_name: string
  prize_amount: number
}

interface EditEventDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
  onSuccess?: () => void
}

export function EditEventDialog({
  isOpen,
  onOpenChange,
  eventId,
  onSuccess,
}: EditEventDialogProps) {
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  // Basic Info
  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const [buyIn, setBuyIn] = useState("")
  const [entryCount, setEntryCount] = useState("")
  const [notes, setNotes] = useState("")

  // Tournament Details
  const [blindStructure, setBlindStructure] = useState("")
  const [levelDuration, setLevelDuration] = useState("")
  const [startingStack, setStartingStack] = useState("")

  // Prize & Winner
  const [totalPrize, setTotalPrize] = useState("")
  const [winner, setWinner] = useState("")

  // Payouts
  const [payouts, setPayouts] = useState<EventPayout[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load Event data
  useEffect(() => {
    if (!isOpen || !eventId) return

    const loadData = async () => {
      setLoading(true)
      try {
        // Load Event
        const { data: event, error: eventError } = await supabase
          .from("sub_events")
          .select("*")
          .eq("id", eventId)
          .single()

        if (eventError) throw eventError

        // Set form values
        setName(event.name || "")
        setDate(event.date || "")
        setBuyIn(event.buy_in || "")
        setEntryCount(event.entry_count?.toString() || "")
        setNotes(event.notes || "")
        setBlindStructure(event.blind_structure || "")
        setLevelDuration(event.level_duration?.toString() || "")
        setStartingStack(event.starting_stack?.toString() || "")
        setTotalPrize(event.total_prize || "")
        setWinner(event.winner || "")

        // Load Payouts
        const { data: payoutsData, error: payoutsError } = await supabase
          .from("event_payouts")
          .select("*")
          .eq("sub_event_id", eventId)
          .order("rank", { ascending: true })

        if (payoutsError) throw payoutsError

        setPayouts(
          payoutsData.map((p) => ({
            id: p.id,
            rank: p.rank,
            player_name: p.player_name,
            prize_amount: p.prize_amount,
          }))
        )
      } catch (error) {
        console.error("Error loading event data:", error)
        toast({
          title: "Error",
          description: "Failed to load event data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, eventId, supabase, toast])

  const handleSave = async () => {
    if (!eventId) return

    setSaving(true)
    try {
      // Update Event
      const { error: updateError } = await supabase
        .from("sub_events")
        .update({
          name,
          date,
          buy_in: buyIn || null,
          entry_count: entryCount ? parseInt(entryCount) : null,
          notes: notes || null,
          blind_structure: blindStructure || null,
          level_duration: levelDuration ? parseInt(levelDuration) : null,
          starting_stack: startingStack ? parseInt(startingStack) : null,
          total_prize: totalPrize || null,
          winner: winner || null,
        })
        .eq("id", eventId)

      if (updateError) throw updateError

      // Update Payouts
      // 1. Delete existing payouts
      const { error: deleteError } = await supabase
        .from("event_payouts")
        .delete()
        .eq("sub_event_id", eventId)

      if (deleteError) throw deleteError

      // 2. Insert new payouts
      if (payouts.length > 0) {
        const { error: insertError } = await supabase
          .from("event_payouts")
          .insert(
            payouts.map((p) => ({
              sub_event_id: eventId,
              rank: p.rank,
              player_name: p.player_name,
              prize_amount: p.prize_amount,
            }))
          )

        if (insertError) throw insertError
      }

      toast({
        title: "Success",
        description: "Event updated successfully",
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving event:", error)
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addPayout = () => {
    const nextRank = payouts.length > 0 ? Math.max(...payouts.map((p) => p.rank)) + 1 : 1
    setPayouts([...payouts, { rank: nextRank, player_name: "", prize_amount: 0 }])
  }

  const removePayout = (index: number) => {
    setPayouts(payouts.filter((_, i) => i !== index))
  }

  const updatePayout = (index: number, field: keyof EventPayout, value: any) => {
    const newPayouts = [...payouts]
    newPayouts[index] = { ...newPayouts[index], [field]: value }
    setPayouts(newPayouts)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event Information</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Tournament Details</TabsTrigger>
              <TabsTrigger value="prize">Prize & Winner</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Main Event"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buy-in">Buy-in</Label>
                  <Input
                    id="buy-in"
                    placeholder="e.g., $10,000 + $400"
                    value={buyIn}
                    onChange={(e) => setBuyIn(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entry-count">Entry Count</Label>
                  <Input
                    id="entry-count"
                    type="number"
                    placeholder="e.g., 128"
                    value={entryCount}
                    onChange={(e) => setEntryCount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or information"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Tournament Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="blind-structure">Blind Structure</Label>
                <Input
                  id="blind-structure"
                  placeholder="e.g., 20-minute levels"
                  value={blindStructure}
                  onChange={(e) => setBlindStructure(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level-duration">Level Duration (minutes)</Label>
                  <Input
                    id="level-duration"
                    type="number"
                    placeholder="e.g., 60"
                    value={levelDuration}
                    onChange={(e) => setLevelDuration(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="starting-stack">Starting Stack</Label>
                  <Input
                    id="starting-stack"
                    type="number"
                    placeholder="e.g., 50000"
                    value={startingStack}
                    onChange={(e) => setStartingStack(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Prize & Winner Tab */}
            <TabsContent value="prize" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="total-prize">Total Prize Pool</Label>
                <Input
                  id="total-prize"
                  placeholder="e.g., $10,000,000"
                  value={totalPrize}
                  onChange={(e) => setTotalPrize(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="winner">Winner</Label>
                <Input
                  id="winner"
                  placeholder="e.g., Daniel Negreanu"
                  value={winner}
                  onChange={(e) => setWinner(e.target.value)}
                />
              </div>
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label>Payout Distribution</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPayout}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Payout
                </Button>
              </div>

              <div className="space-y-2">
                {payouts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-caption">No payouts added yet</p>
                    <p className="text-caption">Click "Add Payout" to start</p>
                  </div>
                ) : (
                  payouts.map((payout, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          placeholder="Rank"
                          value={payout.rank}
                          onChange={(e) =>
                            updatePayout(index, "rank", parseInt(e.target.value) || 0)
                          }
                        />
                        <Input
                          placeholder="Player Name"
                          value={payout.player_name}
                          onChange={(e) => updatePayout(index, "player_name", e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="Prize (in cents)"
                          value={payout.prize_amount}
                          onChange={(e) =>
                            updatePayout(index, "prize_amount", parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePayout(index)}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
