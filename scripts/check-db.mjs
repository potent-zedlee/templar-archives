#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env.local file manually
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkDatabase() {
  console.log('Checking database...\n')

  // Check hands count
  const { data: handsData, error: handsError } = await supabase
    .from('hands')
    .select('id', { count: 'exact', head: true })

  if (handsError) {
    console.error('Error counting hands:', handsError)
  } else {
    console.log(`Hands count: ${handsData?.length || 0}`)
  }

  // Check latest analysis jobs (plural)
  const { data: jobsData, error: jobsError } = await supabase
    .from('analysis_jobs')
    .select('id, status, hands_found, error_message, result, segments, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (jobsError) {
    console.error('Error fetching jobs:', jobsError)
  } else {
    console.log('\nLatest analysis jobs:')
    for (const job of jobsData || []) {
      console.log('\n---')
      console.log('- ID:', job.id)
      console.log('- Status:', job.status)
      console.log('- Hands found:', job.hands_found)
      console.log('- Error:', job.error_message || 'None')
      console.log('- Segments:', job.segments?.length || 0)
      console.log('- Result:', JSON.stringify(job.result, null, 2))
      console.log('- Created:', job.created_at)
    }
  }

  // Check if we have any hands at all
  const { data: allHands, error: allHandsError } = await supabase
    .from('hands')
    .select('*')
    .limit(5)

  if (allHandsError) {
    console.error('\nError fetching hands:', allHandsError)
  } else {
    console.log(`\nSample hands (${allHands?.length || 0} records):`)
    console.log(JSON.stringify(allHands, null, 2))
  }
}

checkDatabase().catch(console.error)
