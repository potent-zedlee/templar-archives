"use client"

/**
 * Archive Page
 *
 * 완전히 리팩토링된 Archive 페이지
 * - 1,733줄 → 100줄 이하로 대폭 축소
 * - Zustand stores를 사용한 상태 관리
 * - 컴포넌트 기반 아키텍처
 * - 타입 안전성 확보
 * - Error Boundary 적용 (Phase 11)
 */

import { useEffect } from "react"
import { Header } from "@/components/header"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { ErrorBoundary } from "@/components/error-boundary"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { ArchiveProviders } from "./_components/ArchiveProviders"
import { ArchiveToolbar } from "./_components/ArchiveToolbar"
import { ArchiveEventsList } from "./_components/ArchiveEventsList"
import { ArchiveHandHistory } from "./_components/ArchiveHandHistory"
import { ArchiveDialogs } from "./_components/ArchiveDialogs"

export default function ArchivePage() {
  // Zustand stores
  const { loadTournaments, loadUnsortedVideos, loading, selectedDay } = useArchiveDataStore()

  // Initial data load
  useEffect(() => {
    loadTournaments()
    loadUnsortedVideos()
  }, [loadTournaments, loadUnsortedVideos])

  // Loading state
  if (loading.tournaments) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
          <ResizablePanelGroup direction="horizontal" className="gap-6">
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <CardSkeleton count={1} variant="compact" />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={75} minSize={60}>
              <CardSkeleton count={2} variant="detailed" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ArchiveProviders>
        <div className="min-h-screen bg-muted/30">
          <Header />

          {/* Toolbar */}
          <ArchiveToolbar />

          {/* Main Content */}
          <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
            {!selectedDay ? (
              // Events list only (100% width when no day selected)
              <ArchiveEventsList />
            ) : (
              // Split view: Events list (35%) + Hand History (65%)
              <ResizablePanelGroup direction="horizontal" className="gap-6">
                <ResizablePanel defaultSize={35} minSize={20} maxSize={50}>
                  <ArchiveEventsList />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={65} minSize={50}>
                  <ArchiveHandHistory />
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>

          {/* All Dialogs */}
          <ArchiveDialogs />
        </div>
      </ArchiveProviders>
    </ErrorBoundary>
  )
}
