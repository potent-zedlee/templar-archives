"use client"

/**
 * Archive Navigation Sidebar
 *
 * Tournament → SubEvent → Stream 3-level 네비게이션 사이드바
 * - Nested Accordion 구조
 * - 스트림 선택 시 우측 패널에 핸드 리스트 표시
 */

import { useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Trophy, Video, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tournament } from '@/lib/types/archive'
import type { Stream } from '@/lib/supabase'

interface ArchiveNavigationSidebarProps {
  tournaments: Tournament[]
  selectedStreamId: string | null
  onStreamSelect: (streamId: string, stream: Stream) => void
}

export function ArchiveNavigationSidebar({
  tournaments,
  selectedStreamId,
  onStreamSelect,
}: ArchiveNavigationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // 검색 필터링
  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* 검색바 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="토너먼트/이벤트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="archive-search"
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
          />
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          {filteredTournaments.length} tournaments
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <Accordion type="single" collapsible className="space-y-1">
            {filteredTournaments.map(tournament => (
              <AccordionItem
                key={tournament.id}
                value={tournament.id}
                className="border-none"
              >
                {/* Tournament Header */}
                <AccordionTrigger className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md hover:no-underline">
                  <div className="flex items-center gap-2 text-left w-full">
                    <Avatar className="w-8 h-8 rounded">
                      <AvatarImage src={tournament.category_logo_url} alt={tournament.name} />
                      <AvatarFallback className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {tournament.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                        {tournament.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {tournament.events?.length || 0} events
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                {/* Events (Nested Accordion) */}
                <AccordionContent className="pl-4 pt-1 pb-0">
                  {tournament.events && tournament.events.length > 0 ? (
                    <Accordion type="single" collapsible className="space-y-1">
                      {tournament.events.map(event => (
                        <AccordionItem
                          key={event.id}
                          value={event.id}
                          className="border-none"
                        >
                          {/* Event Header */}
                          <AccordionTrigger className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md text-sm hover:no-underline">
                            <div className="flex items-center gap-2 text-left w-full">
                              <Trophy className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-gray-900 dark:text-gray-100">
                                  {event.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {event.streams?.length || 0} streams
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>

                          {/* Streams (List) */}
                          <AccordionContent className="pl-4 pt-1 pb-0">
                            {event.streams && event.streams.length > 0 ? (
                              <div className="space-y-1">
                                {event.streams.map(stream => {
                                  const handCount = 0 // TODO: hand_count 필드 추가 필요

                                  return (
                                    <button
                                      key={stream.id}
                                      onClick={() => onStreamSelect(stream.id, stream)}
                                      data-testid="stream-item"
                                      className={cn(
                                        "w-full px-3 py-2 text-left rounded-md text-sm transition-colors",
                                        selectedStreamId === stream.id
                                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium"
                                          : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Video className="w-4 h-4 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="truncate">{stream.name}</div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {handCount} hands
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                                스트림 없음
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      이벤트 없음
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {filteredTournaments.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
