#!/usr/bin/env node

/**
 * Delete Players Without Country Information
 *
 * Removes manually added players that don't have country information
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

async function deletePlayers() {
  console.log('🗑️  Deleting Players Without Country Information...\n')

  // Get players without country
  const { data: noCountryPlayers, error: fetchError } = await supabase
    .from('players')
    .select('id, name, country')
    .is('country', null)

  if (fetchError) {
    console.error('❌ Error fetching players:', fetchError.message)
    process.exit(1)
  }

  if (noCountryPlayers.length === 0) {
    console.log('✅ No players without country found!')
    return
  }

  console.log(`Found ${noCountryPlayers.length} players without country:\n`)
  noCountryPlayers.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (ID: ${p.id})`)
  })

  console.log('\n🗑️  Deleting...\n')

  // Delete players
  const { error: deleteError } = await supabase
    .from('players')
    .delete()
    .is('country', null)

  if (deleteError) {
    console.error('❌ Error deleting players:', deleteError.message)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted ${noCountryPlayers.length} players!`)
  console.log('\n' + '='.repeat(50))
  console.log('Deleted players:')
  noCountryPlayers.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}`)
  })
  console.log('='.repeat(50))
}

deletePlayers().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
