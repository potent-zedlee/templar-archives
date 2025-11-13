#!/usr/bin/env node

/**
 * Update User Role to High Templar
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

async function updateUserRole() {
  const userEmail = 'zed.lee@ggproduction.net'
  const newRole = 'high_templar'

  console.log(`\n🔧 사용자 권한 업데이트`)
  console.log('=' .repeat(60))
  console.log(`Email: ${userEmail}`)
  console.log(`New Role: ${newRole}`)
  console.log('=' .repeat(60))

  const { data, error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('email', userEmail)
    .select()

  if (error) {
    console.error('❌ 업데이트 실패:', error)
    process.exit(1)
  }

  console.log('\n✅ 권한 업데이트 성공!')
  console.log('Updated user:', data[0])
  console.log('\n이제 AI 분석 기능을 사용할 수 있습니다.\n')
}

updateUserRole().catch(console.error)
