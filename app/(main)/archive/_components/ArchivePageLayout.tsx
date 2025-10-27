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
import { useAuth } from "@/components/auth-provider"
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
import { ArchiveDayHeader } from "./ArchiveDayHeader"
import { VideoPlayer } from "@/components/video-player"
import { parseTimeToSeconds } from "@/lib/utils/time-parser"

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
  // 4.5. Selected Day Data (for VideoPlayer)
  // ============================================================
  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null

    for (const tournament of tournaments) {
      for (const subEvent of tournament.sub_events || []) {
        const day = subEvent.streams?.find((d: any) => d.id === selectedDay)
        if (day) return day
      }
    }
    return null
  }, [tournaments, selectedDay])

  // ============================================================
  // 5. Mobile Responsive
  // ============================================================
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ============================================================
  // 5.5. Video Player Seek State
  // ============================================================
  const [seekTime, setSeekTime] = useState<number | null>(null)

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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent animate-pulse delay-1000" />

        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6 relative z-10">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        {/* Animated background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <ArchiveDataProvider
          tournaments={tournaments}
          hands={hands}
          unsortedVideos={unsortedVideos}
          tournamentsLoading={tournamentsLoading}
          handsLoading={handsLoading}
        >
          <ArchiveProviders>
            <>
              {/* Toolbar */}
              <ArchiveToolbar />

              {/* Main Content */}
              <div className="container max-w-7xl mx-auto py-4 md:py-6 px-4 md:px-6 relative z-10">
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
                // Desktop Layout - Vertical Stack
                // ============================================================
                <div className="space-y-0">
                  {!selectedDay ? (
                    // Only Events List
                    <ArchiveEventsList />
                  ) : (
                    // Day selected: Day Header + Video Player + Hand History
                    <AnimatePresence mode="wait">
                      <motion.div
                        key="day-content"
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="space-y-4"
                      >
                        {/* Day Header - Sticky */}
                        <ArchiveDayHeader />

                        {/* Video Player - Sticky */}
                        <div className="sticky top-[72px] z-10 mb-4">
                          <VideoPlayer
                            day={selectedDayData}
                            seekTime={seekTime}
                          />
                        </div>

                        {/* Hand History - Scrollable */}
                        <ArchiveHandHistory
                          onSeekToTime={(timeString) => {
                            const seconds = parseTimeToSeconds(timeString)
                            setSeekTime(seconds)
                          }}
                        />
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              )}
            </div>

              {/* All Dialogs */}
              <ArchiveDialogs />
            </>
          </ArchiveProviders>
        </ArchiveDataProvider>
      </div>
    </ErrorBoundary>
  )
})
