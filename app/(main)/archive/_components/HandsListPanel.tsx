"use client"

/**
 * Hands List Panel
 *
 * 선택된 스트림의 핸드 리스트 표시
 * - 플레이어 이름 검색
 * - 페이지네이션
 * - HandListItem 재사용
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Inbox, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useHandsQuery } from '@/lib/queries/archive-queries'
import { HandListItem } from './HandListItem'
import { GridSkeleton } from '@/components/skeletons/grid-skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggerContainer, StaggerItem } from '@/components/page-transition'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import type { Stream } from '@/lib/supabase'

interface HandsListPanelProps {
  streamId: string
  stream: Stream
}

const HANDS_PER_PAGE = 20

export function HandsListPanel({ streamId, stream }: HandsListPanelProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // React Query
  const { data: hands = [], isLoading } = useHandsQuery(streamId)

  // Zustand Store
  const openAnalyzeDialog = useArchiveUIStore(state => state.openAnalyzeDialog)

  // 필터링
  const filteredHands = useMemo(() => {
    if (!searchQuery) return hands

    const query = searchQuery.toLowerCase()
    return hands.filter(hand =>
      hand.hand_players?.some(hp =>
        hp.player?.name?.toLowerCase().includes(query)
      )
    )
  }, [hands, searchQuery])

  // 페이지네이션
  const totalPages = Math.ceil(filteredHands.length / HANDS_PER_PAGE)
  const paginatedHands = useMemo(() => {
    const startIndex = (currentPage - 1) * HANDS_PER_PAGE
    return filteredHands.slice(startIndex, startIndex + HANDS_PER_PAGE)
  }, [filteredHands, currentPage])

  // 검색어 변경 시 1페이지로 리셋
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleHandClick = (handId: string) => {
    router.push(`/hands/${handId}`)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 w-full">
      {/* 헤더 + 검색바 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Hand History
          </h2>
          <button
            onClick={() => openAnalyzeDialog(stream)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            분석 시작
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="플레이어 이름 검색..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
          />
        </div>

        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {filteredHands.length} hands
          {searchQuery && ` (전체 ${hands.length})`}
        </div>
      </div>

      {/* 핸드 리스트 */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <GridSkeleton count={10} columns={1} />
          ) : paginatedHands.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={searchQuery ? "검색 결과 없음" : "핸드 없음"}
              description={
                searchQuery
                  ? "검색어를 변경해보세요"
                  : "이 스트림에는 아직 핸드가 없습니다."
              }
              variant="inline"
            />
          ) : (
            <StaggerContainer
              key={`${currentPage}-${filteredHands.length}`}
              className="space-y-2"
              staggerDelay={0.03}
            >
              {paginatedHands.map(hand => (
                <StaggerItem key={hand.id}>
                  <HandListItem
                    hand={hand}
                    onClick={() => handleHandClick(hand.id)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </ScrollArea>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page === 1 ||
                       page === totalPages ||
                       Math.abs(page - currentPage) <= 1
              })
              .map((page, index, arr) => {
                const showEllipsisBefore = index > 0 && page - arr[index - 1] > 1
                return (
                  <div key={page} className="flex items-center gap-2">
                    {showEllipsisBefore && (
                      <span className="text-gray-400 dark:text-gray-500">...</span>
                    )}
                    <button
                      className={
                        currentPage === page
                          ? "px-4 py-2 bg-green-600 dark:bg-green-700 text-white font-medium rounded-lg text-sm"
                          : "px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      }
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </div>
                )
              })}

            <button
              className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center mt-2 text-xs text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}
    </div>
  )
}
