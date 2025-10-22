/**
 * Apply Tournament Categories Migration
 *
 * 이 스크립트는 tournament_categories 시스템 마이그레이션을 Supabase에 적용합니다.
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
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function applyMigration() {
  console.log('🚀 Starting Tournament Categories Migration...\n')

  // Read migration file
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20251022000003_add_tournament_categories_system.sql'
  )

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration file loaded')
  console.log('📊 SQL length:', sql.length, 'characters\n')

  try {
    // Check if table already exists
    const { data: existingTable } = await supabase
      .from('tournament_categories')
      .select('id')
      .limit(1)

    if (existingTable && existingTable.length > 0) {
      console.log('⚠️  tournament_categories 테이블이 이미 존재합니다.')
      console.log('   데이터를 확인합니다...\n')

      const { data: categories, error: countError } = await supabase
        .from('tournament_categories')
        .select('*')
        .order('priority', { ascending: true })

      if (countError) {
        console.error('❌ Error fetching categories:', countError)
        process.exit(1)
      }

      console.log(`✅ ${categories?.length || 0}개의 카테고리가 이미 존재합니다.`)
      console.log('\n📋 기존 카테고리:')
      categories?.forEach((cat) => {
        console.log(`   - ${cat.id} (${cat.display_name}) - ${cat.region}`)
      })

      console.log('\n✨ 마이그레이션이 이미 적용되어 있습니다.')
      return
    }
  } catch (error: any) {
    // Table doesn't exist, continue with migration
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('✓ tournament_categories 테이블이 존재하지 않습니다. 생성합니다...\n')
    } else {
      console.error('❌ Error checking existing table:', error)
      process.exit(1)
    }
  }

  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 실행할 SQL 문: ${statements.length}개\n`)

    let successCount = 0
    let skipCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      const preview = statement.substring(0, 80).replace(/\n/g, ' ')

      console.log(`[${i + 1}/${statements.length}] ${preview}...`)

      try {
        // Execute SQL statement using RPC
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })

        if (error) {
          // Check if error is about existing object (already created)
          if (
            error.message?.includes('already exists') ||
            error.code === '42P07' ||
            error.code === '42710'
          ) {
            console.log('  ⏭️  Already exists, skipping...')
            skipCount++
          } else {
            throw error
          }
        } else {
          console.log('  ✓ Success')
          successCount++
        }
      } catch (error: any) {
        console.error('  ❌ Error:', error.message)
        console.error('\nStatement:', statement)

        // Don't exit on certain errors
        if (
          error.message?.includes('already exists') ||
          error.code === '42P07' ||
          error.code === '42710'
        ) {
          console.log('  ⏭️  Continuing...')
          skipCount++
        } else {
          throw error
        }
      }
    }

    console.log(`\n✅ Migration completed!`)
    console.log(`   Success: ${successCount}`)
    console.log(`   Skipped: ${skipCount}`)
    console.log(`   Total: ${statements.length}`)

    // Verify migration
    console.log('\n🔍 Verifying migration...\n')

    const { data: categories, error: verifyError } = await supabase
      .from('tournament_categories')
      .select('*')
      .order('priority', { ascending: true })

    if (verifyError) {
      console.error('❌ Verification error:', verifyError)
      process.exit(1)
    }

    console.log(`✅ ${categories?.length || 0}개의 카테고리가 성공적으로 생성되었습니다.\n`)

    console.log('📋 생성된 카테고리:')
    categories?.slice(0, 10).forEach((cat) => {
      console.log(
        `   - ${cat.id.padEnd(25)} | ${cat.display_name.padEnd(20)} | ${cat.region.padEnd(10)} | priority: ${cat.priority}`
      )
    })

    if ((categories?.length || 0) > 10) {
      console.log(`   ... 외 ${categories!.length - 10}개`)
    }

    console.log('\n✨ All done!\n')
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Note: Supabase doesn't have exec_sql RPC by default
// We'll use direct SQL execution instead
async function applyMigrationDirect() {
  console.log('🚀 Starting Tournament Categories Migration...\n')

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20251022000003_add_tournament_categories_system.sql'
  )

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration file loaded')
  console.log('📊 File size:', (sql.length / 1024).toFixed(2), 'KB\n')

  try {
    // Check if table already exists
    console.log('🔍 Checking if migration already applied...\n')

    try {
      const { data: categories, error } = await supabase
        .from('tournament_categories')
        .select('id, display_name, region, priority')
        .order('priority', { ascending: true })

      if (!error && categories) {
        console.log(`✅ tournament_categories 테이블이 이미 존재합니다.`)
        console.log(`   ${categories.length}개의 카테고리가 있습니다.\n`)

        console.log('📋 기존 카테고리 (상위 10개):')
        categories.slice(0, 10).forEach((cat) => {
          console.log(
            `   - ${cat.id.padEnd(25)} | ${cat.display_name.padEnd(20)} | ${cat.region}`
          )
        })

        if (categories.length > 10) {
          console.log(`   ... 외 ${categories.length - 10}개`)
        }

        console.log('\n✨ 마이그레이션이 이미 적용되어 있습니다.')
        console.log('\n💡 Tip: Supabase Studio에서 테이블을 확인하세요:')
        console.log(`   ${supabaseUrl.replace('/v1', '')}/project/_/editor`)
        return
      }
    } catch (err: any) {
      // Table doesn't exist, proceed with migration
      console.log('✓ 테이블이 없습니다. 마이그레이션을 진행합니다.\n')
    }

    console.log('⚠️  직접 SQL 실행은 Supabase Studio를 사용하세요:')
    console.log(`   1. Supabase Studio 열기: ${supabaseUrl.replace('/v1', '')}/project/_/sql`)
    console.log(`   2. SQL Editor에서 다음 파일 내용 복사/붙여넣기:`)
    console.log(`      ${migrationPath}`)
    console.log(`   3. "RUN" 버튼 클릭\n`)

    console.log('또는 Supabase CLI 사용:')
    console.log('   npx supabase db push\n')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run migration
applyMigrationDirect()
