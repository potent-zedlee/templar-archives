#!/usr/bin/env node

/**
 * Find EPT Monte-Carlo Day 4 Stream
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

async function findEPTMonteCarloDay4() {
  console.log('\n🔍 EPT Monte-Carlo Day 4 스트림 검색')
  console.log('='.repeat(80))

  // 1. EPT Monte-Carlo 토너먼트 찾기
  const { data: tournaments, error: tournamentsError } = await supabase
    .from('tournaments')
    .select('id, name, start_date')
    .ilike('name', '%Monte-Carlo%')
    .order('start_date', { ascending: false })

  if (tournamentsError) {
    console.error('❌ 토너먼트 조회 실패:', tournamentsError)
    return
  }

  console.log(`\n📌 찾은 Monte-Carlo 토너먼트: ${tournaments.length}개`)
  tournaments.forEach(t => {
    console.log(`   - ${t.name} (${t.start_date})`)
  })

  if (tournaments.length === 0) {
    console.log('\n⚠️  Monte-Carlo 토너먼트를 찾을 수 없습니다.')
    return
  }

  // 2. 각 토너먼트의 이벤트와 Day 4 스트림 찾기
  for (const tournament of tournaments) {
    console.log(`\n\n📂 ${tournament.name}`)
    console.log('-'.repeat(80))

    const { data: events, error: eventsError } = await supabase
      .from('sub_events')
      .select('id, name')
      .eq('tournament_id', tournament.id)

    if (eventsError) {
      console.error('❌ 이벤트 조회 실패:', eventsError)
      continue
    }

    for (const event of events) {
      const { data: streams, error: streamsError } = await supabase
        .from('streams')
        .select('id, name, video_url, created_at')
        .eq('sub_event_id', event.id)
        .ilike('name', '%Day 4%')

      if (streamsError) {
        console.error('❌ 스트림 조회 실패:', streamsError)
        continue
      }

      if (streams.length > 0) {
        console.log(`\n  ✅ Event: ${event.name}`)

        for (const stream of streams) {
          // 기존 핸드 개수 확인
          const { count: handCount } = await supabase
            .from('hands')
            .select('*', { count: 'exact', head: true })
            .eq('day_id', stream.id)

          console.log(`\n  📺 Stream: ${stream.name}`)
          console.log(`     Stream ID: ${stream.id}`)
          console.log(`     Video URL: ${stream.video_url || '(없음)'}`)
          console.log(`     기존 핸드: ${handCount || 0}개`)
          console.log(`     생성일: ${new Date(stream.created_at).toLocaleDateString('ko-KR')}`)
        }
      }
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✅ 검색 완료\n')
}

findEPTMonteCarloDay4()
