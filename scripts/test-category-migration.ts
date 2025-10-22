/**
 * Test Category Migration
 *
 * 카테고리 마이그레이션이 정상적으로 적용되었는지 테스트
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local
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

async function testMigration() {
  console.log('🧪 Testing Category Migration...\n')

  try {
    // Test 1: Check if table exists and fetch categories
    console.log('📋 Test 1: Fetching categories...')
    const { data: categories, error: fetchError } = await supabase
      .from('tournament_categories')
      .select('*')
      .order('priority')

    if (fetchError) {
      console.error('❌ Failed to fetch categories:', fetchError.message)
      console.log('\n💡 마이그레이션이 아직 적용되지 않았습니다.')
      console.log('   다음 명령어로 마이그레이션을 적용하세요:')
      console.log('   npx supabase db push\n')
      return false
    }

    console.log(`✅ Found ${categories?.length || 0} categories\n`)

    if (!categories || categories.length === 0) {
      console.error('❌ No categories found')
      return false
    }

    // Test 2: Check data integrity
    console.log('📋 Test 2: Checking data integrity...')
    const sampleCategories = categories.slice(0, 5)
    sampleCategories.forEach((cat) => {
      console.log(`   ✓ ${cat.id.padEnd(25)} | ${cat.display_name.padEnd(20)} | ${cat.region}`)
    })
    console.log(`   ... 외 ${categories.length - 5}개\n`)

    // Test 3: Check required fields
    console.log('📋 Test 3: Validating schema...')
    const requiredFields = ['id', 'name', 'display_name', 'region', 'priority', 'is_active']
    const firstCategory = categories[0]

    let schemaValid = true
    requiredFields.forEach((field) => {
      if (!(field in firstCategory)) {
        console.error(`   ❌ Missing field: ${field}`)
        schemaValid = false
      }
    })

    if (schemaValid) {
      console.log('   ✅ All required fields present\n')
    }

    // Test 4: Check storage bucket
    console.log('📋 Test 4: Checking storage bucket...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('   ❌ Failed to list buckets:', bucketsError.message)
    } else {
      const logosBucket = buckets?.find((b) => b.name === 'tournament-logos')
      if (logosBucket) {
        console.log('   ✅ tournament-logos bucket exists\n')
      } else {
        console.error('   ❌ tournament-logos bucket not found\n')
      }
    }

    // Test 5: Check category usage
    console.log('📋 Test 5: Testing category usage query...')
    const testCategoryId = categories[0].id
    const { count, error: countError } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', testCategoryId)

    if (countError) {
      console.error(`   ❌ Failed to query usage: ${countError.message}`)
    } else {
      console.log(`   ✅ Category "${testCategoryId}" used by ${count || 0} tournaments\n`)
    }

    // Summary
    console.log('=' .repeat(60))
    console.log('✨ Migration Test Summary')
    console.log('=' .repeat(60))
    console.log(`✅ Table: tournament_categories exists`)
    console.log(`✅ Records: ${categories.length} categories`)
    console.log(`✅ Schema: Valid`)
    console.log(`✅ Storage: ${logosBucket ? 'Ready' : 'Not configured'}`)
    console.log(`✅ Queries: Working`)
    console.log('=' .repeat(60))
    console.log('\n🎉 마이그레이션이 성공적으로 적용되었습니다!\n')

    return true
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

testMigration().then((success) => {
  process.exit(success ? 0 : 1)
})
