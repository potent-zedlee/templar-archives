#!/usr/bin/env node
/**
 * 타입 정의와 실제 DB 스키마 간 불일치 검사
 * Phase 38: Type Definition & DB Schema Consistency Check
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// .env.local 로드
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// lib/types/archive.ts의 타입 정의 (예상 컬럼)
const TYPE_DEFINITIONS = {
  tournaments: {
    columns: ['id', 'name', 'category', 'category_id', 'category_logo', 'category_logo_url', 'location', 'city', 'country', 'game_type', 'start_date', 'end_date', 'total_prize', 'created_at', 'status', 'published_by', 'published_at'],
    deprecated: [],
    notes: '- year 필드는 없음 (start_date/end_date 사용)\n- total_prize는 tournaments가 아닌 sub_events에만 있을 가능성'
  },
  sub_events: {
    columns: ['id', 'tournament_id', 'name', 'date', 'event_number', 'total_prize', 'winner', 'buy_in', 'entry_count', 'blind_structure', 'level_duration', 'starting_stack', 'notes', 'created_at', 'status', 'published_by', 'published_at'],
    deprecated: [],
    notes: ''
  },
  streams: {
    columns: ['id', 'sub_event_id', 'name', 'description', 'video_url', 'video_file', 'video_nas_path', 'video_source', 'created_at', 'is_organized', 'organized_at', 'player_count', 'status', 'published_by', 'published_at'],
    deprecated: ['day_id'],
    notes: '- days 테이블에서 streams로 리네이밍됨\n- day_id는 deprecated (stream_id 사용)'
  },
  hands: {
    columns: ['id', 'day_id', 'number', 'description', 'summary', 'timestamp', 'board_cards', 'pot_size', 'confidence', 'favorite', 'thumbnail_url', 'likes_count', 'dislikes_count', 'created_at'],
    deprecated: [],
    notes: '- summary, confidence는 KAN 분석 결과에서 사용\n- day_id는 실제로는 stream의 id'
  },
  hand_players: {
    columns: ['id', 'hand_id', 'player_id', 'position', 'cards', 'stack_before', 'stack_after', 'created_at'],
    deprecated: [],
    notes: '- position은 실제 컬럼명이 poker_position일 수 있음\n- cards는 hole_cards일 수 있음\n- stack_before/after는 starting_stack/ending_stack일 수 있음'
  },
  players: {
    columns: ['id', 'name', 'name_lower', 'photo_url', 'country', 'total_winnings', 'created_at'],
    deprecated: [],
    notes: ''
  }
}

async function checkTable(tableName) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 ${tableName.toUpperCase()} 테이블 분석`)
  console.log('='.repeat(60))

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1)

  if (error) {
    console.error(`❌ 테이블 조회 실패:`, error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('⚠️  테이블에 데이터가 없습니다.')
    return
  }

  const actualColumns = Object.keys(data[0]).sort()
  const typeDef = TYPE_DEFINITIONS[tableName]

  if (!typeDef) {
    console.log('⚠️  타입 정의가 없습니다.')
    return
  }

  const expectedColumns = typeDef.columns.sort()

  console.log(`\n✅ 실제 DB 컬럼 (${actualColumns.length}개):`)
  console.log(`   ${actualColumns.join(', ')}`)

  console.log(`\n📝 타입 정의 컬럼 (${expectedColumns.length}개):`)
  console.log(`   ${expectedColumns.join(', ')}`)

  // 불일치 분석
  const missingInDB = expectedColumns.filter(c => !actualColumns.includes(c))
  const extraInDB = actualColumns.filter(c => !expectedColumns.includes(c))

  let hasIssues = false

  if (missingInDB.length > 0) {
    hasIssues = true
    console.log(`\n❌ 타입 정의에 있지만 DB에 없는 컬럼 (${missingInDB.length}개):`)
    missingInDB.forEach(col => {
      console.log(`   - ${col}`)
    })
    console.log(`\n   💡 수정 방안:`)
    console.log(`      1. lib/types/archive.ts에서 ${tableName} 인터페이스 수정`)
      console.log(`      2. 또는 마이그레이션 파일 추가하여 DB에 컬럼 추가`)
  }

  if (extraInDB.length > 0) {
    hasIssues = true
    console.log(`\n⚠️  DB에 있지만 타입 정의에 없는 컬럼 (${extraInDB.length}개):`)
    extraInDB.forEach(col => {
      console.log(`   - ${col}`)
    })
    console.log(`\n   💡 수정 방안:`)
    console.log(`      1. lib/types/archive.ts에 ${tableName} 인터페이스에 추가`)
    console.log(`      2. 또는 lib/database.types.ts 재생성 (supabase gen types)`)
  }

  if (typeDef.deprecated.length > 0) {
    console.log(`\n⏰ Deprecated 컬럼:`)
    typeDef.deprecated.forEach(col => {
      console.log(`   - ${col}`)
    })
  }

  if (typeDef.notes) {
    console.log(`\n📌 참고 사항:`)
    typeDef.notes.split('\n').forEach(note => {
      if (note.trim()) console.log(`   ${note}`)
    })
  }

  if (!hasIssues) {
    console.log(`\n✅ 타입 정의와 DB 스키마 일치!`)
  }
}

async function main() {
  console.log('╔═════════════════════════════════════════════════════════════╗')
  console.log('║  타입 정의 vs DB 스키마 불일치 분석                         ║')
  console.log('║  Phase 38: Type-Schema Consistency Check                   ║')
  console.log('╚═════════════════════════════════════════════════════════════╝')

  const tables = ['tournaments', 'sub_events', 'streams', 'hands', 'hand_players', 'players']

  for (const table of tables) {
    await checkTable(table)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎯 분석 완료')
  console.log('='.repeat(60))
  console.log('\n💡 다음 단계:')
  console.log('   1. lib/types/archive.ts 수정 (타입 정의)')
  console.log('   2. lib/database.types.ts 재생성 (npx supabase gen types typescript)')
  console.log('   3. 필요시 마이그레이션 파일 추가')
  console.log('   4. 코드에서 사용하는 필드명 확인 (grep으로 검색)\n')
}

main().catch(console.error)
