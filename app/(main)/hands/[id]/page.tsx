import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, BookmarkPlus, Sparkles, MessageSquare } from 'lucide-react'
import { PokerTable } from '@/components/poker/PokerTable'
import { ActionTimeline, type HandAction } from '@/components/poker/ActionTimeline'
import { YouTubePlayer } from '@/components/video/youtube-player'
import { CommentSection } from '@/components/community/comment-section'
import type { PlayerSeatData } from '@/components/poker/PlayerSeat'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Hand #${id} | Templar Archives`,
    description: 'Hand History 상세 정보',
  }
}

async function getHandDetails(handId: string) {
  const supabase = await createServerSupabaseClient()

  // Get hand with all related data
  const { data: hand, error } = await supabase
    .from('hands')
    .select(`
      id,
      number,
      stakes,
      pot_size,
      board_flop,
      board_turn,
      board_river,
      video_timestamp_start,
      video_timestamp_end,
      ai_summary,
      created_at,
      job_id,
      day_id,
      days (
        id,
        name,
        video_url,
        sub_events (
          id,
          name,
          date,
          tournaments (
            id,
            name,
            category,
            location
          )
        )
      ),
      hand_players (
        id,
        seat,
        position:poker_position,
        hole_cards,
        stack_size:starting_stack,
        ending_stack,
        final_amount,
        is_winner,
        hand_description,
        players (
          id,
          name,
          country
        )
      )
    `)
    .eq('id', handId)
    .single()

  if (error || !hand) {
    console.error('Error fetching hand:', error)
    return null
  }

  // Get hand actions
  const { data: actions } = await supabase
    .from('hand_actions')
    .select(`
      id,
      hand_player_id,
      street,
      action_type,
      amount,
      timestamp,
      action_sequence:sequence,
      hand_players (
        players (
          name
        )
      )
    `)
    .eq('hand_id', handId)
    .order('sequence', { ascending: true })

  return {
    ...hand,
    actions: actions || [],
  }
}

async function getAdjacentHands(currentHandId: string, streamId: string) {
  const supabase = await createServerSupabaseClient()

  // Get prev/next hands from same stream
  const { data: hands } = await supabase
    .from('hands')
    .select('id, number, created_at')
    .eq('day_id', streamId)
    .order('created_at', { ascending: true })

  if (!hands) return { prev: null, next: null }

  const currentIndex = hands.findIndex((h) => h.id === currentHandId)
  if (currentIndex === -1) return { prev: null, next: null }

  return {
    prev: currentIndex > 0 ? hands[currentIndex - 1] : null,
    next: currentIndex < hands.length - 1 ? hands[currentIndex + 1] : null,
  }
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function HandDetailContent({ handId }: { handId: string }) {
  const hand = await getHandDetails(handId)

  if (!hand) {
    notFound()
  }

  const tournament = hand.days?.sub_events?.tournaments
  const subEvent = hand.days?.sub_events
  const day = hand.days
  const videoId = day?.video_url ? extractYouTubeId(day.video_url) : null

  // Transform hand_players to PlayerSeatData
  const players: PlayerSeatData[] =
    hand.hand_players?.map((hp: any) => ({
      id: hp.id,
      seat: hp.seat || 1,
      position: hp.position || hp.poker_position,
      name: hp.players?.name || 'Unknown',
      stack: hp.stack_size ?? hp.ending_stack ?? 0,
      holeCards: hp.hole_cards,
      isWinner: hp.is_winner,
      finalAmount: hp.final_amount,
      handDescription: hp.hand_description,
      flagCode: hp.players?.country,
    })) || []

  // Transform actions
  const handActions: HandAction[] =
    hand.actions?.map((action: any) => ({
      id: action.id,
      hand_player_id: action.hand_player_id,
      street: action.street,
      action_type: action.action_type,
      amount: action.amount || 0,
      timestamp: action.timestamp,
      action_sequence: action.action_sequence,
      player_name: action.hand_players?.players?.name,
    })) || []

  const adjacent = await getAdjacentHands(handId, hand.day_id)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/hands">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">
                  {tournament?.name || 'Unknown Tournament'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {subEvent?.name || 'Unknown Event'} • {day?.name || 'Day'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Hand Navigation */}
              <div className="flex items-center gap-2">
                <Link href={adjacent.prev ? `/hands/${adjacent.prev.id}` : '#'}>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!adjacent.prev}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <Badge variant="outline" className="text-sm font-mono">
                  Hand #{hand.number || 'N/A'}
                </Badge>
                <Link href={adjacent.next ? `/hands/${adjacent.next.id}` : '#'}>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!adjacent.next}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Actions */}
              <Button variant="ghost" size="icon">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <BookmarkPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* 1. Video Player (Large Square) */}
            <Card>
              <CardContent className="p-0">
                {videoId ? (
                  <div className="aspect-square bg-black">
                    <YouTubePlayer
                      videoId={videoId}
                      startTime={hand.video_timestamp_start || 0}
                    />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-muted">
                    <p className="text-muted-foreground">No video available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Hand Summary (AI Generated) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Sample - Summary of this hand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {hand.ai_summary || 'Hand summary will be generated automatically after analysis...'}
                </p>
              </CardContent>
            </Card>

            {/* 3. Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  COMMENT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommentSection entityType="hand" entityId={hand.id} />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* 1. Poker Table (Large Square) */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Stakes Badge */}
                  {hand.stakes && (
                    <div className="flex items-center justify-center">
                      <Badge variant="outline" className="text-lg py-1 px-4">
                        {hand.stakes}
                      </Badge>
                    </div>
                  )}

                  {/* Poker Table in Square Container */}
                  <div className="aspect-square flex items-center justify-center">
                    <div className="w-full h-full">
                      <PokerTable
                        players={players}
                        flop={hand.board_flop}
                        turn={hand.board_turn}
                        river={hand.board_river}
                        potSize={hand.pot_size}
                        showCards={true}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Action Timeline */}
            <Card>
              <CardContent className="p-0">
                <ActionTimeline actions={handActions} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

function HandDetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}

export default async function HandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<HandDetailSkeleton />}>
      <HandDetailContent handId={id} />
    </Suspense>
  )
}
