/**
 * Check game_type values in tournaments table
 *
 * This script checks if there are any tournaments with NULL or invalid game_type
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables (loaded from .env.local automatically by Next.js dev environment)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://diopilmkehygiqpizvga.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpb3BpbG1rZWh5Z2lxcGl6dmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY0MTUzNywiZXhwIjoyMDc1MjE3NTM3fQ.7_vC-KkzSeJL1rBRiVSzY6ktJ7oO8kVeBWRSV_tHnSg'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGameTypes() {
  console.log('🔍 Checking tournaments table...\n')

  try {
    // 1. Total tournaments count
    const { count: totalCount, error: countError } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })

    if (countError) throw countError
    console.log(`📊 Total tournaments: ${totalCount}`)

    // 2. Tournaments grouped by game_type
    const { data: allTournaments, error: allError } = await supabase
      .from('tournaments')
      .select('id, name, game_type, category, start_date')
      .order('start_date', { ascending: false })

    if (allError) throw allError

    // Group by game_type
    const grouped: Record<string, any[]> = {}
    let nullCount = 0

    allTournaments?.forEach((tournament) => {
      const gameType = tournament.game_type || 'NULL'
      if (!tournament.game_type) {
        nullCount++
      }
      if (!grouped[gameType]) {
        grouped[gameType] = []
      }
      grouped[gameType].push(tournament)
    })

    console.log('\n📈 Breakdown by game_type:')
    Object.entries(grouped).forEach(([gameType, tournaments]) => {
      console.log(`  ${gameType}: ${tournaments.length}`)
    })

    // 3. Show NULL tournaments details
    if (nullCount > 0) {
      console.log('\n⚠️  Tournaments with NULL game_type:')
      const nullTournaments = allTournaments?.filter(t => !t.game_type) || []
      nullTournaments.forEach((t, idx) => {
        console.log(`  ${idx + 1}. ${t.name} (${t.category}) - ${t.start_date}`)
      })

      console.log('\n💡 These tournaments need game_type to be set.')
      console.log('   Run migration: npx supabase db push')
    } else {
      console.log('\n✅ All tournaments have game_type set!')
    }

    // 4. Check for invalid game_types (not 'tournament' or 'cash-game')
    const invalidGameTypes = allTournaments?.filter(
      t => t.game_type && !['tournament', 'cash-game'].includes(t.game_type)
    ) || []

    if (invalidGameTypes.length > 0) {
      console.log('\n⚠️  Tournaments with invalid game_type:')
      invalidGameTypes.forEach((t, idx) => {
        console.log(`  ${idx + 1}. ${t.name} - game_type: "${t.game_type}"`)
      })
    }

    // 5. Check sub_events and days counts
    console.log('\n📊 Checking tournament hierarchy...\n')

    for (const tournament of allTournaments?.slice(0, 5) || []) {
      const { data: subEvents, count: subEventCount } = await supabase
        .from('sub_events')
        .select('id, name', { count: 'exact' })
        .eq('tournament_id', tournament.id)

      let totalDays = 0
      let totalStreams = 0
      if (subEvents && subEvents.length > 0) {
        for (const subEvent of subEvents) {
          const { count: dayCount } = await supabase
            .from('days')
            .select('id', { count: 'exact', head: true })
            .eq('sub_event_id', subEvent.id)
          totalDays += dayCount || 0

          const { count: streamCount } = await supabase
            .from('streams')
            .select('id', { count: 'exact', head: true })
            .eq('sub_event_id', subEvent.id)
          totalStreams += streamCount || 0
        }
      }

      console.log(`  🏆 ${tournament.name}`)
      console.log(`     game_type: ${tournament.game_type || 'NULL'}`)
      console.log(`     sub_events: ${subEventCount || 0}`)
      console.log(`     days: ${totalDays}`)
      console.log(`     streams: ${totalStreams}`)
    }

    if ((allTournaments?.length || 0) > 5) {
      console.log(`  ... and ${(allTournaments?.length || 0) - 5} more tournaments`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkGameTypes()
