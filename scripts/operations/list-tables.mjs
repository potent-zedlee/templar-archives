#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env.local file
const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Query PostgreSQL information_schema to get all tables
const { data, error } = await supabase.rpc('exec_sql', {
  query: `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `
})

if (error) {
  // Fallback: try direct query (might not work due to RLS)
  console.error('exec_sql not available, trying alternative...')

  // List some known tables to test
  const tablesToTest = [
    'hands', 'players', 'tournaments', 'sub_events',
    'days', 'streams', 'events', 'analysis_jobs'
  ]

  console.log('\nTesting table names:')
  for (const tableName of tablesToTest) {
    const { error: testError } = await supabase
      .from(tableName)
      .select('id')
      .limit(0)

    if (!testError) {
      console.log(`✅ ${tableName}`)
    } else if (testError.code === 'PGRST205') {
      console.log(`❌ ${tableName} (not found)`)
    } else {
      console.log(`⚠️  ${tableName} (${testError.message})`)
    }
  }
} else {
  console.log('Database tables:')
  console.log(data)
}
