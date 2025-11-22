/**
 * 모든 이벤트 데이터 삭제 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/delete-all-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 전달해주세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteAllData() {
  console.log('🗑️  모든 데이터 삭제 시작...\n')

  try {
    // 1. hand_players 삭제
    console.log('1/6: hand_players 삭제 중...')
    const { error: handPlayersError } = await supabase
      .from('hand_players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 모든 행 삭제

    if (handPlayersError) throw handPlayersError
    console.log('✅ hand_players 삭제 완료\n')

    // 2. hands 삭제
    console.log('2/6: hands 삭제 중...')
    const { error: handsError } = await supabase
      .from('hands')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (handsError) throw handsError
    console.log('✅ hands 삭제 완료\n')

    // 3. days 삭제
    console.log('3/6: days 삭제 중...')
    const { error: daysError } = await supabase
      .from('days')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (daysError) throw daysError
    console.log('✅ days 삭제 완료\n')

    // 4. sub_events 삭제
    console.log('4/6: sub_events 삭제 중...')
    const { error: subEventsError } = await supabase
      .from('sub_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (subEventsError) throw subEventsError
    console.log('✅ sub_events 삭제 완료\n')

    // 5. tournaments 삭제
    console.log('5/6: tournaments 삭제 중...')
    const { error: tournamentsError } = await supabase
      .from('tournaments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (tournamentsError) throw tournamentsError
    console.log('✅ tournaments 삭제 완료\n')

    // 6. players 삭제 (선택적)
    console.log('6/6: players 삭제 중...')
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (playersError) throw playersError
    console.log('✅ players 삭제 완료\n')

    console.log('🎉 모든 데이터가 성공적으로 삭제되었습니다!')

  } catch (error) {
    console.error('❌ 삭제 중 오류 발생:', error)
    process.exit(1)
  }
}

deleteAllData()
