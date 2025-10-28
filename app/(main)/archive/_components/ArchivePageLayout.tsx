"use client"

/**
 * Archive Page Layout
 *
 * Shared layout component for Tournament and Cash Game archive pages
 * Eliminates 99% code duplication between the two pages
 */

import { useState, useEffect, memo, useCallback } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/components/auth-provider"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { ErrorBoundary } from "@/components/error-boundary"
import { useArchiveDataStore } from "@/stores/archive-data-store"
import { useTournamentsQuery, useUnsortedVideosQuery, useHandsQuery } from "@/lib/queries/archive-queries"
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
                <ArchiveEventsList
                  seekTime={seekTime}
                  onSeekToTime={handleSeekToTime}
                />
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
