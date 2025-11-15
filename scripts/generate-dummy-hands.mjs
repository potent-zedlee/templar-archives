#!/usr/bin/env node
/**
 * Script to generate 30 complete poker hand histories in Supabase
 * Creates realistic poker hands with diverse scenarios
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
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
})

// Famous poker players for test data
const FAMOUS_PLAYERS = [
  'Phil Ivey',
  'Daniel Negreanu',
  'Tom Dwan',
  'Phil Hellmuth',
  'Doyle Brunson',
  'Antonio Esfandiari',
  'Patrik Antonius',
  'Viktor Blom',
  'Gus Hansen',
  'Vanessa Selbst',
  'Maria Ho',
  'Liv Boeree',
  'Doug Polk',
  'Fedor Holz',
  'Justin Bonomo'
]

// Poker positions
const POSITIONS = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'MP+1', 'CO', 'HJ']

// Card ranks and suits
const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']
const SUITS = ['h', 'd', 'c', 's']

// Hand rankings
const HAND_RANKINGS = [
  'High Card',
  'Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush'
]

// Action types
const ACTION_TYPES = ['fold', 'check', 'call', 'bet', 'raise', 'all-in']

// Streets
const STREETS = ['preflop', 'flop', 'turn', 'river']

// Helper functions
function getRandomCard(usedCards = []) {
  let card
  do {
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)]
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)]
    card = rank + suit
  } while (usedCards.includes(card))
  return card
}

function getRandomCards(count, usedCards = []) {
  const cards = []
  const used = [...usedCards]
  for (let i = 0; i < count; i++) {
    const card = getRandomCard(used)
    cards.push(card)
    used.push(card)
  }
  return cards
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

async function normalizePlayerName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

async function findOrCreatePlayer(name) {
  const normalized = await normalizePlayerName(name)

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
    return existing.id
  }

  // Create new player
  const { data: newPlayer, error: createError } = await supabase
    .from('players')
    .insert({
      name,
      normalized_name: normalized,
      is_pro: FAMOUS_PLAYERS.includes(name)
    })
    .select('id')
    .single()

  if (createError) {
    console.error('Error creating player:', createError)
    throw new Error(`Failed to create player: ${createError.message}`)
  }

  console.log(`✅ Created player: ${name}`)
  return newPlayer.id
}

function generatePreflopActions(players, dealerIndex) {
  const actions = []
  const numPlayers = players.length
  let actionOrder = 1

  // Calculate positions
  const sbIndex = (dealerIndex + 1) % numPlayers
  const bbIndex = (dealerIndex + 2) % numPlayers
  const utgIndex = (dealerIndex + 3) % numPlayers

  // Big blind amount
  const bbAmount = 200
  const sbAmount = 100

  // Small blind posts
  actions.push({
    player_id: players[sbIndex].id,
    action_order: actionOrder++,
    street: 'preflop',
    action_type: 'post',
    amount: sbAmount
  })

  // Big blind posts
  actions.push({
    player_id: players[bbIndex].id,
    action_order: actionOrder++,
    street: 'preflop',
    action_type: 'post',
    amount: bbAmount
  })

  // UTG and onwards action
  let currentBet = bbAmount
  let folded = new Set()

  // First round of betting
  for (let i = 0; i < numPlayers; i++) {
    const playerIndex = (utgIndex + i) % numPlayers
    if (folded.has(playerIndex)) continue

    const player = players[playerIndex]
    const rand = Math.random()

    let action
    if (rand < 0.3 && folded.size < numPlayers - 2) {
      // Fold
      action = {
        player_id: player.id,
        action_order: actionOrder++,
        street: 'preflop',
        action_type: 'fold',
        amount: 0
      }
      folded.add(playerIndex)
    } else if (rand < 0.5) {
      // Call
      action = {
        player_id: player.id,
        action_order: actionOrder++,
        street: 'preflop',
        action_type: 'call',
        amount: currentBet
      }
    } else if (rand < 0.8) {
      // Raise
      const raiseAmount = currentBet * (2 + Math.random() * 2)
      action = {
        player_id: player.id,
        action_order: actionOrder++,
        street: 'preflop',
        action_type: 'raise',
        amount: Math.floor(raiseAmount)
      }
      currentBet = Math.floor(raiseAmount)
    } else {
      // Check (only if BB and no raise)
      if (playerIndex === bbIndex && currentBet === bbAmount) {
        action = {
          player_id: player.id,
          action_order: actionOrder++,
          street: 'preflop',
          action_type: 'check',
          amount: 0
        }
      } else {
        // Call instead
        action = {
          player_id: player.id,
          action_order: actionOrder++,
          street: 'preflop',
          action_type: 'call',
          amount: currentBet
        }
      }
    }

    actions.push(action)
  }

  return { actions, folded: Array.from(folded), pot: currentBet * (numPlayers - folded.size) }
}

function generateStreetActions(players, street, foldedIndices, currentPot) {
  const actions = []
  let actionOrder = 1
  let currentBet = 0
  const activePlayers = players.filter((_, idx) => !foldedIndices.includes(idx))

  if (activePlayers.length <= 1) {
    return { actions, pot: currentPot }
  }

  for (const player of activePlayers) {
    const rand = Math.random()

    let action
    if (currentBet === 0) {
      // First to act
      if (rand < 0.4) {
        // Check
        action = {
          player_id: player.id,
          action_order: actionOrder++,
          street,
          action_type: 'check',
          amount: 0
        }
      } else {
        // Bet
        const betAmount = Math.floor(currentPot * (0.5 + Math.random() * 0.5))
        action = {
          player_id: player.id,
          action_order: actionOrder++,
          street,
          action_type: 'bet',
          amount: betAmount
        }
        currentBet = betAmount
      }
    } else {
      // Facing a bet
      if (rand < 0.3 && activePlayers.length > 2) {
        // Fold
        action = {
          player_id: player.id,
          action_order: actionOrder++,
          street,
          action_type: 'fold',
          amount: 0
        }
        foldedIndices.push(players.indexOf(player))
      } else if (rand < 0.7) {
        // Call
        action = {
          player_id: player.id,
          action_order: actionOrder++,
          street,
          action_type: 'call',
          amount: currentBet
        }
      } else {
        // Raise
        const raiseAmount = currentBet * (2 + Math.random())
        action = {
          player_id: player.id,
          action_order: actionOrder++,
          street,
          action_type: 'raise',
          amount: Math.floor(raiseAmount)
        }
        currentBet = Math.floor(raiseAmount)
      }
    }

    actions.push(action)
  }

  return { actions, pot: currentPot + currentBet * activePlayers.length }
}

async function generateCompleteHand(handNumber, streamId, playerPool) {
  // Select random players for this hand (2-9 players)
  const numPlayers = 2 + Math.floor(Math.random() * 8)
  const selectedPlayers = shuffleArray(playerPool).slice(0, numPlayers)

  // Assign positions
  const availablePositions = POSITIONS.slice(0, numPlayers)
  const dealerIndex = Math.floor(Math.random() * numPlayers)

  // Deal cards
  const usedCards = []
  const playerHands = selectedPlayers.map((player, idx) => {
    const holeCards = getRandomCards(2, usedCards)
    usedCards.push(...holeCards)

    return {
      id: player.id,
      name: player.name,
      position: availablePositions[idx],
      holeCards,
      startingStack: 10000 + Math.floor(Math.random() * 90000),
      endingStack: 0,
      isWinner: false
    }
  })

  // Generate board cards
  const flop = getRandomCards(3, usedCards)
  usedCards.push(...flop)
  const turn = getRandomCard(usedCards)
  usedCards.push(turn)
  const river = getRandomCard(usedCards)
  usedCards.push(river)

  // Generate actions for each street
  let currentPot = 300 // SB + BB
  let foldedIndices = []
  const allActions = []

  // Preflop
  const { actions: preflopActions, folded, pot: preflopPot } = generatePreflopActions(playerHands, dealerIndex)
  allActions.push(...preflopActions)
  foldedIndices = folded
  currentPot = preflopPot

  // Flop (if more than 1 player remains)
  if (playerHands.length - foldedIndices.length > 1 && Math.random() > 0.2) {
    const { actions: flopActions, pot: flopPot } = generateStreetActions(
      playerHands, 'flop', foldedIndices, currentPot
    )
    allActions.push(...flopActions)
    currentPot = flopPot
  }

  // Turn (if more than 1 player remains)
  if (playerHands.length - foldedIndices.length > 1 && Math.random() > 0.3) {
    const { actions: turnActions, pot: turnPot } = generateStreetActions(
      playerHands, 'turn', foldedIndices, currentPot
    )
    allActions.push(...turnActions)
    currentPot = turnPot
  }

  // River (if more than 1 player remains)
  if (playerHands.length - foldedIndices.length > 1 && Math.random() > 0.4) {
    const { actions: riverActions, pot: riverPot } = generateStreetActions(
      playerHands, 'river', foldedIndices, currentPot
    )
    allActions.push(...riverActions)
    currentPot = riverPot
  }

  // Determine winner(s)
  const activePlayers = playerHands.filter((_, idx) => !foldedIndices.includes(idx))
  const winners = activePlayers.length === 1
    ? [activePlayers[0]]
    : [getRandomElement(activePlayers)] // Simplified winner selection

  // Update winner info
  winners.forEach(winner => {
    winner.isWinner = true
    winner.endingStack = winner.startingStack + currentPot
  })

  // Update non-winners
  playerHands.forEach(player => {
    if (!player.isWinner) {
      player.endingStack = player.startingStack - Math.floor(currentPot / (playerHands.length - winners.length))
    }
  })

  // Prepare data for RPC
  const playersData = playerHands.map(player => ({
    player_id: player.id,
    poker_position: player.position,
    starting_stack: player.startingStack,
    ending_stack: player.endingStack,
    hole_cards: player.holeCards, // Array of strings
    cards: player.holeCards.join(' '),
    final_amount: player.isWinner ? currentPot : 0,
    is_winner: player.isWinner,
    hand_description: player.isWinner ? getRandomElement(HAND_RANKINGS) : null
  }))

  // Generate timestamp (random time within 8 hours)
  const startTime = Math.floor(Math.random() * 28800) // 0-8 hours in seconds
  const endTime = startTime + 60 + Math.floor(Math.random() * 240) // 1-5 minutes per hand

  return {
    handData: {
      p_day_id: streamId,
      p_job_id: null, // Test data, no job
      p_number: String(handNumber).padStart(3, '0'),
      p_description: `Hand #${handNumber}`,
      p_timestamp: `${Math.floor(startTime / 3600).toString().padStart(2, '0')}:${Math.floor((startTime % 3600) / 60).toString().padStart(2, '0')}`,
      p_video_timestamp_start: startTime,
      p_video_timestamp_end: endTime,
      p_stakes: '100/200',
      p_board_flop: flop,
      p_board_turn: turn,
      p_board_river: river,
      p_pot_size: currentPot,
      p_raw_data: {
        handNumber,
        numPlayers,
        board: { flop, turn, river },
        pot: currentPot,
        winners: winners.map(w => w.name)
      },
      p_players: playersData,
      p_actions: allActions,
      p_small_blind: 100,
      p_big_blind: 200,
      p_ante: 0,
      p_pot_preflop: preflopPot,
      p_pot_flop: null,
      p_pot_turn: null,
      p_pot_river: currentPot,
      p_thumbnail_url: ''
    }
  }
}

async function main() {
  console.log('🎰 Starting poker hand generation...\n')

  try {
    // 1. Find an existing stream or create "Unsorted Hands"
    console.log('Step 1: Finding or creating stream...')

    let streamId

    // First try to find any existing stream
    const { data: existingStreams, error: streamError } = await supabase
      .from('streams')
      .select('id, name')
      .limit(1)

    if (existingStreams && existingStreams.length > 0) {
      streamId = existingStreams[0].id
      console.log(`✅ Using existing stream: ${existingStreams[0].name} (${streamId})`)
    } else {
      // Create "Unsorted Hands" stream
      console.log('No streams found. Creating "Unsorted Hands" stream...')

      // First get or create a sub_event
      const { data: subEvents } = await supabase
        .from('sub_events')
        .select('id')
        .limit(1)

      if (!subEvents || subEvents.length === 0) {
        console.error('❌ No sub_events found in database. Please create a tournament and sub_event first.')
        process.exit(1)
      }

      const subEventId = subEvents[0].id

      // Create the stream
      const { data: newStream, error: createError } = await supabase
        .from('streams')
        .insert({
          sub_event_id: subEventId,
          name: 'Unsorted Hands',
          video_url: 'https://youtube.com/test',
          status: 'draft'
        })
        .select('id')
        .single()

      if (createError) {
        console.error('❌ Failed to create stream:', createError)
        process.exit(1)
      }

      streamId = newStream.id
      console.log(`✅ Created new stream: Unsorted Hands (${streamId})`)
    }

    console.log()

    // 2. Create test players
    console.log('Step 2: Creating test players...')
    const playerPool = []

    for (const playerName of FAMOUS_PLAYERS) {
      const playerId = await findOrCreatePlayer(playerName)
      playerPool.push({ id: playerId, name: playerName })
    }

    console.log(`✅ Created/found ${playerPool.length} players\n`)

    // 3. Generate and save 30 hands
    console.log('Step 3: Generating 30 complete poker hands...\n')

    let successCount = 0
    let failCount = 0
    const savedHandIds = []

    for (let i = 1; i <= 30; i++) {
      process.stdout.write(`Generating hand ${i}/30... `)

      try {
        // Generate complete hand data
        const { handData } = await generateCompleteHand(i, streamId, playerPool)

        // Save using RPC function
        const { data: newHandId, error: rpcError } = await supabase.rpc(
          'save_hand_with_players_actions',
          handData
        )

        if (rpcError) {
          console.log(`❌ Failed: ${rpcError.message}`)
          failCount++
        } else if (!newHandId) {
          console.log('❌ Failed: No hand ID returned')
          failCount++
        } else {
          console.log(`✅ Saved (ID: ${newHandId})`)
          successCount++
          savedHandIds.push(newHandId)
        }

      } catch (error) {
        console.log(`❌ Error: ${error.message}`)
        failCount++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 Generation Complete!')
    console.log('='.repeat(50))
    console.log(`✅ Successfully created: ${successCount} hands`)
    console.log(`❌ Failed: ${failCount} hands`)
    console.log(`📍 Stream ID: ${streamId}`)

    if (savedHandIds.length > 0) {
      console.log('\n🎯 Sample hand IDs:')
      savedHandIds.slice(0, 5).forEach(id => console.log(`  - ${id}`))

      // Verify hand count in stream
      const { data: stream, error: verifyError } = await supabase
        .from('streams')
        .select('hand_count')
        .eq('id', streamId)
        .single()

      if (!verifyError && stream) {
        console.log(`\n📈 Stream now has ${stream.hand_count || 0} total hands`)
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the script
main()