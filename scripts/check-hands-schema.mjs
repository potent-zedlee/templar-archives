import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkHandsSchema() {
  console.log('📊 Checking hands table schema...\n')

  // Direct query to get sample data
  const { data: sample, error: sampleError } = await supabase
    .from('hands')
    .select('*')
    .limit(1)
    .single()

  if (sampleError) {
    console.error('❌ Error:', sampleError.message)
    console.error('\n💡 Trying to query without single()...')

    const { data: samples, error: error2 } = await supabase
      .from('hands')
      .select('*')
      .limit(1)

    if (error2) {
      console.error('❌ Still error:', error2.message)
      process.exit(1)
    }

    if (!samples || samples.length === 0) {
      console.log('\n⚠️  No hands data found in database')
      return
    }

    sample = samples[0]
  }

  console.log('✅ Available columns (from sample data):')
  const columns = Object.keys(sample).sort()
  columns.forEach(col => {
    const value = sample[col]
    const type = Array.isArray(value) ? 'array' : typeof value
    console.log(`  - ${col} (${type})`)
  })

  // Check for blind/pot columns
  console.log('\n🎯 Checking for blind/pot columns:')
  const blindsColumns = [
    'small_blind',
    'big_blind',
    'ante',
    'pot_preflop',
    'pot_flop',
    'pot_turn',
    'pot_river',
    'pot',
    'pot_size'
  ]

  blindsColumns.forEach(col => {
    const exists = col in sample
    const value = exists ? sample[col] : 'N/A'
    console.log(`  ${exists ? '✅' : '❌'} ${col.padEnd(15)} ${exists ? `(value: ${value})` : ''}`)
  })

  console.log('\n📋 Stakes column value:', sample.stakes || 'NULL')
}

checkHandsSchema().catch(console.error)
