"use client"

import { useQuery } from "@tanstack/react-query"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card as CardComponent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Video, ExternalLink } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/empty-state"
import { Search } from "lucide-react"
import { YouTubePlayer } from "@/components/video/youtube-player"

const supabase = createClientSupabaseClient()

/**
 * YouTube URL에서 video ID 추출
 */
function extractVideoId(url?: string): string | null {
  if (!url) return null

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

// Playing card component
interface CardProps {
  card: string
}

function Card({ card }: CardProps) {
  if (!card || card.length < 2) return null

  const rank = card.slice(0, -1)
  const suit = card.slice(-1)

  const suitSymbol = {
    s: "♠",
    h: "♥",
    d: "♦",
    c: "♣",
  }[suit.toLowerCase()] || suit

  const isRed = suit.toLowerCase() === "h" || suit.toLowerCase() === "d"

  return (
    <div
      className={cn(
        "w-12 h-16 rounded border-2 bg-white flex flex-col items-center justify-center font-bold shadow-sm",
        isRed ? "text-red-600 border-red-300" : "text-gray-900 border-gray-300"
      )}
    >
      <div className="text-lg">{rank}</div>
      <div className="text-xl">{suitSymbol}</div>
    </div>
  )
}

interface HandDetailPanelProps {
  handId: string
}

export function HandDetailPanel({ handId }: HandDetailPanelProps) {
  const { data: hand, isLoading, error } = useQuery({
    queryKey: ["hand", handId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hands")
        .select(`
          *,
          stream:day_id (
            name,
            video_url,
            sub_event:event_id (
              name,
              tournament:tournament_id (
                name
              )
            )
          ),
          hand_players (
            *,
            player:player_id (
              name,
              photo_url,
              country
            )
          ),
          hand_actions (
            *
          )
        `)
        .eq("id", handId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!handId,
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <EmptyState
          icon={Search}
          title="핸드를 불러올 수 없습니다"
          description="잠시 후 다시 시도해주세요."
          variant="inline"
        />
      </div>
    )
  }

  if (!hand) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <EmptyState
          icon={Search}
          title="핸드를 찾을 수 없습니다"
          description="핸드가 삭제되었거나 존재하지 않습니다."
          variant="inline"
        />
      </div>
    )
  }

  const stream = hand.stream as any
  const tournament = stream?.sub_event?.tournament
  const videoId = extractVideoId(stream?.video_url)

  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* YouTube Player (상단 고정) */}
        {videoId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border sticky top-0 z-10">
            <h2 className="text-lg font-semibold mb-4">영상</h2>
            <YouTubePlayer
              videoId={videoId}
              startTime={hand.video_timestamp_start}
              className="w-full"
            />
          </div>
        )}
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Hand #{hand.number}</h1>
            <Link
              href={`/hands/${hand.id}`}
              className="text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1"
            >
              전체 상세보기
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {tournament?.name}
            {stream?.name && ` • ${stream.name}`}
            {hand.stakes && ` • ${hand.stakes}`}
          </div>
          {hand.final_pot && (
            <div className="mt-3 text-lg font-semibold text-green-600 dark:text-green-400">
              최종 팟: ${(hand.final_pot / 100).toLocaleString()}
            </div>
          )}
        </div>

        {/* AI Summary */}
        {hand.ai_summary && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              AI 요약
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">{hand.ai_summary}</p>
          </div>
        )}

        {/* Board Cards */}
        {(hand.board_flop || hand.board_turn || hand.board_river) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <h2 className="text-lg font-semibold mb-4">보드</h2>
            <div className="flex gap-2 flex-wrap">
              {/* Flop */}
              {hand.board_flop && (
                <div className="flex gap-1">
                  {hand.board_flop.map((card: string, i: number) => (
                    <Card key={i} card={card} />
                  ))}
                </div>
              )}
              {/* Turn */}
              {hand.board_turn && (
                <div className="flex gap-1">
                  <Card card={hand.board_turn} />
                </div>
              )}
              {/* River */}
              {hand.board_river && (
                <div className="flex gap-1">
                  <Card card={hand.board_river} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Players */}
        {hand.hand_players && hand.hand_players.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <h2 className="text-lg font-semibold mb-4">플레이어</h2>
            <div className="space-y-3">
              {hand.hand_players.map((hp: any) => (
                <div
                  key={hp.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={hp.player?.photo_url} alt={hp.player?.name} />
                      <AvatarFallback>{hp.player?.name?.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{hp.player?.name}</div>
                      <div className="text-xs text-gray-500">
                        {hp.poker_position || "Position N/A"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {hp.starting_stack && (
                      <div className="text-sm font-semibold">
                        스택: ${(hp.starting_stack / 100).toLocaleString()}
                      </div>
                    )}
                    {hp.is_winner && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                        승자
                      </div>
                    )}
                    {hp.hole_cards && hp.hole_cards.length > 0 && (
                      <div className="flex gap-1 mt-1 justify-end">
                        {hp.hole_cards.map((card: string, i: number) => (
                          <Card key={i} card={card} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Timeline */}
        {hand.hand_actions && hand.hand_actions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
            <h2 className="text-lg font-semibold mb-4">액션 타임라인</h2>
            <div className="space-y-2">
              {hand.hand_actions
                .sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                .map((action: any) => (
                  <div
                    key={action.id}
                    className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded"
                  >
                    <div className="text-xs text-gray-500 w-16 uppercase">{action.street}</div>
                    <div className="font-medium flex-1">{action.player_name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {action.action_type}
                    </div>
                    {action.amount > 0 && (
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400 w-24 text-right">
                        ${(action.amount / 100).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// Utility
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
