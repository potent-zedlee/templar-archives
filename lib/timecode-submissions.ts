/**
 * Timecode Submission Functions
 *
 * 타임코드 제출 관련 CRUD 함수
 */

import { createBrowserSupabaseClient } from '@/lib/supabase'

export interface TimecodeSubmission {
  id: string
  stream_id: string
  submitter_id: string
  submitter_name: string
  start_time: string
  end_time: string | null
  hand_number: string | null
  description: string | null
  status: 'pending' | 'approved' | 'ai_processing' | 'review' | 'completed' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  admin_comment: string | null
  ai_extracted_data: any | null
  ai_processing_error: string | null
  ai_processed_at: string | null
  final_hand_id: string | null
  created_at: string
  updated_at: string
  // Relations
  stream?: {
    id: string
    name: string
    video_url?: string
    video_source?: string
  }
  reviewer?: {
    id: string
    username: string
  }
}

export interface TimecodeSubmissionFilters {
  status?: string
  streamId?: string
  submitterId?: string
  limit?: number
  offset?: number
}

/**
 * 내 타임코드 제출 내역 조회
 */
export async function getMySubmissions(
  filters: TimecodeSubmissionFilters = {}
): Promise<{ data: TimecodeSubmission[] | null; error: Error | null }> {
  try {
    const supabase = createBrowserSupabaseClient()

    // 현재 유저 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: new Error('인증이 필요합니다') }
    }

    let query = supabase
      .from('timecode_submissions')
      .select(
        `
        *,
        stream:streams!timecode_submissions_stream_id_fkey (
          id,
          name,
          video_url,
          video_source
        )
      `
      )
      .eq('submitter_id', user.id)
      .order('created_at', { ascending: false })

    // 상태 필터
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    // 스트림 필터
    if (filters.streamId) {
      query = query.eq('stream_id', filters.streamId)
    }

    // 페이지네이션
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error }
    }

    return { data: data as TimecodeSubmission[], error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * 모든 타임코드 제출 내역 조회 (관리자 전용)
 */
export async function getAllSubmissions(
  filters: TimecodeSubmissionFilters = {}
): Promise<{ data: TimecodeSubmission[] | null; error: Error | null }> {
  try {
    const supabase = createBrowserSupabaseClient()

    let query = supabase
      .from('timecode_submissions')
      .select(
        `
        *,
        stream:streams!timecode_submissions_stream_id_fkey (
          id,
          name,
          video_url,
          video_source
        ),
        reviewer:users!timecode_submissions_reviewed_by_fkey (
          id,
          username
        )
      `
      )
      .order('created_at', { ascending: false })

    // 상태 필터
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    // 스트림 필터
    if (filters.streamId) {
      query = query.eq('stream_id', filters.streamId)
    }

    // 제출자 필터
    if (filters.submitterId) {
      query = query.eq('submitter_id', filters.submitterId)
    }

    // 페이지네이션
    if (filters.limit) {
      query = query.limit(filters.limit)
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error }
    }

    return { data: data as TimecodeSubmission[], error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * 특정 타임코드 제출 내역 조회
 */
export async function getSubmissionById(
  submissionId: string
): Promise<{ data: TimecodeSubmission | null; error: Error | null }> {
  try {
    const supabase = createBrowserSupabaseClient()

    const { data, error } = await supabase
      .from('timecode_submissions')
      .select(
        `
        *,
        stream:streams!timecode_submissions_stream_id_fkey (
          id,
          name,
          video_url,
          video_source
        ),
        reviewer:users!timecode_submissions_reviewed_by_fkey (
          id,
          username
        )
      `
      )
      .eq('id', submissionId)
      .single()

    if (error) {
      return { data: null, error }
    }

    return { data: data as TimecodeSubmission, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * 타임코드 제출 승인 (관리자 전용)
 */
export async function approveSubmission(
  submissionId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = createBrowserSupabaseClient()

    // 현재 유저 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: new Error('인증이 필요합니다') }
    }

    // 승인 처리
    const { error } = await supabase
      .from('timecode_submissions')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)

    if (error) {
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * 타임코드 제출 거부 (관리자 전용)
 */
export async function rejectSubmission(
  submissionId: string,
  adminComment: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = createBrowserSupabaseClient()

    // 현재 유저 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: new Error('인증이 필요합니다') }
    }

    // 거부 처리
    const { error } = await supabase
      .from('timecode_submissions')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_comment: adminComment,
      })
      .eq('id', submissionId)

    if (error) {
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * 타임코드 제출 삭제 (관리자 전용)
 */
export async function deleteSubmission(
  submissionId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = createBrowserSupabaseClient()

    const { error } = await supabase.from('timecode_submissions').delete().eq('id', submissionId)

    if (error) {
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error as Error }
  }
}

/**
 * 타임코드 제출 통계 조회 (관리자 전용)
 */
export async function getSubmissionStats(): Promise<{
  data: {
    total: number
    pending: number
    approved: number
    ai_processing: number
    review: number
    completed: number
    rejected: number
    today: number
    this_week: number
    this_month: number
  } | null
  error: Error | null
}> {
  try {
    const supabase = createBrowserSupabaseClient()

    const { data, error } = await supabase.rpc('get_timecode_submission_stats')

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * 상태별 배지 색상 반환
 */
export function getStatusBadgeColor(
  status: TimecodeSubmission['status']
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'pending':
      return 'secondary'
    case 'approved':
      return 'default'
    case 'ai_processing':
      return 'default'
    case 'review':
      return 'secondary'
    case 'completed':
      return 'default'
    case 'rejected':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * 상태별 라벨 반환
 */
export function getStatusLabel(status: TimecodeSubmission['status']): string {
  switch (status) {
    case 'pending':
      return '승인 대기'
    case 'approved':
      return '승인됨'
    case 'ai_processing':
      return 'AI 처리 중'
    case 'review':
      return '검수 대기'
    case 'completed':
      return '완료'
    case 'rejected':
      return '거부됨'
    default:
      return '알 수 없음'
  }
}
