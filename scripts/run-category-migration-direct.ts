/**
 * Direct SQL Execution for Tournament Categories Migration
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8')
    envFile.split('\n').forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    })
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Running Tournament Categories Migration...\n')

  // Read migration file
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20251022000003_add_tournament_categories_system.sql'
  )

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Loaded migration file')
  console.log('📊 Size:', (sql.length / 1024).toFixed(2), 'KB\n')

  try {
    // Check if table exists
    const { data: existing, error: checkError } = await supabase
      .from('tournament_categories')
      .select('id')
      .limit(1)

    if (!checkError && existing) {
      console.log('✅ tournament_categories 테이블이 이미 존재합니다.')
      console.log('   마이그레이션이 이미 적용되어 있습니다.\n')

      // Verify data
      const { data: categories } = await supabase
        .from('tournament_categories')
        .select('*')
        .order('priority')

      console.log(`📋 ${categories?.length || 0}개의 카테고리가 있습니다.\n`)
      return
    }
  } catch (err) {
    // Continue if table doesn't exist
  }

  console.log('⚠️  tournament_categories 테이블이 없습니다.')
  console.log('   Supabase Studio에서 수동으로 SQL을 실행해주세요:\n')
  console.log(`   1. Supabase Studio 열기:`)
  console.log(`      https://supabase.com/dashboard/project/diopilmkehygiqpizvga/sql/new\n`)
  console.log(`   2. 다음 파일의 내용을 복사하여 붙여넣기:`)
  console.log(`      ${migrationPath}\n`)
  console.log(`   3. "RUN" 버튼 클릭\n`)
  console.log(`   또는 파일 내용을 아래에서 확인:\n`)
  console.log('─'.repeat(80))
  console.log(sql.substring(0, 500))
  console.log('...')
  console.log('─'.repeat(80))
}

runMigration()
