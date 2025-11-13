/**
 * HAE Analysis Queries
 * React Query hooks for HAE analysis jobs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'

type AnalysisJob = Database['public']['Tables']['analysis_jobs']['Row']
type AnalysisJobInsert = Database['public']['Tables']['analysis_jobs']['Insert']

export interface AnalysisJobWithRelations extends AnalysisJob {
  video?: {
    id: string
    url: string
    youtube_id: string | null
    title: string | null
  }
  stream?: {
    id: string
    name: string
    tournament_id: string
  }
  creator?: {
    id: string
    email: string
    username: string | null
  }
}

// ============================================
// Query Keys
// ============================================

export const haeQueryKeys = {
  all: ['hae'] as const,
  jobs: () => [...haeQueryKeys.all, 'jobs'] as const,
  job: (id: string) => [...haeQueryKeys.jobs(), id] as const,
  activeJobs: () => [...haeQueryKeys.jobs(), 'active'] as const,
  historyJobs: () => [...haeQueryKeys.jobs(), 'history'] as const,
}

// ============================================
// Query Functions
// ============================================

/**
 * Get single analysis job
 */
async function getAnalysisJob(jobId: string): Promise<AnalysisJobWithRelations | null> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('analysis_jobs')
    .select(`
      *,
      video:videos(id, url, youtube_id, title),
      stream:streams(id, name, tournament_id),
      creator:users!analysis_jobs_created_by_fkey(id, email, username)
    `)
    .eq('id', jobId)
    .single()

  if (error) {
    console.error('[getAnalysisJob] Error:', error)
    throw error
  }

  return data
}

/**
 * Get active analysis jobs (pending or processing)
 */
async function getActiveAnalysisJobs(): Promise<AnalysisJobWithRelations[]> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('analysis_jobs')
    .select(`
      *,
      video:videos(id, url, youtube_id, title),
      stream:streams(id, name, tournament_id),
      creator:users!analysis_jobs_created_by_fkey(id, email, username)
    `)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getActiveAnalysisJobs] Error:', error)
    throw error
  }

  return data || []
}

/**
 * Get analysis job history (completed or failed)
 */
interface GetHistoryJobsOptions {
  page?: number
  limit?: number
  status?: 'completed' | 'failed' | 'all'
}

async function getHistoryAnalysisJobs(
  options: GetHistoryJobsOptions = {}
): Promise<{
  jobs: AnalysisJobWithRelations[]
  total: number
  hasMore: boolean
}> {
  const { page = 1, limit = 20, status = 'all' } = options
  const supabase = createClientSupabaseClient()

  let query = supabase
    .from('analysis_jobs')
    .select(`
      *,
      video:videos(id, url, youtube_id, title),
      stream:streams(id, name, tournament_id),
      creator:users!analysis_jobs_created_by_fkey(id, email, username)
    `, { count: 'exact' })

  // Filter by status
  if (status === 'completed') {
    query = query.eq('status', 'completed')
  } else if (status === 'failed') {
    query = query.eq('status', 'failed')
  } else {
    query = query.in('status', ['completed', 'failed'])
  }

  // Pagination
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[getHistoryAnalysisJobs] Error:', error)
    throw error
  }

  return {
    jobs: data || [],
    total: count || 0,
    hasMore: count ? count > to + 1 : false,
  }
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Get single job
 */
export function useAnalysisJob(jobId: string | null) {
  return useQuery({
    queryKey: haeQueryKeys.job(jobId || ''),
    queryFn: () => getAnalysisJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data
      // Refetch every 2 seconds if job is active
      if (job && (job.status === 'pending' || job.status === 'processing')) {
        return 2000
      }
      return false
    },
  })
}

/**
 * Get active jobs (auto-refresh every 2 seconds)
 */
export function useActiveJobs() {
  return useQuery({
    queryKey: haeQueryKeys.activeJobs(),
    queryFn: getActiveAnalysisJobs,
    refetchInterval: 2000, // Auto-refresh every 2 seconds
  })
}

/**
 * Get history jobs
 */
export function useHistoryJobs(options: GetHistoryJobsOptions = {}) {
  return useQuery({
    queryKey: [...haeQueryKeys.historyJobs(), options],
    queryFn: () => getHistoryAnalysisJobs(options),
  })
}

// ============================================
// Mutations
// ============================================

/**
 * Retry failed job
 */
export function useRetryJobMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const supabase = createClientSupabaseClient()

      // Get original job data
      const { data: job, error: fetchError } = await supabase
        .from('analysis_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (fetchError) throw fetchError

      // Reset job status
      const { error: updateError } = await supabase
        .from('analysis_jobs')
        .update({
          status: 'pending',
          progress: 0,
          hands_found: 0,
          error_message: null,
          result: null,
          started_at: null,
          completed_at: null,
          processing_time: null,
        })
        .eq('id', jobId)

      if (updateError) throw updateError

      return jobId
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: haeQueryKeys.jobs() })
      toast.success('작업이 재시작되었습니다')
    },
    onError: (error) => {
      console.error('[useRetryJobMutation] Error:', error)
      toast.error('작업 재시작 실패')
    },
  })
}

/**
 * Cancel running job
 */
export function useCancelJobMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from('analysis_jobs')
        .update({
          status: 'failed',
          error_message: '사용자가 취소했습니다',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      if (error) throw error

      return jobId
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: haeQueryKeys.jobs() })
      toast.success('작업이 취소되었습니다')
    },
    onError: (error) => {
      console.error('[useCancelJobMutation] Error:', error)
      toast.error('작업 취소 실패')
    },
  })
}
