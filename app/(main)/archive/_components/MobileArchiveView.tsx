"use client"

/**
 * Mobile Archive View
 *
 * 모바일에서 토너먼트 목록을 카드 형태로 표시
 * - 터치 친화적 UI (최소 44px 터치 타겟)
 * - 카드 기반 레이아웃
 */

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Calendar,
  MapPin,
  Trophy,
  ChevronRight,
  Search
} from "lucide-react"
import { CategoryLogo } from "@/components/common/CategoryLogo"
import type { Tournament } from "@/lib/types/archive"

interface MobileArchiveViewProps {
  tournaments: Tournament[]
  isLoading?: boolean
}

export function MobileArchiveView({ tournaments, isLoading }: MobileArchiveViewProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // 검색 필터링
  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 핸드 수 계산
  const getTotalHands = (tournament: Tournament): number => {
    let total = 0
    tournament.events?.forEach(event => {
      event.streams?.forEach(stream => {
        total += stream.handCount || 0
      })
    })
    return total
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 bg-muted rounded w-3/4 mb-3" />
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-4 bg-muted rounded w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 - 검색 */}
      <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-3">
        <h1 className="text-xl font-bold">Archive</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="토너먼트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filteredTournaments.length}개 토너먼트</span>
        </div>
      </div>

      {/* 토너먼트 목록 */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredTournaments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>검색 결과가 없습니다</p>
            </div>
          ) : (
            filteredTournaments.map((tournament) => {
              const totalHands = getTotalHands(tournament)
              const eventCount = tournament.events?.length || 0

              return (
                <Link
                  key={tournament.id}
                  href={`/archive/tournament/${tournament.id}`}
                >
                  <Card className="hover:bg-accent transition-colors active:scale-[0.98]">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* 로고 */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          {tournament.category ? (
                            <CategoryLogo
                              category={tournament.category}
                              size="sm"
                            />
                          ) : (
                            <Trophy className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        {/* 정보 */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate pr-6">
                            {tournament.name}
                          </h3>

                          <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                            {tournament.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {tournament.location}
                              </span>
                            )}
                            {tournament.startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(tournament.startDate).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'short'
                                })}
                              </span>
                            )}
                          </div>

                          {/* 통계 뱃지 */}
                          <div className="flex gap-2 mt-3">
                            <Badge variant="secondary" className="text-xs">
                              {eventCount} Events
                            </Badge>
                            {totalHands > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {totalHands} Hands
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* 화살표 */}
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
