"use client"

/**
 * Archive Page Layout
 *
 * Shared layout component for Tournament and Cash Game archive pages
 * Uses Discovery Layout pattern with 3-column structure
 */

import { useState, useEffect, memo, useCallback } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/components/auth-provider"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageTransition } from "@/components/page-transition"
import { DiscoveryLayout } from "@/components/discovery-layout"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { useTournamentsQuery, useUnsortedVideosQuery, useHandsQuery } from "@/lib/queries/archive-queries"
import { ArchiveDataProvider } from "./ArchiveDataContext"
import { ArchiveProviders } from "./ArchiveProviders"
import { ArchiveSidebar } from "./ArchiveSidebar"
import { ArchiveMiddlePanel } from "./ArchiveMiddlePanel"
import { ArchiveMainPanel } from "./ArchiveMainPanel"

// Dynamic imports for heavy components
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
  // 5. Video Player Seek State
  // ============================================================
  const [seekTime, setSeekTime] = useState<number | null>(null)

  // ============================================================
  // 6. Event Handlers
  // ============================================================
  const handleSeekToTime = useCallback((seconds: number) => {
    setSeekTime(seconds)
  }, [])

  // ============================================================
  // 8. Loading State
  // ============================================================
  if (tournamentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CardSkeleton count={3} variant="compact" />
      </div>
    )
  }

  // ============================================================
  // 9. Main Render
  // ============================================================
  return (
    <ErrorBoundary>
      <PageTransition variant="slideUp">
        <ArchiveDataProvider
          tournaments={tournaments}
          hands={hands}
          unsortedVideos={unsortedVideos}
          tournamentsLoading={tournamentsLoading}
          handsLoading={handsLoading}
        >
          <ArchiveProviders>
            <>
              <DiscoveryLayout
                sidebar={<ArchiveSidebar gameType={gameType === 'tournament' ? 'tournament' : 'cash_game'} />}
                sidebarWidth="280px"
                middlePanel={<ArchiveMiddlePanel />}
                mainPanel={
                  <ArchiveMainPanel
                    seekTime={seekTime}
                    onSeekToTime={handleSeekToTime}
                  />
                }
              />

              {/* All Dialogs */}
              <ArchiveDialogs />
            </>
          </ArchiveProviders>
        </ArchiveDataProvider>
      </PageTransition>
    </ErrorBoundary>
  )
})
