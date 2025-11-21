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

const jobId = '74bae6f3-d351-4b86-8d3b-a4427fdac154'

const { data: job, error } = await supabase
  .from('analysis_jobs')
  .select('*')
  .eq('id', jobId)
  .single()

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('\n📋 Job Status')
console.log('='.repeat(80))
console.log('Job ID:', job.id)
console.log('Status:', job.status)
console.log('Progress:', job.progress + '%')
console.log('Hands Found:', job.hands_found)
console.log('Error Message:', job.error_message || '(없음)')
console.log('Created:', new Date(job.created_at).toLocaleString('ko-KR'))
console.log('Started:', job.started_at ? new Date(job.started_at).toLocaleString('ko-KR') : '(없음)')
console.log('Completed:', job.completed_at ? new Date(job.completed_at).toLocaleString('ko-KR') : '(없음)')
console.log('\nSegments:', JSON.stringify(job.segments, null, 2))
console.log('='.repeat(80))
