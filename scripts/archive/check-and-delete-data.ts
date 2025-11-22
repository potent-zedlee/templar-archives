/**
 * Check and Delete Archive Data Script
 *
 * 실제 데이터베이스 상태를 확인하고 삭제합니다.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkData() {
  console.log('📊 데이터베이스 확인 중...\n')

  // Tournaments
  const { data: tournaments, error: tError } = await supabase
    .from('tournaments')
    .select('*')

  console.log('Tournaments:', tournaments?.length || 0, '개')
  if (tournaments && tournaments.length > 0) {
    tournaments.forEach((t: any) => {
      console.log(`  - ${t.name} (${t.id})`)
    })
  }

  // Sub Events
  const { data: subEvents, error: seError } = await supabase
    .from('sub_events')
    .select('*')

  console.log('\nSub Events:', subEvents?.length || 0, '개')
  if (subEvents && subEvents.length > 0) {
    subEvents.forEach((se: any) => {
      console.log(`  - ${se.name} (${se.id})`)
    })
  }

  // Days
  const { data: days, error: dError } = await supabase
    .from('days')
    .select('*')

  console.log('\nDays:', days?.length || 0, '개')
  if (days && days.length > 0) {
    days.forEach((d: any) => {
      console.log(`  - ${d.name} (${d.id})`)
    })
  }

  // Hands
  const { data: hands, error: hError } = await supabase
    .from('hands')
    .select('*')

  console.log('\nHands:', hands?.length || 0, '개')

  return {
    tournaments: tournaments?.length || 0,
    subEvents: subEvents?.length || 0,
    days: days?.length || 0,
    hands: hands?.length || 0,
  }
}

async function deleteAllData() {
  console.log('\n🗑️  모든 데이터 삭제 중...\n')

  // Delete tournaments (CASCADE will delete all related data)
  const { error: deleteError } = await supabase
    .from('tournaments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError)
    return false
  }

  console.log('✅ 모든 데이터 삭제 완료!')
  return true
}

async function main() {
  console.log('=' .repeat(60))
  console.log('🔍 Archive 데이터 확인 및 삭제')
  console.log('=' .repeat(60))
  console.log('')

  // 1. 현재 상태 확인
  const stats = await checkData()

  if (
    stats.tournaments === 0 &&
    stats.subEvents === 0 &&
    stats.days === 0 &&
    stats.hands === 0
  ) {
    console.log('\n✅ 데이터가 없습니다. 삭제할 필요가 없습니다.')
    process.exit(0)
  }

  // 2. 삭제 실행
  console.log('\n⚠️  3초 후 삭제를 시작합니다...')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  const success = await deleteAllData()

  if (success) {
    // 3. 삭제 후 확인
    console.log('\n📊 삭제 후 데이터 확인...\n')
    await checkData()
  }
}

main().catch((error) => {
  console.error('❌ 스크립트 실행 실패:', error)
  process.exit(1)
})
