'use client'

/**
 * Admin Archive Pipeline Dashboard
 *
 * 비디오 분석 파이프라인 워크플로우 대시보드
 * - 상태별 스트림 필터링 (Tabs)
 * - 스트림 목록 (Cards)
 * - 스트림 상세 정보 (Detail Panel)
 */

import { useState } from 'react'
import { PipelineTabs } from '@/components/admin/PipelineTabs'
import { StreamCard } from '@/components/admin/StreamCard'
import { StreamDetailPanel } from '@/components/admin/StreamDetailPanel'
import {
  useStreamsByPipelineStatus,
  usePipelineStatusCounts,
  useRetryAnalysis,
  useUpdatePipelineStatus,
  type PipelineStream
} from '@/lib/queries/admin-archive-queries'
import type { PipelineStatus } from '@/lib/types/archive'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

export default function AdminArchivePipelinePage() {
  const [activeTab, setActiveTab] = useState<PipelineStatus | 'all'>('all')
  const [selectedStream, setSelectedStream] = useState<PipelineStream | null>(null)

  // Queries
  const { data: counts, isLoading: countsLoading } = usePipelineStatusCounts()
  const { data: streams, isLoading: streamsLoading, error } = useStreamsByPipelineStatus(activeTab)

  // Mutations
  const retryMutation = useRetryAnalysis()
  const updateStatusMutation = useUpdatePipelineStatus()

  const handleRetry = (streamId: string) => {
    retryMutation.mutate(streamId)
  }

  const handleClassify = (streamId: string) => {
    // TODO: 분류 다이얼로그 열기
    console.log('Classify:', streamId)
  }

  const handleAnalyze = (streamId: string) => {
    updateStatusMutation.mutate({ streamId, status: 'analyzing' })
  }

  const handleReview = (streamId: string) => {
    // TODO: 리뷰 페이지로 이동
    console.log('Review:', streamId)
  }

  const handlePublish = (streamId: string) => {
    updateStatusMutation.mutate({ streamId, status: 'published' })
  }

  const isLoading = countsLoading || streamsLoading

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4 space-y-4">
          {/* Navigation */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin/archive"
              className="inline-flex items-center h-8 px-3 text-sm rounded-lg bg-transparent hover:bg-accent text-foreground focus:ring-ring transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              아카이브로 돌아가기
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-xl font-semibold">파이프라인 대시보드</h1>
          </div>

          {/* Pipeline Tabs */}
          <PipelineTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-muted-foreground">데이터를 불러오는데 실패했습니다</p>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Stream List */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {streams && streams.length > 0 ? (
                    streams.map((stream) => (
                      <StreamCard
                        key={stream.id}
                        stream={stream}
                        isSelected={selectedStream?.id === stream.id}
                        onSelect={setSelectedStream}
                        onRetry={handleRetry}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>이 상태의 스트림이 없습니다</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Detail Panel */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <StreamDetailPanel
                stream={selectedStream}
                onClose={() => setSelectedStream(null)}
                onClassify={handleClassify}
                onAnalyze={handleAnalyze}
                onReview={handleReview}
                onPublish={handlePublish}
                onRetry={handleRetry}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  )
}
