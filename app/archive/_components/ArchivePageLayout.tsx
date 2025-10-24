"use client"

/**
 * Archive Page Layout
 *
 * Shared layout component for Tournament and Cash Game archive pages
 * Eliminates 99% code duplication between the two pages
 */

import { useState, useEffect, memo, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/components/auth-provider"
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
import { ArchiveDataProvider } from "./ArchiveDataContext"
import { ArchiveProviders } from "./ArchiveProviders"
import { ArchiveToolbar } from "./ArchiveToolbar"

// Dynamic imports for heavy components
const ArchiveEventsList = dynamic(
  () => import("./ArchiveEventsList").then(mod => ({ default: mod.ArchiveEventsList })),
  {
    ssr: false,
    loading: () => <CardSkeleton count={3} variant="compact" />
  }
)

const ArchiveHandHistory = dynamic(
  () => import("./ArchiveHandHistory").then(mod => ({ default: mod.ArchiveHandHistory })),
  {
    ssr: false,
    loading: () => <CardSkeleton count={2} variant="detailed" />
  }
)

const ArchiveDialogs = dynamic(
  () => import("./ArchiveDialogs").then(mod => ({ default: mod.ArchiveDialogs })),
  {
    ssr: false
  }
)

// Type definition
export type GameType = 'tournament' | 'cash-game'

interface ArchivePageLayoutProps {
  gameType: GameType
}

/**
 * Archive Page Layout Component
 *
 * @param gameType - 'tournament' or 'cash-game'
 */
export const ArchivePageLayout = memo(function ArchivePageLayout({
  gameType
}: ArchivePageLayoutProps) {
  // ============================================================
  // 1. Auth & User
  // ============================================================
  const { user } = useAuth()

  // ============================================================
  // 2. Data Fetching (React Query)
  // ============================================================
  const { data: tournaments = [], isLoading: tournamentsLoading } = useTournamentsQuery(gameType)
  const { data: unsortedVideos = [] } = useUnsortedVideosQuery()

  // ============================================================
  // 3. UI State (Zustand)
  // ============================================================
  const { selectedDay, setUserEmail } = useArchiveDataStore()

  // Set user email in store for admin checks
  useEffect(() => {
    setUserEmail(user?.email || null)
  }, [user, setUserEmail])

  // ============================================================
  // 4. Hands Data (React Query - depends on selectedDay)
  // ============================================================
  const { data: hands = [], isLoading: handsLoading } = useHandsQuery(selectedDay)

  // ============================================================
  // 5. Mobile Responsive
  // ============================================================
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ============================================================
  // 6. Dynamic Text (based on gameType)
  // ============================================================
  const browseButtonText = useMemo(() =>
    gameType === 'tournament' ? 'Browse Tournaments' : 'Browse Cash Games',
    [gameType]
  )

  const drawerTitle = useMemo(() =>
    gameType === 'tournament' ? 'Select Tournament' : 'Select Cash Game',
    [gameType]
  )

  // ============================================================
  // 7. Event Handlers
  // ============================================================
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open)
  }, [])

  // ============================================================
  // 8. Loading State
  // ============================================================
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

  // ============================================================
  // 9. Main Render
  // ============================================================
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
                // ============================================================
                // Mobile Layout
                // ============================================================
                <>
                  {!selectedDay ? (
                    // Only events list
                    <ArchiveEventsList />
                  ) : (
                    // Hand history with drawer for events
                    <div className="space-y-4">
                      <Drawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
                        <DrawerTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <Menu className="h-4 w-4 mr-2" />
                            {browseButtonText}
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <DrawerHeader>
                            <DrawerTitle>{drawerTitle}</DrawerTitle>
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
                // ============================================================
                // Desktop Layout
                // ============================================================
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
})
