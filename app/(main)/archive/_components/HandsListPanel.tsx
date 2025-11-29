"use client"

/**
 * Hands List Panel
 *
 * 선택된 스트림의 핸드 리스트 표시
 * - YouTube 플레이어 통합 (상단 고정)
 * - 핸드 타임라인 오버레이
 * - 핸드 클릭 시 플레이어 타임코드 이동
 * - 플레이어 이름 검색
 * - 페이지네이션
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Inbox, ChevronLeft, ChevronRight } from 'lucide-react'
import { useHandsQuery } from '@/lib/queries/archive-queries'
import { HandListItem } from './HandListItem'
import { HandDetailDialog } from './HandDetailDialog'
import { HandTimelineOverlay } from './HandTimelineOverlay'
import { GridSkeleton } from '@/components/ui/skeletons/GridSkeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { StaggerContainer, StaggerItem } from '@/components/layout/PageTransition'
import { YouTubePlayer, type YouTubePlayerHandle } from '@/components/features/video/YouTubePlayer'
import type { Hand, Stream } from '@/lib/types/archive'

interface HandsListPanelProps {
  streamId: string
  stream: Stream
}

const HANDS_PER_PAGE = 20

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

export function HandsListPanel({ streamId, stream }: HandsListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedHand, setSelectedHand] = useState<Hand | null>(null)
  const [detailHandId, setDetailHandId] = useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const playerRef = useRef<YouTubePlayerHandle>(null)

  // Video player state
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  // React Query
  const { data: hands = [], isLoading } = useHandsQuery(streamId)


  // YouTube Video ID
  const videoId = useMemo(() => extractVideoId(stream.video_url), [stream.video_url])

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

  /**
   * 핸드 클릭 핸들러
   * - 핸드 선택 상태 업데이트
   * - YouTube 플레이어를 해당 타임코드로 이동
   */
  const handleHandClick = (hand: Hand) => {
    setSelectedHand(hand)

    // YouTube 플레이어가 있고 타임스탬프가 있으면 해당 시간으로 이동
    if (playerRef.current && hand.video_timestamp_start) {
      playerRef.current.seekTo(hand.video_timestamp_start)
    }
  }

  /**
   * 핸드 상세 다이얼로그 열기
   */
  const handleHandDetail = (handId: string) => {
    setDetailHandId(handId)
    setDetailDialogOpen(true)
  }

  /**
   * 타임라인에서 시간 이동
   */
  const handleTimelineSeek = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time)
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-background w-full">
      {/* YouTube 플레이어 + 타임라인 (상단 고정) */}
      {videoId && (
        <div className="sticky top-0 z-10 bg-card border-b border-border p-4 space-y-3">
          <YouTubePlayer
            ref={playerRef}
            videoId={videoId}
            startTime={selectedHand?.video_timestamp_start}
            onTimeUpdate={setCurrentTime}
            onDurationChange={setVideoDuration}
            className="w-full"
          />

          {/* 핸드 타임라인 오버레이 */}
          {videoDuration > 0 && hands.length > 0 && (
            <HandTimelineOverlay
              hands={hands}
              videoDuration={videoDuration}
              currentTime={currentTime}
              onSeek={handleTimelineSeek}
              selectedHandId={selectedHand?.id}
            />
          )}
        </div>
      )}

      {/* 헤더 + 검색바 */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">
            Hand History
            {selectedHand && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                - Hand #{selectedHand.number}
              </span>
            )}
          </h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="플레이어 이름 검색..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
          />
        </div>

        <div className="mt-2 text-sm text-muted-foreground">
          {filteredHands.length} hands
          {searchQuery && ` (전체 ${hands.length})`}
        </div>
      </div>

      {/* 핸드 리스트 */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <GridSkeleton count={10} />
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
                    onClick={() => handleHandClick(hand)}
                    onDetailClick={() => handleHandDetail(hand.id)}
                    isSelected={selectedHand?.id === hand.id}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </ScrollArea>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="bg-card border-t border-border p-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              className="p-2 bg-card border border-border text-foreground rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      <span className="text-muted-foreground">...</span>
                    )}
                    <button
                      className={
                        currentPage === page
                          ? "px-4 py-2 bg-green-600 dark:bg-green-700 text-white font-medium rounded-lg text-sm"
                          : "px-4 py-2 bg-card border border-border text-foreground font-medium rounded-lg text-sm hover:bg-accent transition-colors"
                      }
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </div>
                )
              })}

            <button
              className="p-2 bg-card border border-border text-foreground rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center mt-2 text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      )}

      {/* 핸드 상세 다이얼로그 */}
      <HandDetailDialog
        handId={detailHandId}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  )
}
