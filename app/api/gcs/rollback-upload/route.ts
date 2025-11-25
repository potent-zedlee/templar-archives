/**
 * Rollback Upload API
 *
 * 업로드 실패 시 DB 상태를 롤백합니다.
 * - video_uploads.status → 'failed'
 * - streams.upload_status → 'none'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { uploadId, errorMessage } = await request.json()

    if (!uploadId) {
      return NextResponse.json({ error: 'uploadId required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. video_uploads에서 stream_id 조회
    const { data: upload, error: fetchError } = await supabase
      .from('video_uploads')
      .select('stream_id, status')
      .eq('id', uploadId)
      .single()

    if (fetchError || !upload) {
      console.log('[rollback-upload] Upload not found:', uploadId)
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    // 이미 완료되었거나 실패한 경우 롤백 스킵
    if (upload.status === 'completed' || upload.status === 'failed') {
      console.log('[rollback-upload] Upload already finalized:', upload.status)
      return NextResponse.json({ success: true, skipped: true })
    }

    // 2. video_uploads 상태를 'failed'로 업데이트
    const { error: uploadUpdateError } = await supabase
      .from('video_uploads')
      .update({
        status: 'failed',
        error_message: errorMessage || 'Upload failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', uploadId)

    if (uploadUpdateError) {
      console.error('[rollback-upload] Failed to update video_uploads:', uploadUpdateError)
    }

    // 3. streams.upload_status를 'none'으로 롤백
    const { error: streamUpdateError } = await supabase
      .from('streams')
      .update({ upload_status: 'none' })
      .eq('id', upload.stream_id)

    if (streamUpdateError) {
      console.error('[rollback-upload] Failed to update streams:', streamUpdateError)
    }

    console.log('[rollback-upload] Rollback completed for upload:', uploadId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[rollback-upload] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
