"use client"

import { AnimatedCard } from "@/components/common/AnimatedCard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, MapPin, Trophy, Video, Hash } from "lucide-react"
import type { Tournament } from "@/lib/types/archive"

interface TournamentListItemProps {
  tournament: Tournament & {
    event_count?: number
    stream_count?: number
    hand_count?: number
  }
  onClick?: () => void
}

export function TournamentListItem({ tournament, onClick }: TournamentListItemProps) {
  const eventCount = tournament.events?.length || tournament.event_count || 0
  const streamCount = tournament.events?.reduce(
    (total, event) => total + (event.streams?.length || 0),
    0
  ) || tournament.stream_count || 0
  const handCount = tournament.hand_count || 0

  return (
    <button className="block w-full text-left" onClick={onClick}>
      <AnimatedCard>
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md hover:border-green-400 dark:hover:border-green-600 transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-16 h-16 rounded-lg border-2 border-muted">
                <AvatarImage
                  src={tournament.category_logo_url || `/logos/${tournament.category}.png`}
                  alt={tournament.name}
                />
                <AvatarFallback className="text-base font-semibold bg-muted text-foreground rounded-lg">
                  {tournament.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Tournament Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate mb-1">
                {tournament.name}
              </h3>

              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {/* Category Badge */}
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground text-xs font-medium rounded">
                  <Trophy className="h-3 w-3" />
                  {tournament.category}
                </div>

                {/* Location */}
                {tournament.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{tournament.location}</span>
                  </div>
                )}

                {/* Date */}
                {tournament.start_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {new Date(tournament.start_date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                      {tournament.end_date && tournament.end_date !== tournament.start_date && (
                        <> - {new Date(tournament.end_date).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric'
                        })}</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 flex-shrink-0">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Events</div>
                <div className="text-lg font-semibold text-foreground font-mono">
                  {eventCount}
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  <span>Streams</span>
                </div>
                <div className="text-lg font-semibold text-foreground font-mono">
                  {streamCount}
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  <span>Hands</span>
                </div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400 font-mono">
                  {handCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedCard>
    </button>
  )
}
