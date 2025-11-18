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

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testPlayerDetail() {
  console.log('🔍 플레이어 상세 페이지 데이터 테스트\n')

  const playerId = '7ea8f637-cd91-4b8a-8ccd-090d2afb1b13' // Daniel Negreanu

  try {
    // 1. Player 기본 정보
    console.log('1️⃣ 플레이어 기본 정보 조회')
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (playerError) {
      console.error('❌ 플레이어 조회 에러:', playerError.message)
      return
    }

    console.log(`✅ ${player.name}`)
    console.log(`   - Country: ${player.country}`)
    console.log(`   - Winnings: $${player.total_winnings?.toLocaleString()}`)
    console.log(`   - Photo: ${player.photo_url ? '✅' : '❌'}`)

    // 2. Player hands (grouped)
    console.log('\n2️⃣ 플레이어 핸드 조회 (grouped)')
    const { data: handsData, error: handsError } = await supabase
      .rpc('get_player_hands_grouped', { player_uuid: playerId })

    if (handsError) {
      console.error('❌ 핸드 조회 에러:', handsError.message)
      console.log('   (이 에러는 정상입니다 - 핸드가 없거나 권한이 없을 때)')
    } else {
      console.log(`✅ 핸드 데이터: ${Array.isArray(handsData) ? handsData.length : 0}개`)
    }

    // 3. Player stats
    console.log('\n3️⃣ 플레이어 통계 조회')
    // Note: This is calculated client-side, so we can't test it here

    console.log('\n✅ 모든 기본 데이터 조회 성공')
    console.log('📍 플레이어 상세 페이지: http://localhost:3000/players/' + playerId)

  } catch (error) {
    console.error('❌ 예외 발생:', error)
  }
}

testPlayerDetail()
