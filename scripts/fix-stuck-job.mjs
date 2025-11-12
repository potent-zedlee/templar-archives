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
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const jobId = '7612774e-9155-426b-bc55-1237cce38dca'

console.log(`Fixing stuck job: ${jobId}`)

const { data, error } = await supabase
  .from('analysis_jobs')
  .update({
    status: 'failed',
    error_message: '타임아웃 또는 처리 중단됨 (40분 초과)',
    completed_at: new Date().toISOString()
  })
  .eq('id', jobId)
  .eq('status', 'processing')
  .select()

if (error) {
  console.error('Error updating job:', error)
  process.exit(1)
}

if (data && data.length > 0) {
  console.log('✅ Job updated successfully:', data[0])
} else {
  console.log('⚠️ No job found with that ID in processing status')
}
