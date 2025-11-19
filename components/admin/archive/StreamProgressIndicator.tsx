/**
 * Stream Progress Indicator Component
 *
 * 스트림 분석 진행률 실시간 표시
 * - analysis_jobs 테이블 Realtime 구독
 * - Progress Bar 및 상태 표시
 */

'use client'

import { useEffect, useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface StreamProgressIndicatorProps {
  streamId: string
}

interface AnalysisJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  hands_found: number
  error_message?: string
}

const supabase = createClientSupabaseClient()

export function StreamProgressIndicator({ streamId }: StreamProgressIndicatorProps) {
  const [job, setJob] = useState<AnalysisJob | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. 현재 진행 중인 작업 확인
    async function checkAnalysisJob() {
      const { data, error } = await supabase
        .from('analysis_jobs')
        .select('id, status, progress, hands_found, error_message')
        .eq('stream_id', streamId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        setJob(data as AnalysisJob)
      }
      setLoading(false)
    }

    checkAnalysisJob()

    // 2. Realtime 구독
    const channel = supabase
      .channel(`stream-progress-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          const newJob = payload.new as AnalysisJob

          if (newJob && ['pending', 'processing'].includes(newJob.status)) {
            setJob(newJob)
          } else if (newJob && ['completed', 'failed'].includes(newJob.status)) {
            // 분석 완료/실패 시 job 제거 (진행률 숨김)
            setJob(null)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [streamId])

  if (loading || !job) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {/* Progress Badge */}
      {job.status === 'processing' && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          {job.progress}%
        </Badge>
      )}

      {job.status === 'pending' && (
        <Badge variant="outline" className="gap-1 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          대기 중
        </Badge>
      )}

      {/* Hands Found */}
      {job.hands_found > 0 && (
        <Badge variant="default" className="text-xs">
          {job.hands_found} hands
        </Badge>
      )}
    </div>
  )
}
