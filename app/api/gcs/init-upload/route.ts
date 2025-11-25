import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getServiceSupabaseClient } from '@/lib/supabase-service'
import { gcsClient } from '@/lib/gcs/client'

/**
 * video_uploads 테이블 레코드 타입
 * (DB 마이그레이션 후 database.types.ts에 자동 생성됨)
 */
interface VideoUploadInsert {
  stream_id: string
  user_id: string
  filename: string
  file_size: number
  content_type: string
  gcs_path: string
  gcs_uri: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
}

/**
 * GCS 업로드 세션 시작 API
 *
 * POST /api/gcs/init-upload
 *
 * 요청 body:
 * - streamId: string - 스트림 ID
 * - filename: string - 파일명
 * - fileSize: number - 파일 크기 (bytes)
 * - contentType: string - MIME 타입 (예: "video/mp4")
 *
 * 응답:
 * - uploadUrl: string - Resumable Upload URL
 * - uploadId: string - 업로드 레코드 ID
 * - gcsUri: string - GCS URI (gs://bucket/path)
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
    const { streamId, filename, fileSize, contentType } = body

    if (!streamId || !filename || !fileSize || !contentType) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다: streamId, filename, fileSize, contentType' },
        { status: 400 }
      )
    }

    // 3. streamId 유효성 검증
    const serviceSupabase = getServiceSupabaseClient()
    const { data: stream, error: streamError } = await serviceSupabase
      .from('streams')
      .select('id, name, upload_status')
      .eq('id', streamId)
      .single()

    if (streamError || !stream) {
      return NextResponse.json(
        { error: '유효하지 않은 스트림 ID입니다.' },
        { status: 404 }
      )
    }

    // 3.5. 오래된 uploading 상태 정리 (5분 이상 된 항목)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // 같은 stream에서 5분 이상 된 uploading 상태의 video_uploads를 failed로 변경
    const { error: cleanupError } = await serviceSupabase
      .from('video_uploads' as 'streams')
      .update({
        status: 'failed',
        error_message: 'Superseded by new upload',
        completed_at: new Date().toISOString(),
      } as never)
      .eq('stream_id', streamId)
      .eq('status', 'uploading')
      .lt('created_at', fiveMinutesAgo)

    if (cleanupError) {
      console.log('[GCS Init Upload] Stale upload cleanup failed:', cleanupError)
    } else {
      console.log('[GCS Init Upload] Cleaned up stale uploads for stream:', streamId)
    }

    // streams.upload_status가 'uploading'이지만 활성 video_uploads가 없으면 'none'으로 리셋
    const { data: activeUploads } = await serviceSupabase
      .from('video_uploads' as 'streams')
      .select('id')
      .eq('stream_id', streamId)
      .eq('status', 'uploading')

    if ((!activeUploads || activeUploads.length === 0) && stream.upload_status === 'uploading') {
      await serviceSupabase
        .from('streams')
        .update({ upload_status: 'none' } as never)
        .eq('id', streamId)
      console.log('[GCS Init Upload] Reset stale stream upload_status to none:', streamId)
    }

    // 4. GCS 경로 생성: uploads/{streamId}/{timestamp}_{filename}
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const gcsPath = `uploads/${streamId}/${timestamp}_${sanitizedFilename}`

    // 5. GCS Resumable Upload 세션 초기화
    const { uploadUrl, gcsUri } = await gcsClient.initResumableUpload(
      gcsPath,
      contentType
    )

    // 6. video_uploads 테이블에 레코드 생성
    // NOTE: video_uploads 테이블은 마이그레이션으로 생성 필요
    const uploadData: VideoUploadInsert = {
      stream_id: streamId,
      user_id: user.id,
      filename: filename,
      file_size: fileSize,
      content_type: contentType,
      gcs_path: gcsPath,
      gcs_uri: gcsUri,
      status: 'uploading',
      progress: 0,
    }

    const { data: uploadRecord, error: insertError } = await serviceSupabase
      .from('video_uploads' as 'streams') // 타입 단언: 테이블이 아직 types에 없음
      .insert(uploadData as never)
      .select('id')
      .single()

    if (insertError) {
      console.error('[GCS Init Upload] video_uploads 생성 실패:', insertError)
      return NextResponse.json(
        { error: '업로드 레코드 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 7. streams 테이블 upload_status 업데이트
    // NOTE: upload_status 컬럼은 마이그레이션으로 추가 필요
    const { error: updateError } = await serviceSupabase
      .from('streams')
      .update({ upload_status: 'uploading' } as never)
      .eq('id', streamId)

    if (updateError) {
      console.error('[GCS Init Upload] streams 업데이트 실패:', updateError)
      // 실패해도 업로드는 진행 가능하므로 에러를 throw하지 않음
    }

    const recordId = (uploadRecord as { id: string })?.id
    console.log(`[GCS Init Upload] 세션 생성 완료: uploadId=${recordId}, gcsUri=${gcsUri}`)

    return NextResponse.json({
      uploadUrl,
      uploadId: recordId,
      gcsUri,
    })
  } catch (error) {
    console.error('[GCS Init Upload] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
