"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, TrendingUp, ChevronDown, ChevronRight, BarChart3, PieChart, Activity, Upload } from "lucide-react"
import type { HandHistory } from "@/lib/types/hand-history"
import { toast } from "sonner"
import { isAdmin } from "@/lib/auth-utils"
import { ClaimPlayerDialog } from "@/components/claim-player-dialog"
import { useAuth } from "@/components/auth-provider"
import {
  usePlayerQuery,
  usePlayerHandsQuery,
  usePlayerStatsQuery,
  usePlayerPrizesQuery,
  usePlayerClaimQuery,
  useUpdatePlayerPhotoMutation
} from "@/lib/queries/players-queries"
import { HandListAccordion } from "@/components/hand-list-accordion"
import { PrizeHistoryChart, TournamentCategoryChart } from "@/components/player-charts"
import { AdvancedStatsCard, PositionalStatsCard, PerformanceChartCard } from "@/components/player-stats"

type Tournament = {
  id: string
  name: string
  category: string
  location: string
  sub_events: SubEvent[]
  expanded: boolean
}

type SubEvent = {
  id: string
  name: string
  date: string
  days: Day[]
  expanded: boolean
}

type Day = {
  id: string
  name: string
  video_url?: string
  video_file?: string
  video_source?: string
  video_nas_path?: string
  hands: any[]
}

export default function PlayerDetailClient() {
  const params = useParams()
  const router = useRouter()
  const playerId = params.id as string
  const { user } = useAuth()

  // React Query hooks
  const { data: player = null, isLoading: loading } = usePlayerQuery(playerId)
  const { data: handsData = [] } = usePlayerHandsQuery(playerId)
  const { data: playerStats = {
    vpip: 0,
    pfr: 0,
    threeBet: 0,
    ats: 0,
    winRate: 0,
    avgPotSize: 0,
    showdownWinRate: 0,
    totalHands: 0,
    handsWon: 0,
  } } = usePlayerStatsQuery(playerId)
  const { data: prizeHistory = [] } = usePlayerPrizesQuery(playerId)
  const { data: claimData } = usePlayerClaimQuery(playerId, user?.id)

  // Mutations
  const updatePhotoMutation = useUpdatePlayerPhotoMutation(playerId)

  // UI states
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [claimDialogOpen, setClaimDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extract claim data
  const playerClaim = claimData?.claimInfo.claim || null
  const isClaimed = claimData?.claimInfo.claimed || false
  const userClaim = claimData?.userClaim || null

  // Update tournaments when hands data changes
  useEffect(() => {
    const tournamentsWithState = handsData.map((tournament: any) => ({
      ...tournament,
      expanded: true,
      sub_events: tournament.sub_events.map((subEvent: any) => ({
        ...subEvent,
        expanded: false,
      })),
    }))
    setTournaments(tournamentsWithState)
  }, [handsData])

  // Calculate total hands count
  const totalHandsCount = useMemo(() => {
    return handsData.reduce((total: number, tournament: any) => {
      return total + tournament.sub_events.reduce((subTotal: number, subEvent: any) => {
        return subTotal + subEvent.days.reduce((dayTotal: number, day: any) => {
          return dayTotal + day.hands.length
        }, 0)
      }, 0)
    }, 0)
  }, [handsData])

  // Calculate UI statistics
  const statistics = useMemo(() => {
    const eventsMap = new Map<string, number>()
    const categoriesMap = new Map<string, number>()

    tournaments.forEach((tournament) => {
      let tournamentHandCount = 0

      tournament.sub_events?.forEach((subEvent) => {
        let subEventHandCount = 0

        subEvent.days?.forEach((day) => {
          day.hands?.forEach((hand: any) => {
            subEventHandCount++
            tournamentHandCount++
          })
        })

        if (subEventHandCount > 0) {
          eventsMap.set(subEvent.name, subEventHandCount)
        }
      })

      if (tournamentHandCount > 0) {
        categoriesMap.set(
          tournament.category,
          (categoriesMap.get(tournament.category) || 0) + tournamentHandCount
        )
      }
    })

    const handsPerEvent = Array.from(eventsMap.entries())
      .map(([name, hands]) => ({ name, hands }))
      .sort((a, b) => b.hands - a.hands)
      .slice(0, 10)

    const tournamentCategories = Array.from(categoriesMap.entries())
      .map(([name, value]) => ({ name, value }))

    return {
      eventsCount: eventsMap.size,
      tournamentsCount: tournaments.length,
      handsPerEvent,
      tournamentCategories
    }
  }, [tournaments])

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !player) return

    updatePhotoMutation.mutate(file, {
      onSuccess: () => {
        toast.success('Player photo updated successfully')
      },
      onError: (error) => {
        console.error('Error uploading photo:', error)
        toast.error('Failed to upload photo')
      }
    })
  }

  const formatWinnings = (winnings?: number) => {
    if (!winnings) return '$0'
    if (winnings >= 1000000) {
      return `$${(winnings / 1000000).toFixed(1)}M`
    }
    if (winnings >= 1000) {
      return `$${(winnings / 1000).toFixed(0)}K`
    }
    return `$${winnings}`
  }

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return ''
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  const toggleTournament = (tournamentId: string) => {
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === tournamentId ? { ...t, expanded: !t.expanded } : t
      )
    )
  }

  const toggleSubEvent = (tournamentId: string, subEventId: string) => {
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === tournamentId
          ? {
              ...t,
              sub_events: t.sub_events?.map((se) =>
                se.id === subEventId ? { ...se, expanded: !se.expanded } : se
              ),
            }
          : t
      )
    )
  }

  const handleClaimSuccess = () => {
    setClaimDialogOpen(false)
    toast.success('Claim request submitted successfully')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-7xl mx-auto py-16 text-center">
          <p className="text-body-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-7xl mx-auto py-16 text-center">
          <p className="text-body-lg text-muted-foreground">Player not found</p>
          <Button onClick={() => router.push('/players')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Players
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/players')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Players
          </Button>
        </div>

        {/* Player Info Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={player.photo_url} alt={player.name} />
                <AvatarFallback className="text-2xl font-bold">
                  {player.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {isAdmin(user?.email) && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-8 px-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={updatePhotoMutation.isPending}
                  >
                    <Upload className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {player.country && (
                    <span className="text-3xl">{getCountryFlag(player.country)}</span>
                  )}
                  <h1 className="text-title-lg">{player.name}</h1>

                  {/* Claim Status Badges */}
                  {isClaimed && playerClaim && (
                    <Badge variant="default" className="ml-2">
                      Claimed by {playerClaim.user.nickname}
                    </Badge>
                  )}
                  {userClaim && userClaim.status === 'pending' && (
                    <Badge variant="secondary" className="ml-2">
                      Claim Pending
                    </Badge>
                  )}
                  {user && userClaim && userClaim.status === 'approved' && (
                    <Badge variant="default" className="ml-2 bg-green-600">
                      Your Profile
                    </Badge>
                  )}
                </div>

                {/* Claim Button */}
                {user && !isClaimed && !userClaim && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClaimDialogOpen(true)}
                  >
                    Claim This Profile
                  </Button>
                )}
              </div>
              {player.country && (
                <Badge variant="secondary" className="text-caption mb-4">
                  {player.country}
                </Badge>
              )}

              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <p className="text-caption text-muted-foreground mb-1">Total Winnings</p>
                  <div className="flex items-center gap-1 text-title">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-bold">{formatWinnings(player.total_winnings)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground mb-1">Hands in Archive</p>
                  <p className="text-title font-bold">{totalHandsCount}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Statistics Dashboard */}
        <div className="space-y-6">
          {/* Advanced Statistics Card */}
          <AdvancedStatsCard playerId={playerId} />

          {/* Positional Stats & Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PositionalStatsCard playerId={playerId} />
            <PerformanceChartCard playerId={playerId} />
          </div>

          {/* Prize History & Tournament Category Charts */}
          {totalHandsCount > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prize History Chart */}
              <Card className="p-6">
                <h3 className="text-title mb-4">Prize History</h3>
                <PrizeHistoryChart data={prizeHistory} />
              </Card>

              {/* Pie Chart - Tournament Categories */}
              {statistics.tournamentCategories.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-title mb-4">Tournament Category Distribution</h3>
                  <TournamentCategoryChart data={statistics.tournamentCategories} />
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Hands List - Hierarchical */}
        <Card className="p-6 mt-6">
          <h2 className="text-title mb-4">Hand History ({totalHandsCount})</h2>
          <ScrollArea className="h-[calc(100vh-480px)]">
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-body text-muted-foreground">
                  No hands found for this player
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {tournaments.map((tournament) => (
                  <div key={tournament.id}>
                    {/* Tournament Level */}
                    <div
                      className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleTournament(tournament.id)}
                    >
                      {tournament.expanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary/10 text-xs font-bold text-primary flex-shrink-0">
                        {tournament.category.charAt(0)}
                      </div>
                      <span className="text-body font-normal text-foreground">
                        {tournament.name}
                      </span>
                    </div>

                    {/* SubEvent Level */}
                    {tournament.expanded && (
                      <div className="ml-4">
                        {tournament.sub_events?.map((subEvent) => (
                          <div key={subEvent.id}>
                            <div
                              className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => toggleSubEvent(tournament.id, subEvent.id)}
                            >
                              {subEvent.expanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-body font-normal text-foreground">
                                {subEvent.name}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {subEvent.days.reduce((total, day) => total + day.hands.length, 0)} hands
                              </Badge>
                            </div>

                            {/* Day Level with Hands */}
                            {subEvent.expanded && (
                              <div className="ml-8 mt-2">
                                {subEvent.days?.map((day) => (
                                  <div key={day.id} className="mb-4">
                                    <div className="flex items-center gap-2 py-1 px-3 mb-2">
                                      <span className="text-caption font-medium text-muted-foreground">
                                        {day.name} ({day.hands.length} hands)
                                      </span>
                                    </div>
                                    <HandListAccordion
                                      handIds={day.hands.map(h => h.id)}
                                      hands={day.hands.map((hand: any) => {
                                        const timestamp = hand.timestamp || ""
                                        const parts = timestamp.split('-')
                                        const startTime = parts[0] || "00:00"
                                        const endTime = parts[1] || parts[0] || "00:00"

                                        return {
                                          handNumber: hand.number || "???",
                                          summary: hand.description || "Hand Information",
                                          timestamp: 0,
                                          startTime,
                                          endTime,
                                          duration: 0,
                                          winner: hand.hand_players?.find((hp: any) => hp.position === "BTN")?.player?.name || "Unknown",
                                          potSize: hand.pot_size || 0,
                                          players: hand.hand_players?.map((hp: any) => ({
                                            name: hp.player?.name || "Unknown",
                                            position: hp.position || "Unknown",
                                            cards: hp.cards || [],
                                            stackBefore: 0,
                                            stackAfter: 0,
                                            stackChange: 0,
                                          })) || [],
                                          communityCards: {
                                            preflop: [],
                                            flop: hand.board_cards?.slice(0, 3) || [],
                                            turn: hand.board_cards?.slice(3, 4) || [],
                                            river: hand.board_cards?.slice(4, 5) || [],
                                          },
                                          actions: {
                                            preflop: [],
                                            flop: [],
                                            turn: [],
                                            river: [],
                                          },
                                          streets: {
                                            preflop: { actions: [], pot: 0 },
                                            flop: { actions: [], pot: 0 },
                                            turn: { actions: [], pot: 0 },
                                            river: { actions: [], pot: 0 },
                                          },
                                          confidence: 0.8,
                                        }
                                      })}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>

      {/* Claim Player Dialog */}
      {player && (
        <ClaimPlayerDialog
          open={claimDialogOpen}
          onOpenChange={setClaimDialogOpen}
          player={player}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  )
}
