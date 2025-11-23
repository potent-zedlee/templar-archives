"use client"

import { AnimatedCard } from "@/components/common/AnimatedCard"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, MapPin, Trophy } from "lucide-react"
import type { Tournament } from "@/lib/types/archive"

interface TournamentCardProps {
  tournament: Tournament & {
    event_count?: number
    stream_count?: number
    hand_count?: number
  }
  onClick?: () => void
}

export function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  // 이벤트, 스트림, 핸드 카운트 계산
  const eventCount = tournament.events?.length || tournament.event_count || 0
  const streamCount = tournament.events?.reduce(
    (total, event) => total + (event.streams?.length || 0),
    0
  ) || tournament.stream_count || 0
  const handCount = tournament.hand_count || 0

  return (
    <button className="block w-full text-left" onClick={onClick}>
      <AnimatedCard>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200 cursor-pointer">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-16 h-16 rounded-lg border-2 border-gray-100 dark:border-gray-700">
                <AvatarImage
                  src={tournament.category_logo_url || `/logos/${tournament.category}.png`}
                  alt={tournament.name}
                />
                <AvatarFallback className="text-base font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
                  {tournament.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                {tournament.name}
              </h3>

              {/* Category Badge */}
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded mb-2">
                <Trophy className="h-3 w-3" />
                {tournament.category}
              </div>
            </div>
          </div>

          {/* Location & Date */}
          <div className="space-y-1 mb-4">
            {tournament.location && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{tournament.location}</span>
              </div>
            )}
            {tournament.start_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Events</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono">
                {eventCount}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Streams</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono">
                {streamCount}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">Hands</span>
              <span className="text-lg font-semibold text-green-600 dark:text-green-400 font-mono">
                {handCount}
              </span>
            </div>
          </div>
        </div>
      </AnimatedCard>
    </button>
  )
}
