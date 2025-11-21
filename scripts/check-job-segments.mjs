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

const jobId = '64c9f7a1-c49f-4e22-8837-eb26e36b32d3'

const { data: job, error } = await supabase
  .from('analysis_jobs')
  .select('*')
  .eq('id', jobId)
  .single()

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('\n📋 Job Segments Info')
console.log('='.repeat(80))
console.log('Job ID:', job.id)
console.log('Status:', job.status)
console.log('Platform:', job.platform)
console.log('Segments:', JSON.stringify(job.segments, null, 2))

const { data: video } = await supabase
  .from('videos')
  .select('*')
  .eq('id', job.video_id)
  .single()

console.log('\n📺 Video Info')
console.log('URL:', video.url)
console.log('YouTube ID:', video.youtube_id)
console.log('Duration:', video.duration)
