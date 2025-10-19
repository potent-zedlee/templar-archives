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
 * - Mobile Responsive (Phase 16-3)
 */

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Menu } from "lucide-react"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { useIsMobile } from "@/hooks/use-media-query"
import { ArchiveProviders } from "./_components/ArchiveProviders"
import { ArchiveToolbar } from "./_components/ArchiveToolbar"
import { ArchiveEventsList } from "./_components/ArchiveEventsList"
import { ArchiveHandHistory } from "./_components/ArchiveHandHistory"
import { ArchiveDialogs } from "./_components/ArchiveDialogs"

export default function ArchivePage() {
  // Zustand stores
  const { loadTournaments, loadUnsortedVideos, loading, selectedDay } = useArchiveDataStore()

  // Mobile responsive
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

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
            {isMobile ? (
              // Mobile Layout
              <>
                {!selectedDay ? (
                  // Only events list
                  <ArchiveEventsList />
                ) : (
                  // Hand history with drawer for events
                  <div className="space-y-4">
                    <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                      <DrawerTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Menu className="h-4 w-4 mr-2" />
                          Browse Tournaments
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>Select Tournament</DrawerTitle>
                        </DrawerHeader>
                        <div className="px-4 pb-6 max-h-[80vh] overflow-y-auto">
                          <ArchiveEventsList />
                        </div>
                      </DrawerContent>
                    </Drawer>

                    <ArchiveHandHistory />
                  </div>
                )}
              </>
            ) : (
              // Desktop Layout
              <>
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
              </>
            )}
          </div>

          {/* All Dialogs */}
          <ArchiveDialogs />
        </div>
      </ArchiveProviders>
    </ErrorBoundary>
  )
}
