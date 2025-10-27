"use client"

/**
 * Archive Day Header
 *
 * Day 선택 시 상단에 고정되는 헤더 컴포넌트
 * - Sticky positioning (top: 0)
 * - Tournament › SubEvent › Day breadcrumb
 * - 닫기, 다운로드 버튼
 */

import { X, Download, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useArchiveDataStore } from '@/stores/archive-data-store'
import { useArchiveData } from './ArchiveDataContext'
import { useMemo } from 'react'

export function ArchiveDayHeader() {
  const { tournaments, hands } = useArchiveData()
  const { selectedDay, setSelectedDay } = useArchiveDataStore()

  // Get selected day data
  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null

    for (const tournament of tournaments) {
      for (const subEvent of tournament.sub_events || []) {
        const day = subEvent.streams?.find((d: import('@/lib/supabase').Stream) => d.id === selectedDay)
        if (day) {
          return {
            day,
            subEvent,
            tournament,
          }
        }
      }
    }
    return null
  }, [tournaments, selectedDay])

  // Build breadcrumb title
  const title = useMemo(() => {
    if (!selectedDayData) return 'Select a day'

    const parts = []
    if (selectedDayData.tournament.name) parts.push(selectedDayData.tournament.name)
    if (selectedDayData.subEvent.name) parts.push(selectedDayData.subEvent.name)
    if (selectedDayData.day.name) parts.push(selectedDayData.day.name)

    return parts.join(' › ') || 'Select a day'
  }, [selectedDayData])

  const handleClose = () => {
    setSelectedDay(null)
  }

  if (!selectedDayData) return null

  return (
    <div className="sticky top-0 z-20 mb-4">
      <Card className="p-5 backdrop-blur-xl bg-slate-950/95 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
              {title}
            </h2>
            {hands.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 backdrop-blur-md bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">{hands.length} hands</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              title="Download"
              className="backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 border-white/20 hover:border-white/30 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Download className="h-4 w-4 text-foreground/80" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              title="Close and return to list"
              className="backdrop-blur-md bg-white/10 dark:bg-black/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-foreground/80 hover:text-red-400 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
