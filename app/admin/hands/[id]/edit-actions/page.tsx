"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import { isAdmin } from "@/lib/admin"
import { ActionEditor } from "@/components/hand-actions/ActionEditor"
import {
  useBulkCreateHandActionsMutation,
  useDeleteAllHandActionsMutation,
} from "@/lib/queries/hand-actions-queries"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { CardSkeleton } from "@/components/skeletons/CardSkeleton"
import Link from "next/link"

type Hand = {
  id: string
  number: string
  description: string
  day: {
    id: string
    name: string
    sub_event: {
      name: string
      tournament: {
        name: string
      }
    }
  }
}

type HandPlayer = {
  id: string
  hand_id: string
  player_id: string
  position: string | null
  hole_cards: string | null
  player: {
    id: string
    name: string
  }
}

export default function EditHandActionsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const handId = params.id as string
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hand, setHand] = useState<Hand | null>(null)
  const [handPlayers, setHandPlayers] = useState<HandPlayer[]>([])

  // Pending actions from ActionEditor
  const [pendingActions, setPendingActions] = useState<any[]>([])

  // Mutations
  const handPlayerIds = handPlayers.map(hp => hp.player_id)
  const bulkCreateMutation = useBulkCreateHandActionsMutation(handId, handPlayerIds)
  const deleteAllMutation = useDeleteAllHandActionsMutation(handId, handPlayerIds)

  // Check admin access
  useEffect(() => {
    checkAccess()
  }, [user])

  // Load hand and players
  useEffect(() => {
    if (hasAccess && handId) {
      loadHandData()
    }
  }, [hasAccess, handId])

  async function checkAccess() {
    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        toast.error("Admin privileges required")
        router.push("/")
        return
      }

      setHasAccess(true)
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("Error checking permissions")
      router.push("/")
    }
  }

  async function loadHandData() {
    const supabase = createClientSupabaseClient()

    try {
      setLoading(true)

      // Fetch hand info
      const { data: handData, error: handError } = await supabase
        .from('hands')
        .select(`
          id,
          number,
          description,
          day:days!inner(
            id,
            name,
            sub_event:sub_events!inner(
              name,
              tournament:tournaments!inner(
                name
              )
            )
          )
        `)
        .eq('id', handId)
        .single()

      if (handError) throw handError
      setHand(handData as any)

      // Fetch hand players
      const { data: playersData, error: playersError } = await supabase
        .from('hand_players')
        .select(`
          id,
          hand_id,
          player_id,
          position,
          hole_cards,
          player:players!inner(
            id,
            name
          )
        `)
        .eq('hand_id', handId)

      if (playersError) throw playersError
      setHandPlayers(playersData as any)
    } catch (error) {
      console.error("Failed to load hand data:", error)
      toast.error("Failed to load hand data")
    } finally {
      setLoading(false)
    }
  }

  function handleSaveActions() {
    if (pendingActions.length === 0) {
      toast.info("No pending actions to save")
      return
    }

    const actionsToSave = pendingActions.map(action => ({
      ...action,
      hand_id: handId,
    }))

    bulkCreateMutation.mutate(actionsToSave, {
      onSuccess: () => {
        toast.success("Actions saved successfully!")
        setPendingActions([])
        // Reload to show updated actions
        loadHandData()
      },
      onError: (error) => {
        console.error("Failed to save actions:", error)
        toast.error("Failed to save actions")
      },
    })
  }

  function handleDeleteAllActions() {
    if (!confirm("Are you sure you want to delete ALL actions for this hand?")) {
      return
    }

    deleteAllMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("All actions deleted")
        setPendingActions([])
        loadHandData()
      },
      onError: (error) => {
        console.error("Failed to delete actions:", error)
        toast.error("Failed to delete actions")
      },
    })
  }

  if (!hasAccess || loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <CardSkeleton count={3} />
      </div>
    )
  }

  if (!hand) {
    return (
      <div className="container max-w-7xl mx-auto py-16 px-4 text-center">
        <h2 className="text-title-lg mb-4">Hand not found</h2>
        <p className="text-body text-muted-foreground mb-6">
          The hand you are looking for does not exist.
        </p>
        <Link href="/archive">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Archive
          </Button>
        </Link>
      </div>
    )
  }

  const players = handPlayers.map(hp => ({
    id: hp.player_id,
    name: hp.player.name,
  }))

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/archive">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Archive
            </Button>
          </Link>
        </div>

        {/* Hand Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-title-lg mb-2">
                Edit Hand Actions: #{hand.number}
              </h1>
              <p className="text-body text-muted-foreground mb-3">
                {hand.description}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{hand.day.sub_event.tournament.name}</span>
                <span>›</span>
                <span>{hand.day.sub_event.name}</span>
                <span>›</span>
                <span>{hand.day.name}</span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Players */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Players</h3>
            <div className="flex flex-wrap gap-2">
              {handPlayers.map(hp => (
                <Badge key={hp.id} variant="secondary">
                  {hp.player.name}
                  {hp.position && ` (${hp.position})`}
                  {hp.hole_cards && ` - ${hp.hole_cards}`}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Action Editor */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title">Hand Actions</h2>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllActions}
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Actions
            </Button>
          </div>

          <ActionEditor
            handId={handId}
            players={players}
            onActionsChange={() => {
              // This can be used to track changes if needed
            }}
            onPendingActionsChange={setPendingActions}
          />
        </Card>

        {/* Save Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/archive">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleSaveActions}
            disabled={bulkCreateMutation.isPending || pendingActions.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {bulkCreateMutation.isPending ? "Saving..." : "Save Actions"}
          </Button>
        </div>
      </div>
  )
}
