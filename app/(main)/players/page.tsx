"use client"

import { PageTransition } from "@/components/page-transition"
import { PlayersPageLayout } from "./_components/PlayersPageLayout"
import { usePlayersQuery } from "@/lib/queries/players-queries"
import { toast } from "sonner"
import type { Player } from "@/lib/supabase"

type PlayerWithHandCount = Player & {
  hand_count: number
}

export default function PlayersClient() {
  // React Query hook
  const { data: playersData = [], isLoading: loading, error } = usePlayersQuery()
  const players = playersData as PlayerWithHandCount[]

  // Handle query error
  if (error) {
    toast.error('Failed to load players')
  }

  return (
    <PageTransition variant="slideUp">
      <PlayersPageLayout players={players} loading={loading} />
    </PageTransition>
  )
}
