import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Copy parsing functions from organize-pokerstars-videos.ts
function cleanTitle(title: string): string {
  return title
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

function parseTournamentType(title: string): string | undefined {
  const cleanedTitle = cleanTitle(title)

  const tours = [
    { pattern: /\bEPT\b|European Poker Tour/i, name: 'EPT' },
    { pattern: /\bPCA\b|PokerStars Caribbean Adventure/i, name: 'PCA' },
  ]

  for (const { pattern, name } of tours) {
    if (pattern.test(cleanedTitle)) {
      return name
    }
  }

  return undefined
}

function normalizeCity(city: string): string {
  const cityMap: Record<string, string> = {
    wiedeń: 'Vienna',
    барселона: 'Barcelona',
    барселоне: 'Barcelona',
  }

  const normalized = cityMap[city.toLowerCase()]
  return normalized || city
}

function parseCity(title: string): string | undefined {
  const cleanedTitle = cleanTitle(title)

  const cities = ['Barcelona', 'Vienna', 'Bahamas']
  const multilingualCities = ['Wiedeń', 'Барселона', 'Барселоне']

  const allCities = [...cities, ...multilingualCities]

  for (const city of allCities) {
    const regex = new RegExp(`\\b${city}\\b`, 'i')
    if (regex.test(cleanedTitle)) {
      console.log(`  ✓ Found city: ${city} → ${normalizeCity(city)}`)
      return normalizeCity(city)
    }
  }

  return undefined
}

function parseYear(title: string): number | undefined {
  const cleanedTitle = cleanTitle(title)

  // EPT Season mapping
  const eptSeasonMap: Record<number, number> = {
    10: 2014,
    11: 2015,
  }

  const seasonMatch = cleanedTitle.match(/EPT\s+(\d+)/i)
  if (seasonMatch) {
    const season = parseInt(seasonMatch[1], 10)
    if (eptSeasonMap[season]) {
      console.log(`  ✓ Found EPT season: ${season} → ${eptSeasonMap[season]}`)
      return eptSeasonMap[season]
    }
  }

  const yearMatch = cleanedTitle.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    console.log(`  ✓ Found year: ${yearMatch[1]}`)
    return parseInt(yearMatch[1], 10)
  }

  return undefined
}

async function testParsing() {
  const testTitles = [
    'EPT 10 Wiedeń 2014 -- Turniej Główny, Dzień 4',
    'EPT 11 Барселона 2014 - Главное Событие, День 1B, PokerStars',
    'Día 2 del Evento Principal de la PCA (cartas descubiertas)',
  ]

  console.log('Testing video title parsing:\n')

  for (const title of testTitles) {
    console.log(`Testing: "${title}"`)
    const tour = parseTournamentType(title)
    const city = parseCity(title)
    const year = parseYear(title)

    console.log(`  Tour: ${tour || 'NOT FOUND'}`)
    console.log(`  City: ${city || 'NOT FOUND'}`)
    console.log(`  Year: ${year || 'NOT FOUND'}`)
    console.log()
  }
}

testParsing().then(() => process.exit(0))
