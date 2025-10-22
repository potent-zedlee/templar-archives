/**
 * Execute Category Migration SQL Directly
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
})

async function executeMigration() {
  console.log('🚀 Executing Category Migration SQL...\n')

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20251022000003_add_tournament_categories_system.sql'
  )

  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration file loaded')
  console.log(`📊 Size: ${(sql.length / 1024).toFixed(2)} KB\n`)

  console.log('⚠️  Supabase client SDK cannot execute raw SQL directly.')
  console.log('   Please use one of these methods:\n')

  console.log('1️⃣ **Supabase Studio (Recommended)**')
  console.log(`   https://supabase.com/dashboard/project/diopilmkehygiqpizvga/sql/new\n`)
  console.log('   → Copy the entire SQL file content')
  console.log('   → Paste into SQL Editor')
  console.log('   → Click "RUN"\n')

  console.log('2️⃣ **Supabase CLI**')
  console.log('   supabase link --project-ref diopilmkehygiqpizvga')
  console.log('   supabase db push\n')

  console.log('3️⃣ **psql Command (if installed)**')
  console.log('   psql "postgresql://postgres.diopilmkehygiqpizvga:Qkqhwk135!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" < supabase/migrations/20251022000003_add_tournament_categories_system.sql\n')

  console.log('─'.repeat(80))
  console.log('📝 SQL Preview (first 500 characters):')
  console.log('─'.repeat(80))
  console.log(sql.substring(0, 500))
  console.log('...\n')

  console.log('💡 After applying the migration, run:')
  console.log('   npx tsx scripts/test-category-migration.ts\n')
}

executeMigration()
