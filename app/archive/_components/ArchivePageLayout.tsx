"use client"

/**
 * Archive Page Layout
 *
 * Shared layout component for Tournament and Cash Game archive pages
 * Eliminates 99% code duplication between the two pages
 */

import { useState, useEffect, memo, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { useAuth } from "@/components/auth-provider"
import { Header } from "@/components/header"
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
          <div className="flex gap-6">
            <div className="w-[35%]">
              <CardSkeleton count={1} variant="compact" />
            </div>
            <div className="flex-1">
              <CardSkeleton count={2} variant="detailed" />
            </div>
          </div>
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
            <div className="container max-w-7xl mx-auto py-4 md:py-6 px-4 md:px-6">
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

                      <AnimatePresence mode="wait">
                        {selectedDay && (
                          <motion.div
                            key="mobile-hand-history"
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <ArchiveHandHistory />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </>
              ) : (
                // ============================================================
                // Desktop Layout - Resizable Split Pane
                // ============================================================
                <PanelGroup direction="horizontal" className="gap-6">
                  {/* Events List Panel */}
                  <Panel
                    defaultSize={selectedDay ? 35 : 100}
                    minSize={25}
                    maxSize={75}
                  >
                    <ArchiveEventsList />
                  </Panel>

                  {/* Resizable Handle (only visible when hand history is shown) */}
                  {selectedDay && (
                    <>
                      <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />

                      {/* Hand History Panel */}
                      <Panel
                        defaultSize={65}
                        minSize={25}
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key="hand-history"
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="h-full"
                          >
                            <ArchiveHandHistory />
                          </motion.div>
                        </AnimatePresence>
                      </Panel>
                    </>
                  )}
                </PanelGroup>
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
