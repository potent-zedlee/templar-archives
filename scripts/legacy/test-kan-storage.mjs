#!/usr/bin/env node
/**
 * Test script to manually test KAN hand storage
 * Simulates the storeHandsFromSegment function
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
})

// Sample hand data (simulated from backend)
const sampleHand = {
  handNumber: 1,
  description: "Test Hand #1",
  stakes: "100/200",
  pot: 1000,
  board: {
    flop: ["Ah", "Kd", "Qc"],
    turn: "Js",
    river: "Td"
  },
  players: [
    {
      name: "Test Player 1",
      position: "BTN",
      stackSize: 50000,
      holeCards: ["As", "Ks"]
    },
    {
      name: "Test Player 2",
      position: "SB",
      stackSize: 45000,
      holeCards: ["Qh", "Qd"]
    }
  ],
  actions: [
    {
      player: "Test Player 1",
      street: "preflop",
      action: "raise",
      amount: 600
    },
    {
      player: "Test Player 2",
      street: "preflop",
      action: "call",
      amount: 400
    }
  ],
  winners: [
    {
      name: "Test Player 1",
      amount: 1000,
      hand: "Royal Flush"
    }
  ]
}

async function normalizePlayerName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

async function findOrCreatePlayer(name) {
  const normalized = await normalizePlayerName(name)

  console.log(`Finding/creating player: ${name} (normalized: ${normalized})`)

  // Try to find existing player
  const { data: existing, error: findError } = await supabase
    .from('players')
    .select('id')
    .eq('normalized_name', normalized)
    .single()

  if (findError && findError.code !== 'PGRST116') {
    console.error('Error finding player:', findError)
    throw new Error(`Failed to find player: ${findError.message}`)
  }

  if (existing) {
    console.log(`Found existing player: ${existing.id}`)
    return existing.id
  }

  // Create new player
  console.log('Creating new player...')
  const { data: newPlayer, error: createError } = await supabase
    .from('players')
    .insert({
      name,
      normalized_name: normalized,
    })
    .select('id')
    .single()

  if (createError) {
    console.error('Error creating player:', createError)
    throw new Error(`Failed to create player: ${createError.message}`)
  }

  console.log(`Created new player: ${newPlayer.id}`)
  return newPlayer.id
}

async function testHandStorage() {
  console.log('Starting hand storage test...\n')

  try {
    // 1. Get or create "Unsorted Hands" stream (same as processKanJob)
    console.log('Step 1: Getting/creating "Unsorted Hands" stream...')

    let streamId
    const { data: existingStream, error: streamError } = await supabase
      .from('days')
      .select('id')
      .eq('name', 'Unsorted Hands')
      .single()

    if (existingStream) {
      streamId = existingStream.id
      console.log(`Found existing stream: ${streamId}`)
    } else {
      console.log('Creating new "Unsorted Hands" stream...')

      // Get or create "Unsorted Videos" sub_event
      let subEventId
      const { data: existingSubEvent, error: subEventError } = await supabase
        .from('sub_events')
        .select('id')
        .eq('name', 'Unsorted Videos')
        .single()

      if (existingSubEvent) {
        subEventId = existingSubEvent.id
        console.log(`Found existing sub_event: ${subEventId}`)
      } else {
        // This will likely fail due to tournament_id constraint
        // But let's try anyway to match the actual code
        const { data: newSubEvent, error: newSubEventError } = await supabase
          .from('sub_events')
          .insert({
            tournament_id: null,
            name: 'Unsorted Videos',
            date: new Date().toISOString().split('T')[0],
          })
          .select('id')
          .single()

        if (newSubEventError) {
          console.error('Failed to create sub_event:', newSubEventError)
          // Use a fallback: get ANY existing sub_event
          const { data: fallbackSubEvent } = await supabase
            .from('sub_events')
            .select('id')
            .limit(1)
            .single()

          if (fallbackSubEvent) {
            subEventId = fallbackSubEvent.id
            console.log(`Using fallback sub_event: ${subEventId}`)
          } else {
            throw new Error('No sub_events available in database')
          }
        } else {
          subEventId = newSubEvent.id
          console.log(`Created new sub_event: ${subEventId}`)
        }
      }

      // Create day
      const { data: newDay, error: newDayError } = await supabase
        .from('days')
        .insert({
          sub_event_id: subEventId,
          name: 'Unsorted Hands',
          video_url: 'https://youtube.com/test',
        })
        .select('id')
        .single()

      if (newDayError) {
        throw new Error(`Failed to create day: ${newDayError.message}`)
      }

      streamId = newDay.id
      console.log(`Created new stream: ${streamId}`)
    }
    console.log()

    // 2. Create test job
    console.log('Step 2: Creating test job...')
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .insert({
        video_id: null,
        stream_id: streamId,
        platform: 'pokerstars',
        status: 'processing',
        segments: [{ start: 0, end: 60, type: 'gameplay' }],
        progress: 50,
        ai_provider: 'gemini',
      })
      .select('id')
      .single()

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`)
    }

    const jobId = job.id
    console.log(`Job ID: ${jobId}\n`)

    // 3. Find/create players
    console.log('Step 3: Finding/creating players...')
    const playerIdMap = new Map()

    for (const playerData of sampleHand.players) {
      const playerId = await findOrCreatePlayer(playerData.name)
      playerIdMap.set(playerData.name, playerId)
    }
    console.log(`\n`)

    // 4. Prepare players data for RPC
    console.log('Step 4: Preparing players data...')
    const playersData = []
    for (const playerData of sampleHand.players) {
      const playerId = playerIdMap.get(playerData.name)
      if (!playerId) continue

      const winner = sampleHand.winners?.find((w) => w.name === playerData.name)

      let holeCardsArray = null
      if (playerData.holeCards) {
        holeCardsArray = Array.isArray(playerData.holeCards)
          ? playerData.holeCards
          : playerData.holeCards.split(/[\s,]+/).filter(Boolean)
      }

      playersData.push({
        player_id: playerId,
        poker_position: playerData.position,
        starting_stack: playerData.stackSize || 0,
        ending_stack: playerData.stackSize || 0,
        hole_cards: holeCardsArray,
        cards: holeCardsArray ? holeCardsArray.join(' ') : null,
        final_amount: winner?.amount || 0,
        is_winner: !!winner,
        hand_description: winner?.hand || null,
      })
    }
    console.log(`Prepared ${playersData.length} players\n`)

    // 5. Prepare actions data
    console.log('Step 5: Preparing actions data...')
    const actionsData = []
    for (let idx = 0; idx < sampleHand.actions.length; idx++) {
      const action = sampleHand.actions[idx]
      const playerId = playerIdMap.get(action.player)
      if (!playerId) continue

      actionsData.push({
        player_id: playerId,
        action_order: idx + 1,
        street: action.street.toLowerCase(),
        action_type: action.action.toLowerCase(),
        amount: action.amount || 0,
      })
    }
    console.log(`Prepared ${actionsData.length} actions\n`)

    // 6. Call RPC function
    console.log('Step 6: Calling RPC function save_hand_with_players_actions...')
    console.log('Parameters:')
    console.log('- p_day_id:', streamId)
    console.log('- p_job_id:', jobId)
    console.log('- p_number:', String(sampleHand.handNumber))
    console.log('- p_description:', sampleHand.description)
    console.log('- p_players count:', playersData.length)
    console.log('- p_actions count:', actionsData.length)
    console.log()

    const { data: newHandId, error: rpcError } = await supabase.rpc(
      'save_hand_with_players_actions',
      {
        p_day_id: streamId,
        p_job_id: jobId,
        p_number: String(sampleHand.handNumber),
        p_description: sampleHand.description,
        p_timestamp: '00:00',
        p_video_timestamp_start: 0,
        p_video_timestamp_end: 60,
        p_stakes: sampleHand.stakes,
        p_board_flop: sampleHand.board?.flop || [],
        p_board_turn: sampleHand.board?.turn || null,
        p_board_river: sampleHand.board?.river || null,
        p_pot_size: sampleHand.pot || 0,
        p_raw_data: sampleHand,
        p_players: playersData,
        p_actions: actionsData,
      }
    )

    if (rpcError) {
      console.error('\n❌ RPC Error:', rpcError)
      throw new Error(`RPC error: ${rpcError.message}`)
    }

    if (!newHandId) {
      console.error('\n❌ No hand ID returned from RPC')
      throw new Error('No hand ID returned from RPC')
    }

    console.log(`\n✅ Successfully saved hand with ID: ${newHandId}`)

    // 7. Verify hand was saved
    console.log('\nStep 7: Verifying hand was saved...')
    const { data: savedHand, error: verifyError } = await supabase
      .from('hands')
      .select('*')
      .eq('id', newHandId)
      .single()

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
    } else {
      console.log('✅ Hand verified in database')
      console.log('Hand details:', JSON.stringify(savedHand, null, 2))
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

testHandStorage()
