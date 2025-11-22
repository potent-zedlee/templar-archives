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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다')
  process.exit(1)
}

// Use ANON key (same as frontend)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPlayersQuery() {
  console.log('🔍 플레이어 쿼리 테스트 중...\n')

  try {
    // Test RPC function (same as frontend)
    console.log('1️⃣ RPC 함수 테스트: get_players_with_hand_counts()')
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_players_with_hand_counts')

    if (rpcError) {
      console.error('❌ RPC 에러:', rpcError.message)
      console.error('   Details:', rpcError)

      // Try direct query as fallback
      console.log('\n2️⃣ 대체 쿼리 시도: 직접 players 테이블 조회')
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('name')

      if (playersError) {
        console.error('❌ 직접 쿼리도 실패:', playersError.message)
        return
      }

      console.log(`✅ 직접 쿼리 성공: ${playersData.length}명 발견`)
      playersData.slice(0, 5).forEach((player, index) => {
        console.log(`   ${index + 1}. ${player.name} (${player.country || 'N/A'})`)
      })

      return
    }

    if (!rpcData || rpcData.length === 0) {
      console.log('⚠️  RPC 함수 성공했지만 데이터 없음')
      return
    }

    console.log(`✅ RPC 함수 성공: ${rpcData.length}명 발견\n`)

    // Show first 5 players
    rpcData.slice(0, 5).forEach((player, index) => {
      console.log(`${index + 1}. ${player.name}`)
      console.log(`   - Hand Count: ${player.hand_count}`)
      console.log(`   - Country: ${player.country || 'N/A'}`)
      console.log(`   - Winnings: $${player.total_winnings?.toLocaleString() || 0}`)
      console.log('')
    })

    // Check famous players
    const famousNames = ['Daniel Negreanu', 'Phil Ivey', 'Tom Dwan', 'Phil Hellmuth']
    const famousPlayers = rpcData.filter(p => famousNames.includes(p.name))

    console.log(`📊 유명 플레이어: ${famousPlayers.length}/4명 발견`)
    famousPlayers.forEach(p => {
      console.log(`   ✅ ${p.name} (핸드: ${p.hand_count}, 상금: $${p.total_winnings?.toLocaleString()})`)
    })

  } catch (error) {
    console.error('❌ 예외 발생:', error)
  }
}

testPlayersQuery()
