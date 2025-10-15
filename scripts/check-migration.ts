import { createClient } from '@supabase/supabase-js'

async function checkMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase URL 또는 Service Role Key가 설정되지 않았습니다.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('\n🔍 현재 테이블 구조 확인 중...\n')

  try {
    // hands 테이블에서 샘플 데이터 가져오기 (pot_size, board_cards 컬럼 확인)
    const { data: handsData, error: handsError } = await supabase
      .from('hands')
      .select('*')
      .limit(1)

    if (handsError) {
      console.log('hands 테이블:', handsError.message)
    } else {
      console.log('✅ hands 테이블 구조:')
      if (handsData && handsData.length > 0) {
        console.log(Object.keys(handsData[0]).join(', '))
      } else {
        console.log('   (데이터 없음)')
      }
    }

    // hand_players 테이블 확인
    const { data: handPlayersData, error: handPlayersError } = await supabase
      .from('hand_players')
      .select('*')
      .limit(1)

    if (handPlayersError) {
      console.log('\nhand_players 테이블:', handPlayersError.message)
    } else {
      console.log('\n✅ hand_players 테이블 구조:')
      if (handPlayersData && handPlayersData.length > 0) {
        console.log(Object.keys(handPlayersData[0]).join(', '))
      } else {
        console.log('   (데이터 없음)')
      }
    }

    // hand_actions 테이블 확인
    const { data: handActionsData, error: handActionsError } = await supabase
      .from('hand_actions')
      .select('*')
      .limit(1)

    if (handActionsError) {
      console.log('\n⚠️  hand_actions 테이블:', handActionsError.message)
      console.log('\n❗ 마이그레이션이 아직 적용되지 않았습니다.')
      console.log('\n📋 다음 단계:')
      console.log('1. Supabase 대시보드 접속: ' + supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/'))
      console.log('2. SQL Editor 메뉴 선택')
      console.log('3. 아래 SQL 복사하여 실행:\n')
      console.log('--- SQL 시작 ---')

      const fs = require('fs')
      const path = require('path')
      const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '009_add_hand_details.sql'), 'utf-8')
      console.log(sql)
      console.log('--- SQL 끝 ---\n')
    } else {
      console.log('\n✅ hand_actions 테이블 구조:')
      if (handActionsData && handActionsData.length > 0) {
        console.log(Object.keys(handActionsData[0]).join(', '))
      } else {
        console.log('   (데이터 없음)')
      }
      console.log('\n✅ 모든 마이그레이션이 적용되었습니다!')
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error)
  }
}

checkMigration()
