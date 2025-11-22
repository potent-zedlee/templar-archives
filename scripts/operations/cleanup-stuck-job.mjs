#!/usr/bin/env node

/**
 * Clean up STUCK analysis job
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanupStuckJob() {
  console.log(`\n🧹 STUCK 작업 정리`)
  console.log('=' .repeat(60))

  // Find stuck jobs (processing > 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { data: stuckJobs, error: findError } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('status', 'processing')
    .lt('started_at', tenMinutesAgo)

  if (findError) {
    console.error('❌ 조회 실패:', findError)
    process.exit(1)
  }

  if (stuckJobs.length === 0) {
    console.log('✅ STUCK 상태 작업 없음')
    return
  }

  console.log(`\n⚠️  ${stuckJobs.length}개의 STUCK 작업 발견:`)
  stuckJobs.forEach(job => {
    const elapsed = Math.floor((new Date() - new Date(job.started_at)) / 1000)
    console.log(`  - ID: ${job.id} (${Math.floor(elapsed / 60)}분 경과)`)
  })

  // Update to failed
  const { data, error } = await supabase
    .from('analysis_jobs')
    .update({
      status: 'failed',
      error_message: '사용자 권한 부족으로 인한 분석 실패',
      completed_at: new Date().toISOString()
    })
    .eq('status', 'processing')
    .lt('started_at', tenMinutesAgo)
    .select()

  if (error) {
    console.error('❌ 업데이트 실패:', error)
    process.exit(1)
  }

  console.log(`\n✅ ${data.length}개 작업 정리 완료`)
  console.log('\n이제 새로운 분석을 시작할 수 있습니다.\n')
}

cleanupStuckJob().catch(console.error)
