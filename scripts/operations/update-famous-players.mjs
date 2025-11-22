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

const famousPlayersData = [
  {
    name: 'Daniel Negreanu',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    country: 'Canada',
    total_winnings: 42000000,
  },
  {
    name: 'Phil Ivey',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    country: 'USA',
    total_winnings: 30000000,
  },
  {
    name: 'Tom Dwan',
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    country: 'USA',
    total_winnings: 18000000,
  },
  {
    name: 'Phil Hellmuth',
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    country: 'USA',
    total_winnings: 26000000,
  },
]

async function updateFamousPlayers() {
  console.log('🔄 유명 플레이어 데이터 업데이트 중...\n')

  let successCount = 0
  let errorCount = 0

  for (const playerData of famousPlayersData) {
    const { data, error } = await supabase
      .from('players')
      .update({
        photo_url: playerData.photo_url,
        country: playerData.country,
        total_winnings: playerData.total_winnings,
      })
      .eq('name', playerData.name)
      .select()
      .single()

    if (error) {
      console.error(`❌ ${playerData.name} 업데이트 실패:`, error.message)
      errorCount++
    } else {
      console.log(`✅ ${playerData.name} 업데이트 완료`)
      console.log(`   - 국가: ${data.country}`)
      console.log(`   - 상금: $${data.total_winnings.toLocaleString()}`)
      console.log(`   - URL: http://localhost:3000/players/${data.id}`)
      console.log('')
      successCount++
    }
  }

  console.log(`\n📊 업데이트 완료: ${successCount}/${famousPlayersData.length}명`)

  if (errorCount > 0) {
    console.log(`⚠️  실패: ${errorCount}명`)
  } else {
    console.log('✅ 모든 플레이어 데이터 업데이트 성공!')
    console.log('📍 플레이어 목록: http://localhost:3000/players')
  }
}

updateFamousPlayers()
