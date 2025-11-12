#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf8')
const envVars = {}
for (const line of envContent.split('\n')) {
  const [key, ...values] = line.split('=')
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim()
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('=== 멈춰있는 작업 정리 ===\n')

// Find stuck jobs (processing or pending for more than 30 minutes)
const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

const { data: stuckJobs, error: fetchError } = await supabase
  .from('analysis_jobs')
  .select('id, status, created_at, progress')
  .in('status', ['processing', 'pending'])
  .lt('created_at', thirtyMinsAgo)

if (fetchError) {
  console.error('Error fetching stuck jobs:', fetchError)
  process.exit(1)
}

console.log(`발견된 멈춰있는 작업: ${stuckJobs.length}개\n`)

if (stuckJobs.length === 0) {
  console.log('정리할 작업이 없습니다.')
  process.exit(0)
}

console.table(stuckJobs.map(j => ({
  id: j.id.substring(0, 8),
  status: j.status,
  progress: j.progress,
  created: j.created_at.substring(11, 19)
})))

// Update stuck jobs to failed
const { data: updated, error: updateError } = await supabase
  .from('analysis_jobs')
  .update({
    status: 'failed',
    error_message: 'Job timeout - automatically marked as failed',
    completed_at: new Date().toISOString()
  })
  .in('id', stuckJobs.map(j => j.id))
  .select('id, status')

if (updateError) {
  console.error('Error updating jobs:', updateError)
  process.exit(1)
}

console.log(`\n✓ ${updated.length}개 작업을 failed로 업데이트했습니다.`)
