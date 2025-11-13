#!/usr/bin/env node

/**
 * Check HAE Analysis Status
 * 최근 분석 작업 상태와 사용자 권한 확인
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables manually
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

async function checkAnalysisStatus() {
  console.log('\n📊 분석 작업 상태 확인')
  console.log('=' .repeat(80))

  // 1. 최근 분석 작업 확인
  const { data: jobs, error: jobsError } = await supabase
    .from('analysis_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (jobsError) {
    console.error('❌ analysis_jobs 조회 실패:', jobsError)
  } else {
    console.log(`\n✅ 최근 분석 작업 (${jobs.length}개):`)
    jobs.forEach((job, idx) => {
      const elapsed = job.started_at
        ? Math.floor((new Date() - new Date(job.started_at)) / 1000)
        : null

      const healthStatus =
        job.status === 'processing' && elapsed > 600 ? '🔴 STUCK' :
        job.status === 'processing' ? '🟢 RUNNING' :
        job.status === 'success' ? '✅ SUCCESS' :
        job.status === 'failed' ? '❌ FAILED' :
        '⚪ PENDING'

      console.log(`\n  ${idx + 1}. ${healthStatus}`)
      console.log(`     ID: ${job.id}`)
      console.log(`     Status: ${job.status}`)
      console.log(`     Progress: ${job.progress}%`)
      console.log(`     Hands Found: ${job.hands_found || 0}`)
      console.log(`     Video ID: ${job.video_id}`)
      console.log(`     Stream ID: ${job.stream_id}`)
      console.log(`     Created: ${new Date(job.created_at).toLocaleString('ko-KR')}`)
      if (job.started_at) {
        console.log(`     Started: ${new Date(job.started_at).toLocaleString('ko-KR')}`)
        console.log(`     Elapsed: ${elapsed}s`)
      }
      if (job.completed_at) {
        console.log(`     Completed: ${new Date(job.completed_at).toLocaleString('ko-KR')}`)
      }
      if (job.error_message) {
        console.log(`     Error: ${job.error_message}`)
      }
    })
  }

  // 2. 사용자 권한 확인
  console.log('\n\n👥 사용자 권한 확인')
  console.log('=' .repeat(80))

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (usersError) {
    console.error('❌ users 조회 실패:', usersError)
  } else {
    console.log(`\n✅ 최근 사용자 (${users.length}개):`)
    users.forEach((user, idx) => {
      const roleEmoji =
        user.role === 'admin' ? '👑' :
        user.role === 'high_templar' ? '⭐' :
        user.role === 'reporter' ? '📝' :
        '👤'

      console.log(`\n  ${idx + 1}. ${roleEmoji} ${user.email}`)
      console.log(`     Role: ${user.role}`)
      console.log(`     ID: ${user.id}`)
      console.log(`     Created: ${new Date(user.created_at).toLocaleString('ko-KR')}`)
    })
  }

  // 3. 테이블 존재 확인
  console.log('\n\n🗄️  테이블 존재 확인')
  console.log('=' .repeat(80))

  const { data: tables, error: tablesError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'profiles', 'analysis_jobs', 'hands')
        ORDER BY table_name;
      `
    })

  if (tablesError) {
    console.log('⚠️  RPC 함수로 조회 실패 (정상)')
    console.log('   users 테이블:', jobs ? '✅ 존재' : '❌ 없음')
    console.log('   analysis_jobs 테이블:', jobs ? '✅ 존재' : '❌ 없음')
  } else {
    console.log('✅ 테이블 목록:', tables)
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ 검사 완료\n')
}

checkAnalysisStatus().catch(console.error)
