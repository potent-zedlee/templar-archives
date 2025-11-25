import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-service'

/**
 * video_uploads 상태 조회 결과 타입
 * (DB 마이그레이션 후 database.types.ts에 자동 생성됨)
 */
interface VideoUploadStatusRow {
  id: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number | null
  error_message: string | null
  created_at: string | null
  updated_at: string | null
  completed_at: string | null
}

/**
 * GCS 업로드 상태 조회 API
 *
 * GET /api/gcs/upload-status/[uploadId]
 *
 * 응답:
 * - status: 'pending' | 'uploading' | 'completed' | 'failed'
 * - progress: number (0-100)
 * - error_message?: string
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params

    if (!uploadId) {
      return NextResponse.json(
        { error: 'uploadId가 필요합니다.' },
        { status: 400 }
      )
    }

    // video_uploads 테이블에서 상태 조회
    // NOTE: video_uploads 테이블은 마이그레이션으로 생성 필요
    const serviceSupabase = getServiceSupabaseClient()
    const { data: rawUpload, error: fetchError } = await serviceSupabase
      .from('video_uploads' as 'streams')
      .select('id, status, progress, error_message, created_at, updated_at, completed_at')
      .eq('id', uploadId)
      .single()

    if (fetchError || !rawUpload) {
      return NextResponse.json(
        { error: '업로드 레코드를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const upload = rawUpload as unknown as VideoUploadStatusRow

    return NextResponse.json({
      id: upload.id,
      status: upload.status,
      progress: upload.progress ?? 0,
      error_message: upload.error_message,
      created_at: upload.created_at,
      updated_at: upload.updated_at,
      completed_at: upload.completed_at,
    })
  } catch (error) {
    console.error('[GCS Upload Status] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
