#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.+)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const streamId = 'e10ffa6b-7193-4857-8235-64e618bade39'

console.log('\n🧹 Cleaning up failed jobs for stream:', streamId)
console.log('='.repeat(80))

// Delete failed jobs
const { data: deletedJobs, error } = await supabase
  .from('analysis_jobs')
  .delete()
  .eq('stream_id', streamId)
  .select()

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log(`✅ Deleted ${deletedJobs.length} failed job(s)`)
deletedJobs.forEach(job => {
  console.log(`   - Job ID: ${job.id}`)
  console.log(`     Status: ${job.status}`)
  console.log(`     Error: ${job.error_message}`)
})

console.log('\n' + '='.repeat(80))
console.log('✅ Cleanup complete\n')
