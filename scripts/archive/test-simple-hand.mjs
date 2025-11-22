#!/usr/bin/env node
/**
 * Simple test to verify RPC function works with our data format
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env.local file manually
const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
})

async function test() {
  // Get stream
  const { data: streams } = await supabase
    .from('streams')
    .select('id')
    .limit(1)

  const streamId = streams[0].id

  // Get a player
  const { data: players } = await supabase
    .from('players')
    .select('id')
    .limit(1)

  const playerId = players[0].id

  console.log('Stream ID:', streamId)
  console.log('Player ID:', playerId)

  // Simple test data
  const playersData = [
    {
      player_id: playerId,
      poker_position: 'BTN',
      starting_stack: 10000,
      ending_stack: 12000,
      hole_cards: ['Ah', 'Kh'],
      cards: 'Ah Kh',
      final_amount: 2000,
      is_winner: true,
      hand_description: 'Flush'
    }
  ]

  const actionsData = [
    {
      player_id: playerId,
      action_order: 1,
      street: 'preflop',
      action_type: 'raise',
      amount: 600
    }
  ]

  console.log('\nPlayers data:', JSON.stringify(playersData, null, 2))
  console.log('\nCalling RPC...')

  const { data: handId, error } = await supabase.rpc(
    'save_hand_with_players_actions',
    {
      p_day_id: streamId,
      p_job_id: null,
      p_number: '999',
      p_description: 'Test hand',
      p_timestamp: '00:00',
      p_video_timestamp_start: 0,
      p_video_timestamp_end: 60,
      p_stakes: '100/200',
      p_board_flop: ['Ah', 'Kd', 'Qc'],
      p_board_turn: 'Js',
      p_board_river: 'Td',
      p_pot_size: 2000,
      p_raw_data: {},
      p_players: playersData,
      p_actions: actionsData,
      p_small_blind: 100,
      p_big_blind: 200,
      p_ante: 0,
      p_pot_preflop: null,
      p_pot_flop: null,
      p_pot_turn: null,
      p_pot_river: 2000,
      p_thumbnail_url: ''
    }
  )

  if (error) {
    console.error('\n❌ Error:', error)
  } else {
    console.log('\n✅ Success! Hand ID:', handId)
  }
}

test()
