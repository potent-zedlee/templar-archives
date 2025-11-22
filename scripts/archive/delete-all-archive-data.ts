/**
 * Delete All Archive Data Script
 *
 * Archive의 모든 영상과 핸드 데이터를 일괄 삭제합니다.
 *
 * 삭제 대상:
 * - hands (핸드 데이터) - CASCADE로 자동 삭제
 * - days (영상 데이터)
 * - sub_events (서브 이벤트)
 * - tournaments (토너먼트)
 * - Supabase Storage 파일
 *
 * 실행 방법:
 * NEXT_PUBLIC_SUPABASE_URL=https://diopilmkehygiqpizvga.supabase.co \
 * SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 * npx tsx scripts/delete-all-archive-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkCurrentData() {
  console.log('📊 현재 데이터 확인 중...\n')

  const { data: hands, error: handsError } = await supabase
    .from('hands')
    .select('id', { count: 'exact', head: true })

  const { data: days, error: daysError } = await supabase
    .from('days')
    .select('id', { count: 'exact', head: true })

  const { data: subEvents, error: subEventsError } = await supabase
    .from('sub_events')
    .select('id', { count: 'exact', head: true })

  const { data: tournaments, error: tournamentsError } = await supabase
    .from('tournaments')
    .select('id', { count: 'exact', head: true })

  if (handsError || daysError || subEventsError || tournamentsError) {
    console.error('❌ 데이터 확인 실패:', {
      handsError,
      daysError,
      subEventsError,
      tournamentsError,
    })
    return null
  }

  const stats = {
    hands: hands || 0,
    days: days || 0,
    subEvents: subEvents || 0,
    tournaments: tournaments || 0,
  }

  console.log('현재 데이터:')
  console.log(`  - 토너먼트: ${stats.tournaments}개`)
  console.log(`  - 서브 이벤트: ${stats.subEvents}개`)
  console.log(`  - 영상 (Days): ${stats.days}개`)
  console.log(`  - 핸드: ${stats.hands}개`)
  console.log('')

  return stats
}

async function deleteStorageFiles() {
  console.log('🗑️  Supabase Storage 파일 삭제 중...')

  try {
    // 'videos' 버킷의 모든 파일 목록 가져오기
    const { data: files, error: listError } = await supabase.storage
      .from('videos')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (listError) {
      console.error('❌ 파일 목록 조회 실패:', listError.message)
      return { success: false, count: 0 }
    }

    if (!files || files.length === 0) {
      console.log('   ℹ️  삭제할 파일이 없습니다.')
      return { success: true, count: 0 }
    }

    console.log(`   📁 찾은 파일: ${files.length}개`)

    // 모든 파일 삭제
    const filePaths = files.map((file) => file.name)
    const { error: deleteError } = await supabase.storage
      .from('videos')
      .remove(filePaths)

    if (deleteError) {
      console.error('❌ 파일 삭제 실패:', deleteError.message)
      return { success: false, count: 0 }
    }

    console.log(`   ✅ ${files.length}개 파일 삭제 완료`)
    return { success: true, count: files.length }
  } catch (error) {
    console.error('❌ Storage 삭제 중 오류:', error)
    return { success: false, count: 0 }
  }
}

async function deleteAllData() {
  console.log('🗑️  모든 Archive 데이터 삭제 중...\n')

  try {
    // 1. Tournaments 삭제 (CASCADE로 모든 하위 데이터 자동 삭제)
    console.log('1️⃣ Tournaments 삭제 중...')
    const { error: tournamentsError } = await supabase
      .from('tournaments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 레코드 삭제

    if (tournamentsError) {
      console.error('❌ Tournaments 삭제 실패:', tournamentsError.message)
      return false
    }
    console.log('   ✅ Tournaments 삭제 완료 (CASCADE로 모든 하위 데이터 자동 삭제)')

    // 2. Storage 파일 삭제
    console.log('\n2️⃣ Supabase Storage 파일 삭제 중...')
    await deleteStorageFiles()

    console.log('\n✅ 모든 데이터 삭제 완료!')
    return true
  } catch (error) {
    console.error('❌ 삭제 중 오류 발생:', error)
    return false
  }
}

async function main() {
  console.log('=' .repeat(60))
  console.log('🗑️  Archive 데이터 일괄 삭제 스크립트')
  console.log('=' .repeat(60))
  console.log('')

  // 1. 현재 데이터 확인
  const stats = await checkCurrentData()
  if (!stats) {
    console.error('❌ 데이터 확인 실패')
    process.exit(1)
  }

  if (
    stats.tournaments === 0 &&
    stats.subEvents === 0 &&
    stats.days === 0 &&
    stats.hands === 0
  ) {
    console.log('ℹ️  삭제할 데이터가 없습니다.')
    process.exit(0)
  }

  // 2. 경고 메시지
  console.log('⚠️  경고: 다음 데이터가 영구적으로 삭제됩니다:')
  console.log(`   - 토너먼트 ${stats.tournaments}개`)
  console.log(`   - 서브 이벤트 ${stats.subEvents}개`)
  console.log(`   - 영상 ${stats.days}개`)
  console.log(`   - 핸드 ${stats.hands}개`)
  console.log(`   - Supabase Storage 파일`)
  console.log('')
  console.log('⏳ 5초 후 삭제를 시작합니다...')

  await new Promise((resolve) => setTimeout(resolve, 5000))

  // 3. 데이터 삭제
  const success = await deleteAllData()

  if (success) {
    // 4. 결과 확인
    console.log('\n📊 삭제 후 데이터 확인 중...\n')
    await checkCurrentData()

    console.log('\n✅ Archive 데이터 삭제가 완료되었습니다!')
    console.log('   이제 새로운 영상을 업로드할 수 있습니다.')
  } else {
    console.error('\n❌ 삭제 중 일부 오류가 발생했습니다.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ 스크립트 실행 실패:', error)
  process.exit(1)
})
