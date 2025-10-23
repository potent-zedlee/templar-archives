"use client"

/**
 * Archive Cash Game Page
 *
 * Cash Game 전용 Archive 페이지
 */

import { useState } from "react"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Menu } from "lucide-react"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { useTournamentsQuery, useUnsortedVideosQuery, useHandsQuery } from "@/lib/queries/archive-queries"
import { useIsMobile } from "@/hooks/use-media-query"
import { ArchiveDataProvider } from "../_components/ArchiveDataContext"
import { ArchiveProviders } from "../_components/ArchiveProviders"
import { ArchiveToolbar } from "../_components/ArchiveToolbar"

// Dynamic imports for heavy components
const ArchiveEventsList = dynamic(
  () => import("../_components/ArchiveEventsList").then(mod => ({ default: mod.ArchiveEventsList })),
  {
    ssr: false,
    loading: () => <CardSkeleton count={3} variant="compact" />
  }
)

const ArchiveHandHistory = dynamic(
  () => import("../_components/ArchiveHandHistory").then(mod => ({ default: mod.ArchiveHandHistory })),
  {
    ssr: false,
    loading: () => <CardSkeleton count={2} variant="detailed" />
  }
)

const ArchiveDialogs = dynamic(
  () => import("../_components/ArchiveDialogs").then(mod => ({ default: mod.ArchiveDialogs })),
  {
    ssr: false
  }
)

export default function CashGameArchivePage() {
  // React Query: Fetch data (only cash-game)
  const { data: tournaments = [], isLoading: tournamentsLoading } = useTournamentsQuery('cash-game')
  const { data: unsortedVideos = [] } = useUnsortedVideosQuery()

  // Zustand: UI state
  const { selectedDay } = useArchiveDataStore()

  // React Query: Fetch hands for selected day
  const { data: hands = [], isLoading: handsLoading } = useHandsQuery(selectedDay)

  // Mobile responsive
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Loading state
  if (tournamentsLoading) {
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
      <ArchiveDataProvider
        tournaments={tournaments}
        hands={hands}
        unsortedVideos={unsortedVideos}
        tournamentsLoading={tournamentsLoading}
        handsLoading={handsLoading}
      >
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
                          Browse Cash Games
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>Select Cash Game</DrawerTitle>
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
      </ArchiveDataProvider>
    </ErrorBoundary>
  )
}
