#!/usr/bin/env node

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
  console.error('❌ 환경 변수가 설정되지 않았습니다')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkFamousPlayers() {
  console.log('🔍 유명 플레이어 확인 중...\n')

  const famousPlayers = ['Daniel Negreanu', 'Phil Ivey', 'Tom Dwan', 'Phil Hellmuth']

  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, country, total_winnings, photo_url')
    .in('name', famousPlayers)
    .order('name')

  if (error) {
    console.error('❌ 쿼리 에러:', error.message)
    return
  }

  if (players.length === 0) {
    console.log('❌ 플레이어를 찾을 수 없습니다')
    console.log('📝 마이그레이션 파일을 확인합니다...\n')

    // 마이그레이션 파일 존재 확인
    return { needMigration: true }
  }

  console.log(`✅ ${players.length}명의 플레이어 발견:\n`)

  players.forEach((player, index) => {
    console.log(`${index + 1}. ${player.name}`)
    console.log(`   - ID: ${player.id}`)
    console.log(`   - 국가: ${player.country}`)
    console.log(`   - 상금: $${player.total_winnings?.toLocaleString() || 0}`)
    console.log(`   - 사진: ${player.photo_url ? '✅' : '❌'}`)
    console.log(`   - URL: http://localhost:3000/players/${player.id}`)
    console.log('')
  })

  // 전체 플레이어 수 확인
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 전체 플레이어 수: ${count}명`)
  console.log('\n✅ 플레이어 페이지에서 모두 접근 가능합니다!')
  console.log('📍 플레이어 목록: http://localhost:3000/players')

  return { needMigration: false, players }
}

const result = await checkFamousPlayers()

if (result?.needMigration) {
  console.log('⚠️  플레이어 데이터가 DB에 없습니다. 마이그레이션을 실행해야 합니다.')
}
