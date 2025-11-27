"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LinkButton } from "@/components/ui/link-button"
import { Trophy, TrendingUp, ArrowRight } from "lucide-react"
import type { TopPlayer } from "@/lib/main-page"

interface TopPlayersProps {
  players: TopPlayer[]
}

export function TopPlayers({ players }: TopPlayersProps) {
  if (players.length === 0) {
    return null
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-lg mb-2">Top Players</h2>
          <p className="text-body text-muted-foreground">
            총 상금 기준 상위 플레이어
          </p>
        </div>
        <LinkButton
          href="/players"
          variant="outline"
        >
          View All Players
          <ArrowRight className="ml-2 h-4 w-4" />
        </LinkButton>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {players.map((player, index) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8">
                {index === 0 && (
                  <Trophy className="h-6 w-6 text-yellow-500" />
                )}
                {index === 1 && (
                  <Trophy className="h-6 w-6 text-gray-400" />
                )}
                {index === 2 && (
                  <Trophy className="h-6 w-6 text-amber-600" />
                )}
                {index > 2 && (
                  <span className="text-body font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-12 w-12">
                <AvatarImage src={player.photo_url} />
                <AvatarFallback>
                  {player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-body font-semibold mb-1 group-hover:text-primary transition-colors">
                  {player.name}
                </h3>
                <div className="flex items-center gap-3 text-caption text-muted-foreground">
                  <span>{player.hands_count} hands</span>
                  <span>•</span>
                  <span>{player.tournament_count} tournaments</span>
                </div>
              </div>

              {/* Winnings */}
              <div className="text-right">
                <div className="flex items-center gap-1 text-body font-bold text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  ${player.total_winnings.toLocaleString()}
                </div>
                <div className="text-caption text-muted-foreground">
                  Total Winnings
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </section>
  )
}
