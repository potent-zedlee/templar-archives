import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  // Supabase 클라이언트 생성 (Service Role Key 사용)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase URL 또는 Service Role Key가 설정되지 않았습니다.')
    console.error('   .env.local 파일을 확인해주세요.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  // 마이그레이션 파일 읽기
  const migrationFile = process.argv[2] || '009_add_hand_details.sql'
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)

  console.log(`\n📁 마이그레이션 파일: ${migrationFile}`)

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ 마이그레이션 파일을 찾을 수 없습니다: ${migrationPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log(`\n🚀 마이그레이션 실행 중...\n`)
  console.log('--- SQL ---')
  console.log(sql)
  console.log('--- --- ---\n')

  try {
    // SQL 실행 (Supabase의 RPC 함수 사용)
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // exec_sql RPC가 없으면 직접 실행 시도
      if (error.message.includes('function public.exec_sql')) {
        console.log('⚠️  exec_sql RPC 함수가 없습니다. SQL Editor에서 수동 실행이 필요합니다.')
        console.log('\n📋 Supabase 대시보드 > SQL Editor에서 아래 SQL을 실행해주세요:')
        console.log('\n' + sql + '\n')

        // 마이그레이션 기록 저장 시도
        await recordMigration(supabase, migrationFile)
      } else {
        throw error
      }
    } else {
      console.log('✅ 마이그레이션 실행 완료!')

      // 마이그레이션 기록 저장
      await recordMigration(supabase, migrationFile)
    }

  } catch (error) {
    console.error('❌ 마이그레이션 실행 실패:', error)
    process.exit(1)
  }
}

async function recordMigration(supabase: any, migrationFile: string) {
  // 마이그레이션 테이블이 있는지 확인하고 기록
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'schema_migrations')

  if (tables && tables.length > 0) {
    await supabase
      .from('schema_migrations')
      .insert({ version: migrationFile })

    console.log(`📝 마이그레이션 기록 저장: ${migrationFile}`)
  }
}

runMigration()
