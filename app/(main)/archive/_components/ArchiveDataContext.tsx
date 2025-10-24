"use client"

/**
 * Archive Data Context
 *
 * React Query 데이터를 하위 컴포넌트에 전달하기 위한 Context
 */

import { createContext, useContext, ReactNode } from 'react'
import type { Tournament, Hand, UnsortedVideo } from '@/lib/types/archive'

interface ArchiveDataContextValue {
  tournaments: Tournament[]
  hands: Hand[]
  unsortedVideos: UnsortedVideo[]
  tournamentsLoading: boolean
  handsLoading: boolean
}

const ArchiveDataContext = createContext<ArchiveDataContextValue | null>(null)

interface ArchiveDataProviderProps {
  children: ReactNode
  tournaments: Tournament[]
  hands: Hand[]
  unsortedVideos: UnsortedVideo[]
  tournamentsLoading: boolean
  handsLoading: boolean
}

export function ArchiveDataProvider({
  children,
  tournaments,
  hands,
  unsortedVideos,
  tournamentsLoading,
  handsLoading,
}: ArchiveDataProviderProps) {
  return (
    <ArchiveDataContext.Provider
      value={{
        tournaments,
        hands,
        unsortedVideos,
        tournamentsLoading,
        handsLoading,
      }}
    >
      {children}
    </ArchiveDataContext.Provider>
  )
}

export function useArchiveData() {
  const context = useContext(ArchiveDataContext)
  if (!context) {
    throw new Error('useArchiveData must be used within ArchiveDataProvider')
  }
  return context
}
