/**
 * Batch Hand Thumbnail Generator Script
 *
 * 모든 기존 핸드의 썸네일을 일괄 생성하는 스크립트
 *
 * Usage:
 *   npm run generate-thumbnails
 *   npm run generate-thumbnails -- --day-id=<day-id>
 */

import { createClient } from '@supabase/supabase-js'
import { generateHandThumbnail } from '../lib/thumbnail-generator'

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface Hand {
  id: string
  stream_id: string
  number: string
  timestamp: string
  thumbnail_url: string | null
}

interface Stream {
  id: string
  video_url: string | null
  video_file: string | null
  video_nas_path: string | null
}

/**
 * 진행률 표시
 */
function logProgress(current: number, total: number, status: string) {
  const percentage = Math.round((current / total) * 100)
  const bar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2))
  process.stdout.write(`\r[${bar}] ${percentage}% (${current}/${total}) - ${status}`)
}

/**
 * Day의 비디오 URL 가져오기
 */
function getVideoUrl(stream: Stream): string | null {
  return stream.video_url || stream.video_file || stream.video_nas_path || null
}

/**
 * 특정 Day의 모든 핸드 썸네일 생성
 */
async function generateThumbnailsForDay(dayId: string) {
  console.log(`\n📂 Day ${dayId}의 핸드 썸네일 생성 시작...\n`)

  // 1. Day (Stream) 정보 조회
  const { data: stream, error: streamError } = await supabase
    .from('streams')
    .select('id, video_url, video_file, video_nas_path')
    .eq('id', dayId)
    .single()

  if (streamError || !stream) {
    console.error(`❌ Day를 찾을 수 없습니다: ${streamError?.message}`)
    return { success: 0, failed: 0, skipped: 1 }
  }

  const videoUrl = getVideoUrl(stream)

  if (!videoUrl) {
    console.log(`⚠️  Day ${dayId}에 비디오 URL이 없습니다. 건너뜁니다.`)
    return { success: 0, failed: 0, skipped: 1 }
  }

  console.log(`✅ 비디오 URL: ${videoUrl}\n`)

  // 2. 해당 Day의 모든 핸드 조회
  const { data: hands, error: handsError } = await supabase
    .from('hands')
    .select('id, stream_id, number, timestamp, thumbnail_url')
    .eq('stream_id', dayId)
    .order('number', { ascending: true })

  if (handsError || !hands) {
    console.error(`❌ 핸드 조회 실패: ${handsError?.message}`)
    return { success: 0, failed: 0, skipped: 0 }
  }

  console.log(`📊 총 ${hands.length}개의 핸드 발견\n`)

  // 3. 썸네일이 없는 핸드만 처리
  const handsToProcess = hands.filter((h) => !h.thumbnail_url)
  console.log(`🔄 처리할 핸드: ${handsToProcess.length}개\n`)

  if (handsToProcess.length === 0) {
    console.log('✅ 모든 핸드에 이미 썸네일이 있습니다.')
    return { success: 0, failed: 0, skipped: hands.length }
  }

  // 4. 썸네일 생성
  const results = {
    success: 0,
    failed: 0,
    skipped: hands.length - handsToProcess.length,
    errors: [] as string[],
  }

  for (let i = 0; i < handsToProcess.length; i++) {
    const hand = handsToProcess[i]

    try {
      logProgress(i + 1, handsToProcess.length, `Hand #${hand.number} 처리 중...`)

      await generateHandThumbnail(
        hand.id,
        videoUrl,
        hand.timestamp
      )

      results.success++

    } catch (error) {
      results.failed++
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      results.errors.push(`Hand #${hand.number} (${hand.id}): ${errorMessage}`)
    }
  }

  console.log('\n\n')
  return results
}

/**
 * 모든 Day의 핸드 썸네일 생성
 */
async function generateAllThumbnails() {
  console.log('\n🚀 모든 핸드의 썸네일 생성 시작...\n')

  // 1. 비디오 URL이 있는 모든 Day 조회
  const { data: streams, error: streamsError } = await supabase
    .from('streams')
    .select('id, video_url, video_file, video_nas_path')
    .or('video_url.not.is.null,video_file.not.is.null,video_nas_path.not.is.null')

  if (streamsError || !streams) {
    console.error(`❌ Day 조회 실패: ${streamsError?.message}`)
    process.exit(1)
  }

  console.log(`📊 비디오가 있는 Day: ${streams.length}개\n`)

  const totalResults = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  }

  // 2. 각 Day 처리
  for (const stream of streams) {
    const results = await generateThumbnailsForDay(stream.id)

    totalResults.success += results.success
    totalResults.failed += results.failed
    totalResults.skipped += results.skipped
  }

  // 3. 최종 결과 출력
  console.log('\n' + '='.repeat(60))
  console.log('📊 최종 결과')
  console.log('='.repeat(60))
  console.log(`✅ 성공: ${totalResults.success}개`)
  console.log(`❌ 실패: ${totalResults.failed}개`)
  console.log(`⏭️  건너뜀: ${totalResults.skipped}개`)
  console.log('='.repeat(60) + '\n')

  if (totalResults.failed > 0) {
    console.log('\n❌ 실패한 핸드 목록:')
    totalResults.errors.forEach((err) => console.log(`  - ${err}`))
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  const args = process.argv.slice(2)
  const dayIdArg = args.find((arg) => arg.startsWith('--day-id='))

  if (dayIdArg) {
    // 특정 Day만 처리
    const dayId = dayIdArg.split('=')[1]
    const results = await generateThumbnailsForDay(dayId)

    console.log('\n' + '='.repeat(60))
    console.log('📊 결과')
    console.log('='.repeat(60))
    console.log(`✅ 성공: ${results.success}개`)
    console.log(`❌ 실패: ${results.failed}개`)
    console.log(`⏭️  건너뜀: ${results.skipped}개`)
    console.log('='.repeat(60) + '\n')

  } else {
    // 모든 Day 처리
    await generateAllThumbnails()
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('\n❌ 스크립트 실행 중 오류 발생:', error)
  process.exit(1)
})
