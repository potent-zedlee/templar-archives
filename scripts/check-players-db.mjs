#!/usr/bin/env node

/**
 * Check Players in Supabase Database
 *
 * Verifies that players are correctly stored in Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log('🔍 Checking Supabase Database...\n')

  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ Error counting players:', countError.message)
    process.exit(1)
  }

  console.log(`✅ Total players in database: ${totalCount}`)

  // Get players without country
  const { data: noCountryPlayers, error: noCountryError } = await supabase
    .from('players')
    .select('id, name, country')
    .is('country', null)

  if (noCountryError) {
    console.error('❌ Error checking null countries:', noCountryError.message)
  } else {
    console.log(`📍 Players without country: ${noCountryPlayers.length}`)
    if (noCountryPlayers.length > 0) {
      console.log('\n❌ Players missing country information:')
      noCountryPlayers.slice(0, 10).forEach(p => {
        console.log(`   - ${p.name}`)
      })
      if (noCountryPlayers.length > 10) {
        console.log(`   ... and ${noCountryPlayers.length - 10} more`)
      }
    }
  }

  // Get country distribution
  const { data: countries, error: countriesError } = await supabase
    .from('players')
    .select('country')
    .not('country', 'is', null)

  if (countriesError) {
    console.error('❌ Error checking countries:', countriesError.message)
  } else {
    const countryMap = countries.reduce((acc, p) => {
      acc[p.country] = (acc[p.country] || 0) + 1
      return acc
    }, {})

    const sortedCountries = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    console.log('\n🌍 Top 10 countries:')
    sortedCountries.forEach(([country, count]) => {
      console.log(`   ${country}: ${count} players`)
    })
  }

  // Get sample of recent players
  const { data: recentPlayers, error: recentError } = await supabase
    .from('players')
    .select('name, country, total_winnings')
    .order('created_at', { ascending: false })
    .limit(5)

  if (recentError) {
    console.error('❌ Error fetching recent players:', recentError.message)
  } else {
    console.log('\n🕐 Most recently added players:')
    recentPlayers.forEach(p => {
      const winnings = p.total_winnings ? `$${(p.total_winnings / 100).toLocaleString()}` : '$0'
      console.log(`   - ${p.name} (${p.country || 'No country'}) - ${winnings}`)
    })
  }

  // Check for top players
  const { data: topPlayers, error: topError } = await supabase
    .from('players')
    .select('name, country, total_winnings')
    .order('total_winnings', { ascending: false, nullsFirst: false })
    .limit(5)

  if (topError) {
    console.error('❌ Error fetching top players:', topError.message)
  } else {
    console.log('\n🏆 Top 5 players by total winnings:')
    topPlayers.forEach((p, i) => {
      const winnings = p.total_winnings ? `$${(p.total_winnings / 100).toLocaleString()}` : '$0'
      console.log(`   ${i + 1}. ${p.name} (${p.country || 'No country'}) - ${winnings}`)
    })
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Database check completed!')
  console.log('='.repeat(50))
}

checkDatabase().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
