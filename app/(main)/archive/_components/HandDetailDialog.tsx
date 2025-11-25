"use client"

/**
 * Hand Detail Dialog
 *
 * 핸드 상세 정보를 다이얼로그로 표시
 */

import { useQuery } from "@tanstack/react-query"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"

const supabase = createClientSupabaseClient()

interface HandDetailDialogProps {
  handId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Playing card component
function PlayingCard({ card }: { card: string }) {
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
      className={`w-8 h-11 rounded border bg-white flex flex-col items-center justify-center font-bold text-xs shadow-sm ${
        isRed ? "text-red-600 border-red-300" : "text-gray-900 border-gray-300"
      }`}
    >
      <div>{rank}</div>
      <div className="text-sm">{suitSymbol}</div>
    </div>
  )
}

export function HandDetailDialog({ handId, open, onOpenChange }: HandDetailDialogProps) {
  const { data: hand, isLoading } = useQuery({
    queryKey: ["hand-detail-dialog", handId],
    queryFn: async () => {
      if (!handId) return null

      const { data, error } = await supabase
        .from("hands")
        .select(`
          *,
          streams!day_id (
            name,
            video_url,
            sub_events (
              name,
              tournaments (
                name
              )
            )
          ),
          hand_players (
            *,
            players (
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
    enabled: !!handId && open,
    staleTime: 5 * 60 * 1000,
  })

  const stream = hand?.streams as any
  const tournament = stream?.sub_events?.tournaments

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span>Hand #{hand?.number || "..."}</span>
            {hand && (
              <Link
                href={`/hands/${hand.id}`}
                className="text-sm text-green-500 hover:text-green-400 inline-flex items-center gap-1"
                onClick={() => onOpenChange(false)}
              >
                전체 페이지로 보기
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </DialogTitle>
          {hand && (
            <div className="text-sm text-gray-400">
              {tournament?.name}
              {stream?.name && ` • ${stream.name}`}
              {hand.stakes && ` • ${hand.stakes}`}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="px-6 pb-6 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : !hand ? (
              <div className="text-center py-12 text-gray-400">
                핸드를 찾을 수 없습니다
              </div>
            ) : (
              <>
                {/* Pot Size */}
                {hand.pot_size && (
                  <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400">최종 팟</div>
                    <div className="text-xl font-bold text-green-400">
                      {hand.pot_size.toLocaleString()} chips
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                {hand.ai_summary && (
                  <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                    <div className="text-sm font-semibold text-blue-300 mb-2">AI 요약</div>
                    <p className="text-sm text-blue-200">{hand.ai_summary}</p>
                  </div>
                )}

                {/* Board Cards */}
                {(hand.board_flop || hand.board_turn || hand.board_river) && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm font-semibold text-gray-300 mb-3">보드</div>
                    <div className="flex gap-2 flex-wrap">
                      {hand.board_flop && hand.board_flop.map((card: string, i: number) => (
                        <PlayingCard key={`flop-${i}`} card={card} />
                      ))}
                      {hand.board_turn && <PlayingCard card={hand.board_turn} />}
                      {hand.board_river && <PlayingCard card={hand.board_river} />}
                    </div>
                  </div>
                )}

                {/* Players */}
                {hand.hand_players && hand.hand_players.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm font-semibold text-gray-300 mb-3">플레이어</div>
                    <div className="space-y-2">
                      {hand.hand_players.map((hp: any) => (
                        <div
                          key={hp.id}
                          className="flex items-center justify-between p-2 bg-gray-900 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={hp.players?.photo_url} alt={hp.players?.name} />
                              <AvatarFallback className="text-xs">
                                {hp.players?.name?.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-gray-200">
                                {hp.players?.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {hp.poker_position || "-"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hp.is_winner && (
                              <Badge variant="default" className="bg-green-600 text-xs">
                                승자
                              </Badge>
                            )}
                            {hp.hole_cards && hp.hole_cards.length > 0 && (
                              <div className="flex gap-1">
                                {hp.hole_cards.map((card: string, i: number) => (
                                  <PlayingCard key={i} card={card} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {hand.hand_actions && hand.hand_actions.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm font-semibold text-gray-300 mb-3">액션</div>
                    <div className="space-y-1">
                      {hand.hand_actions
                        .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                        .map((action: any) => (
                          <div
                            key={action.id}
                            className="flex items-center gap-2 p-2 bg-gray-900 rounded text-sm"
                          >
                            <Badge variant="outline" className="text-xs w-16 justify-center">
                              {action.street}
                            </Badge>
                            <span className="text-gray-300 flex-1">{action.player_name}</span>
                            <span className="text-gray-400 capitalize">{action.action_type}</span>
                            {action.amount > 0 && (
                              <span className="text-green-400 font-medium">
                                {action.amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
