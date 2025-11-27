"use client"

import { PlayersPageLayout } from "./_components/PlayersPageLayout"
import { usePlayersQuery, type PlayerWithHandCount } from "@/lib/queries/players-queries"
import { toast } from "sonner"

export default function PlayersClient() {
  // React Query hook (Firestore)
  const { data: playersData = [], isLoading: loading, error } = usePlayersQuery()
  const players = playersData as PlayerWithHandCount[]

  // Handle query error
  if (error) {
    toast.error('Failed to load players')
  }

  return <PlayersPageLayout players={players} loading={loading} />
}
