#!/usr/bin/env node

/**
 * Import Hendonmob Top 100 Players
 *
 * Parses players_sample.md HTML and inserts players into Supabase
 */

import { readFileSync } from 'fs'
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

// Country code mapping (Hendonmob 3-letter codes to full names)
const COUNTRY_MAP = {
  'usa': 'United States',
  'eng': 'England',
  'can': 'Canada',
  'esp': 'Spain',
  'ger': 'Germany',
  'blr': 'Belarus',
  'hkg': 'Hong Kong',
  'mas': 'Malaysia',
  'fin': 'Finland',
  'tha': 'Thailand',
  'lat': 'Latvia',
  'rus': 'Russia',
  'arg': 'Argentina',
  'ina': 'Indonesia',
  'aut': 'Austria',
  'aus': 'Australia',
  'por': 'Portugal',
  'fra': 'France',
  'tur': 'Turkey',
  'chn': 'China',
  'ind': 'India',
  'nor': 'Norway',
  'swe': 'Sweden',
  'bih': 'Bosnia & Herzegovina',
  'ita': 'Italy',
  'cze': 'Czech Republic',
  'bul': 'Bulgaria',
  'den': 'Denmark',
  'aze': 'Azerbaijan',
  'ukr': 'Ukraine',
  'bel': 'Belgium',
  'pol': 'Poland',
  'hun': 'Hungary',
  'ltu': 'Lithuania',
  'tpe': 'Taiwan',
  'jpn': 'Japan',
  'col': 'Colombia'
}

/**
 * Parse HTML table row to extract player data
 */
function parsePlayerRow(html) {
  // Extract country code
  const countryMatch = html.match(/flag-small-(\w+)/)
  const countryCode = countryMatch ? countryMatch[1] : null
  const country = countryCode ? COUNTRY_MAP[countryCode] : null

  // Extract player name
  const nameMatch = html.match(/<a href="\/player\.php[^"]*">([^<]+)<\/a>/)
  const name = nameMatch ? nameMatch[1].trim() : null

  // Extract total winnings
  const prizeMatch = html.match(/<td class="prize">\$&nbsp;([0-9,]+)/)
  const prizeStr = prizeMatch ? prizeMatch[1].replace(/,/g, '') : '0'
  const totalWinnings = parseInt(prizeStr, 10) * 100 // Convert to cents

  return { name, country, totalWinnings }
}

/**
 * Parse entire HTML file
 */
function parseHtmlFile(filePath) {
  const html = readFileSync(filePath, 'utf-8')
  const rows = html.split('<tr>')

  const players = []

  for (const row of rows) {
    if (!row.includes('class="name"')) continue

    try {
      const player = parsePlayerRow(row)
      if (player.name) {
        players.push(player)
      }
    } catch (error) {
      console.error('❌ Failed to parse row:', error.message)
    }
  }

  return players
}

/**
 * Insert or update player in database
 */
async function upsertPlayer(player) {
  const { name, country, totalWinnings } = player

  // Check if player already exists
  const { data: existing, error: checkError } = await supabase
    .from('players')
    .select('id, name, total_winnings')
    .eq('name', name)
    .maybeSingle()

  if (checkError) {
    console.error(`❌ Error checking player "${name}":`, checkError.message)
    return { success: false, error: checkError.message }
  }

  if (existing) {
    // Update if total_winnings changed
    if (existing.total_winnings !== totalWinnings) {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          total_winnings: totalWinnings,
          country: country || existing.country
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error(`❌ Failed to update "${name}":`, updateError.message)
        return { success: false, error: updateError.message }
      }

      console.log(`✅ Updated: ${name} ($${(totalWinnings / 100).toLocaleString()})`)
      return { success: true, action: 'updated' }
    } else {
      console.log(`⏭️  Skipped: ${name} (already exists)`)
      return { success: true, action: 'skipped' }
    }
  } else {
    // Insert new player
    const { error: insertError } = await supabase
      .from('players')
      .insert({
        name,
        country,
        total_winnings: totalWinnings
      })

    if (insertError) {
      console.error(`❌ Failed to insert "${name}":`, insertError.message)
      return { success: false, error: insertError.message }
    }

    console.log(`✅ Inserted: ${name} (${country}) - $${(totalWinnings / 100).toLocaleString()}`)
    return { success: true, action: 'inserted' }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Hendonmob Players Import...\n')

  // Parse HTML file
  const htmlPath = path.resolve(__dirname, '../../players_sample.md')
  console.log(`📄 Reading file: ${htmlPath}`)

  const players = parseHtmlFile(htmlPath)
  console.log(`✅ Parsed ${players.length} players\n`)

  // Upsert players
  let inserted = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const player of players) {
    const result = await upsertPlayer(player)

    if (result.success) {
      if (result.action === 'inserted') inserted++
      else if (result.action === 'updated') updated++
      else skipped++
    } else {
      failed++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Import Summary:')
  console.log(`   ✅ Inserted: ${inserted}`)
  console.log(`   🔄 Updated:  ${updated}`)
  console.log(`   ⏭️  Skipped:  ${skipped}`)
  console.log(`   ❌ Failed:   ${failed}`)
  console.log('='.repeat(50))

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
