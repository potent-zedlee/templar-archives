#!/usr/bin/env tsx

/**
 * Supabase 연결 테스트 스크립트
 *
 * 사용법: npx tsx scripts/test-connection.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testConnection() {
  console.log('🔍 Supabase 연결 테스트 시작...\n')

  // 환경 변수 확인
  console.log('📋 환경 변수 확인:')
  console.log(`  - SUPABASE_URL: ${supabaseUrl ? '✅ 설정됨' : '❌ 없음'}`)
  console.log(`  - ANON_KEY: ${supabaseAnonKey ? '✅ 설정됨' : '❌ 없음'}`)
  console.log()

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.')
    console.error('   .env.local 파일을 확인해주세요.')
    process.exit(1)
  }

  // Supabase 클라이언트 생성
  console.log('🔌 Supabase 클라이언트 생성 중...')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  console.log('✅ 클라이언트 생성 완료\n')

  // 데이터베이스 연결 테스트 (간단한 쿼리 실행)
  console.log('🔍 데이터베이스 연결 테스트 중...')
  try {
    // tournaments 테이블에서 카운트 조회
    const { data: tournaments, error: tournamentsError, count: tournamentsCount } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })

    if (tournamentsError) {
      console.error('❌ tournaments 테이블 조회 실패:', tournamentsError.message)
    } else {
      console.log(`✅ tournaments 테이블 연결 성공 (${tournamentsCount || 0}개 레코드)`)
    }

    // players 테이블에서 카운트 조회
    const { data: players, error: playersError, count: playersCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })

    if (playersError) {
      console.error('❌ players 테이블 조회 실패:', playersError.message)
    } else {
      console.log(`✅ players 테이블 연결 성공 (${playersCount || 0}개 레코드)`)
    }

    // hands 테이블에서 카운트 조회
    const { data: hands, error: handsError, count: handsCount } = await supabase
      .from('hands')
      .select('*', { count: 'exact', head: true })

    if (handsError) {
      console.error('❌ hands 테이블 조회 실패:', handsError.message)
    } else {
      console.log(`✅ hands 테이블 연결 성공 (${handsCount || 0}개 레코드)`)
    }

    // users 테이블에서 카운트 조회
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (usersError) {
      console.error('❌ users 테이블 조회 실패:', usersError.message)
    } else {
      console.log(`✅ users 테이블 연결 성공 (${usersCount || 0}개 레코드)`)
    }

    // posts 테이블에서 카운트 조회
    const { data: posts, error: postsError, count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })

    if (postsError) {
      console.error('❌ posts 테이블 조회 실패:', postsError.message)
    } else {
      console.log(`✅ posts 테이블 연결 성공 (${postsCount || 0}개 레코드)`)
    }

    console.log()

    // 테이블 목록 조회 (PostgreSQL 시스템 테이블 조회)
    console.log('📊 데이터베이스 스키마 확인 중...')
    const { data: tables, error: tablesError } = await supabase.rpc('get_table_list')

    if (tablesError) {
      console.log('ℹ️  스키마 조회 함수가 없습니다. (정상 동작에는 문제 없음)')
    } else if (tables) {
      console.log('✅ 데이터베이스 스키마:')
      tables.forEach((table: any) => {
        console.log(`   - ${table.table_name}`)
      })
    }

    console.log()
    console.log('✅ 모든 연결 테스트 완료!')
    console.log()

  } catch (error) {
    console.error('❌ 연결 테스트 실패:', error)
    process.exit(1)
  }
}

// 스크립트 실행
testConnection()
  .then(() => {
    console.log('✅ 테스트 완료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 테스트 실패:', error)
    process.exit(1)
  })
