import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getServiceSupabaseClient } from '@/lib/supabase-service'
import { gcsClient } from '@/lib/gcs/client'

/**
 * video_uploads 조회 결과 타입
 * (DB 마이그레이션 후 database.types.ts에 자동 생성됨)
 */
interface VideoUploadRow {
  id: string
  stream_id: string
  gcs_path: string
  gcs_uri: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
}

/**
 * GCS 업로드 완료 콜백 API
 *
 * POST /api/gcs/complete-upload
 *
 * 요청 body:
 * - uploadId: string - 업로드 레코드 ID
 * - duration?: number - 영상 길이 (초, 선택사항)
 *
 * 응답:
 * - success: boolean
 * - gcsUri: string
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 2. 요청 body 파싱
    const body = await request.json()
    const { uploadId, duration } = body

    if (!uploadId) {
      return NextResponse.json(
        { error: 'uploadId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 3. video_uploads에서 uploadId로 조회
    // NOTE: video_uploads 테이블은 마이그레이션으로 생성 필요
    const serviceSupabase = getServiceSupabaseClient()
    const { data: rawUpload, error: fetchError } = await serviceSupabase
      .from('video_uploads' as 'streams')
      .select('id, stream_id, gcs_path, gcs_uri, status')
      .eq('id', uploadId)
      .single()

    if (fetchError || !rawUpload) {
      return NextResponse.json(
        { error: '업로드 레코드를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const upload = rawUpload as unknown as VideoUploadRow

    // 이미 완료된 경우
    if (upload.status === 'completed') {
      return NextResponse.json({
        success: true,
        gcsUri: upload.gcs_uri,
        message: '이미 완료된 업로드입니다.',
      })
    }

    // 4. GCS에서 파일 존재 확인 (재시도 로직)
    // 대용량 파일은 GCS에 완전히 반영되기까지 시간이 걸릴 수 있음
    let fileExists = false
    const maxRetries = 3
    const retryDelayMs = 2000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      fileExists = await gcsClient.fileExists(upload.gcs_path)
      if (fileExists) {
        console.log(`[GCS Complete Upload] 파일 존재 확인: 시도 ${attempt}/${maxRetries}`)
        break
      }
      if (attempt < maxRetries) {
        console.log(`[GCS Complete Upload] 파일 미발견, ${retryDelayMs}ms 후 재시도 (${attempt}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, retryDelayMs))
      }
    }

    if (!fileExists) {
      // 파일이 없으면 실패 상태로 업데이트
      await serviceSupabase
        .from('video_uploads' as 'streams')
        .update({
          status: 'failed',
          error_message: 'GCS에서 파일을 찾을 수 없습니다.',
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', uploadId)

      // streams.upload_status도 'failed'로 업데이트
      await serviceSupabase
        .from('streams')
        .update({ upload_status: 'failed' } as never)
        .eq('id', upload.stream_id)

      return NextResponse.json(
        { error: 'GCS에서 파일을 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    // 5. video_uploads 상태 업데이트 (completed)
    const { error: uploadUpdateError } = await serviceSupabase
      .from('video_uploads' as 'streams')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', uploadId)

    if (uploadUpdateError) {
      console.error('[GCS Complete Upload] video_uploads 업데이트 실패:', uploadUpdateError)
    }

    // 6. streams 테이블 업데이트
    // NOTE: gcs_uri, gcs_path, upload_status, video_duration 컬럼은 마이그레이션으로 추가 필요
    const streamUpdateData: Record<string, unknown> = {
      gcs_uri: upload.gcs_uri,
      gcs_path: upload.gcs_path,
      upload_status: 'uploaded',
    }

    // duration이 있으면 video_duration도 업데이트
    if (duration !== undefined && duration !== null) {
      streamUpdateData.video_duration = duration
    }

    const { error: streamUpdateError } = await serviceSupabase
      .from('streams')
      .update(streamUpdateData as never)
      .eq('id', upload.stream_id)

    if (streamUpdateError) {
      console.error('[GCS Complete Upload] streams 업데이트 실패:', streamUpdateError)
      // streams 업데이트 실패는 치명적이지 않으므로 계속 진행
    }

    console.log(`[GCS Complete Upload] 업로드 완료: uploadId=${uploadId}, gcsUri=${upload.gcs_uri}`)

    return NextResponse.json({
      success: true,
      gcsUri: upload.gcs_uri,
    })
  } catch (error) {
    console.error('[GCS Complete Upload] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
