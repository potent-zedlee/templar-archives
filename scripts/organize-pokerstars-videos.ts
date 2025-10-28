/**
 * Organize PokerStars Live Tournament Videos
 *
 * This script automatically organizes PokerStars Live tournament videos from unsorted streams
 * into a proper Tournament/SubEvent/Stream hierarchy.
 *
 * Supports: EPT, PCA, LAPT, BSOP, APPT, UKIPT, PokerStars Championship, etc.
 *
 * Tournament: {Tour} {City} {Year}
 * SubEvent: {Buy-in} {Event Type}
 * Stream: Parsed day name from video title
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ============================================================
// Type Definitions
// ============================================================

interface ParsedVideo {
  id: string
  name: string
  video_source: string
  video_url: string
  published_at: string
  tour?: string // EPT, PCA, LAPT, BSOP, APPT, etc.
  city?: string
  year?: number
  buyIn?: string
  eventType?: string
  day?: string
  raw: any
}

interface TournamentGroup {
  name: string
  tour: string
  city: string
  year: number
  categoryId: string
  videos: ParsedVideo[]
}

interface SubEventGroup {
  name: string
  buyIn: string
  eventType: string
  videos: ParsedVideo[]
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Clean HTML entities and special characters
 */
function cleanTitle(title: string): string {
  return title
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Normalize city name (handle multilingual variations)
 */
function normalizeCity(city: string): string {
  const cityMap: Record<string, string> = {
    // Polish
    wiedeń: 'Vienna',
    londyn: 'London',
    monako: 'Monaco',
    barcelonie: 'Barcelona',
    praze: 'Prague',
    paryż: 'Paris',
    dublinie: 'Dublin',

    // Russian (Cyrillic) - including prepositional case (в + prepositional)
    барселона: 'Barcelona',
    барселоне: 'Barcelona', // в Барселоне
    вене: 'Vienna', // в Вене
    вену: 'Vienna',
    вена: 'Vienna',
    лондоне: 'London', // в Лондоне
    лондон: 'London',
    монако: 'Monaco', // в Монако (doesn't change)
    дублине: 'Dublin', // в Дублине
    дублин: 'Dublin',
    праге: 'Prague', // в Праге
    прага: 'Prague',
    сочи: 'Sochi', // в Сочи (doesn't change)
    мальте: 'Malta', // в Мальте
    мальта: 'Malta',

    // Spanish
    mónaco: 'Monaco',
    londres: 'London',

    // Czech
    monaku: 'Monaco',

    // Normalize
    'monte carlo': 'Monte-Carlo',
    'monte-carlo': 'Monte-Carlo',
    'san remo': 'Sanremo',
  }

  const normalized = cityMap[city.toLowerCase()]
  return normalized || city
}

// ============================================================
// Title Parsing Functions
// ============================================================

/**
 * Identify tournament tour type
 */
function parseTournamentType(title: string): string | undefined {
  const cleanedTitle = cleanTitle(title)

  const tours = [
    { pattern: /\bEPT\b|European Poker Tour/i, name: 'EPT', categoryId: 'ept' },
    { pattern: /\bPCA\b|PokerStars Caribbean Adventure/i, name: 'PCA', categoryId: 'pca' },
    { pattern: /\bLAPT\b|Latin American Poker Tour/i, name: 'LAPT', categoryId: 'lapt' },
    { pattern: /\bBSOP\b|Brazilian Series of Poker/i, name: 'BSOP', categoryId: 'bsop' },
    { pattern: /\bAPPT\b|Asia Pacific Poker Tour/i, name: 'APPT', categoryId: 'appt' },
    { pattern: /\bNAPT\b|North American Poker Tour/i, name: 'NAPT', categoryId: 'napt' },
    { pattern: /\bUKIPT\b|UK.*Ireland Poker Tour/i, name: 'UKIPT', categoryId: 'ukipt' },
    { pattern: /PokerStars Championship/i, name: 'PokerStars Championship', categoryId: 'ept' }, // Championship was EPT rebranding
    { pattern: /PokerStars Festival/i, name: 'PokerStars Festival', categoryId: 'ept' },
  ]

  for (const { pattern, name } of tours) {
    if (pattern.test(cleanedTitle)) {
      return name
    }
  }

  return undefined
}

/**
 * Get category ID for tour
 */
function getCategoryIdForTour(tour: string): string {
  const categoryMap: Record<string, string> = {
    'EPT': 'ept',
    'PCA': 'pca',
    'LAPT': 'lapt',
    'BSOP': 'bsop',
    'APPT': 'appt',
    'NAPT': 'napt',
    'UKIPT': 'ukipt',
    'PokerStars Championship': 'ept',
    'PokerStars Festival': 'ept',
  }

  return categoryMap[tour] || 'ept'
}

/**
 * Extract city name from video title (with multilingual support)
 */
function parseCity(title: string): string | undefined {
  const cleanedTitle = cleanTitle(title)

  // Special cases: tournaments always in specific cities
  if (/Grand\s*Final/i.test(cleanedTitle)) {
    return 'Monaco' // EPT Grand Final is always in Monaco
  }
  if (/\bPCA\b|PokerStars Caribbean Adventure/i.test(cleanedTitle)) {
    return 'Bahamas' // PCA is always in Bahamas
  }
  if (/\bBSOP\b|Brazilian Series of Poker/i.test(cleanedTitle)) {
    return 'São Paulo' // BSOP is typically in São Paulo
  }

  // English city names
  const cities = [
    'Barcelona', 'Prague', 'Monte-Carlo', 'Monte Carlo', 'Cyprus', 'Malta',
    'Paris', 'Sochi', 'London', 'Vienna', 'Deauville', 'Dublin', 'Berlin',
    'San Remo', 'Sanremo', 'Madrid', 'Warsaw', 'Campione', 'Rozvadov',
    'Bahamas', 'Panama', 'São Paulo', 'Sao Paulo', 'Manila', 'Las Vegas',
  ]

  // Multilingual variations (Polish, Russian, Spanish, Czech, Portuguese)
  const multilingualCities = [
    // Polish
    'Wiedeń', 'Londyn', 'Monako', 'Barcelonie', 'Praze', 'Paryż', 'Dublinie',
    // Russian (including prepositional case: в + city)
    'Барселона', 'Барселоне', // Barcelona
    'Вене', 'Вену', 'Вена', // Vienna
    'Лондоне', 'Лондон', // London
    'Монако', // Monaco (doesn't change)
    'Дублине', 'Дублин', // Dublin
    'Праге', 'Прага', // Prague
    'Сочи', // Sochi (doesn't change)
    'Мальте', 'Мальта', // Malta
    // Spanish
    'Mónaco', 'Londres', // Monaco, London
    // Czech
    'Monaku',
  ]

  const allCities = [...cities, ...multilingualCities]

  // First try exact word boundary match for English cities
  for (const city of cities) {
    const regex = new RegExp(`\\b${city}\\b`, 'i')
    if (regex.test(cleanedTitle)) {
      return normalizeCity(city)
    }
  }

  // For multilingual cities, use simple case-insensitive includes
  // (word boundary doesn't work well with Cyrillic and special characters)
  for (const city of multilingualCities) {
    if (cleanedTitle.toLowerCase().includes(city.toLowerCase())) {
      return normalizeCity(city)
    }
  }

  return undefined
}

/**
 * Extract year from video title (including EPT season numbers)
 */
function parseYear(title: string): number | undefined {
  const cleanedTitle = cleanTitle(title)

  // EPT Season to Year mapping
  const eptSeasonMap: Record<number, number> = {
    1: 2004, 2: 2005, 3: 2006, 4: 2007, 5: 2008, 6: 2009,
    7: 2010, 8: 2011, 9: 2012, 10: 2014, 11: 2015, 12: 2016, 13: 2017,
  }

  // Try to match EPT season number (EPT 10, EPT 11, etc.)
  const seasonMatch = cleanedTitle.match(/EPT\s+(\d+)/i)
  if (seasonMatch) {
    const season = parseInt(seasonMatch[1], 10)
    if (eptSeasonMap[season]) {
      return eptSeasonMap[season]
    }
  }

  // Match 4-digit year (2000-2099)
  const yearMatch = cleanedTitle.match(/\b(20\d{2})\b/)
  if (yearMatch) {
    return parseInt(yearMatch[1], 10)
  }

  return undefined
}

/**
 * Extract buy-in amount from video title
 */
function parseBuyIn(title: string): string | undefined {
  const cleanedTitle = cleanTitle(title)

  // Match various buy-in formats: €5K, €5,300, $5.3K, £5,300, €100K, R$250K
  const patterns = [
    /([€$£R]\$?)(\d+)[,.]?(\d+)?K/i, // €5K, €5.3K, $100K, R$250K
    /([€$£])([\d,]+)/i, // €5,300, $10,000
    /(\d+)[,.]?(\d+)?K\s*([€$£])/i, // 5K€, 100K$
  ]

  for (const pattern of patterns) {
    const match = cleanedTitle.match(pattern)
    if (match) {
      // Normalize format to "€X,XXX" or "€XK"
      if (match[0].includes('K')) {
        return match[0].toUpperCase().replace('R$', 'R$')
      } else {
        return match[0]
      }
    }
  }

  return undefined
}

/**
 * Extract event type from video title
 */
function parseEventType(title: string): string | undefined {
  const cleanedTitle = cleanTitle(title)

  const eventTypes = [
    { pattern: /Main\s*Event/i, name: 'Main Event' },
    { pattern: /Super\s*High\s*Roller/i, name: 'Super High Roller' },
    { pattern: /High\s*Roller/i, name: 'High Roller' },
    { pattern: /PKO/i, name: 'PKO' },
    { pattern: /Progressive\s*Knockout/i, name: 'PKO' },
    { pattern: /FPS/i, name: 'FPS' },
    { pattern: /France\s*Poker\s*Series/i, name: 'FPS' },
    { pattern: /Spin\s*&\s*Go/i, name: 'Spin & Go' },
    { pattern: /Mystery\s*Bounty/i, name: 'Mystery Bounty' },
    { pattern: /Turbo/i, name: 'Turbo' },
    { pattern: /NLH/i, name: 'NLH' },
    { pattern: /No[-\s]?Limit\s*Hold'?em/i, name: 'NLH' },
    { pattern: /PLO/i, name: 'PLO' },
    { pattern: /Pot[-\s]?Limit\s*Omaha/i, name: 'PLO' },
  ]

  for (const { pattern, name } of eventTypes) {
    if (pattern.test(cleanedTitle)) {
      return name
    }
  }

  // Default to "NLH" if no specific type found
  return 'NLH'
}

/**
 * Extract day information from video title (multilingual)
 */
function parseDay(title: string): string | undefined {
  const cleanedTitle = cleanTitle(title)

  // Match patterns: Day 1, Day 2, Final Table, Part 1, etc.
  // Multilingual: Día, Den, Dzień, День, Jour, Dia
  const patterns = [
    { pattern: /Final\s*Table|Finałowy\s*stół|Финальный\s*стол|Mesa\s*Final|table\s*finale/i, name: 'Final Table' },
    { pattern: /Day\s*(\d+)|Día\s*(\d+)|Den\s*(\d+)|Dzień\s*(\d+)|День\s*(\d+)|Jour\s*(\d+)|Dia\s*(\d+)/i, format: (m: RegExpMatchArray) => {
      const dayNum = m.slice(1).find(d => d !== undefined)
      return `Day ${dayNum}`
    }},
    { pattern: /Part\s*(\d+)/i, format: (m: RegExpMatchArray) => `Part ${m[1]}` },
    { pattern: /\bD(\d+)\b/i, format: (m: RegExpMatchArray) => `Day ${m[1]}` },
  ]

  for (const { pattern, name, format } of patterns) {
    const match = cleanedTitle.match(pattern)
    if (match) {
      return format ? format(match) : name
    }
  }

  return undefined
}

/**
 * Check if video is an online tournament (should be excluded)
 */
function isOnlineTournament(title: string): boolean {
  const onlineKeywords = [
    'SCOOP', 'WCOOP', 'TCOOP', 'FTOPS', 'MICOOP', 'PACOOP', 'NJCOOP', 'PASCOOP',
    'SUNDAY MILLION', 'Sunday Million', 'SUNDAY STORM', 'Sunday Storm',
    'ONLINE', 'Online', 'Virtual', 'VIRTUAL',
    'EPT Online', 'EPT ONLINE',
  ]

  const cleanedTitle = cleanTitle(title)
  return onlineKeywords.some(keyword => new RegExp(`${keyword}`, 'i').test(cleanedTitle))
}

/**
 * Parse video title and extract metadata
 */
function parseVideoTitle(video: any): ParsedVideo {
  const { id, name, video_source, video_url, published_at } = video

  const tour = parseTournamentType(name)
  const city = parseCity(name)
  let year = parseYear(name)

  // Fallback: Use published_at year if no year found in title
  if (!year && published_at) {
    const publishedYear = new Date(published_at).getFullYear()
    if (publishedYear >= 2000 && publishedYear <= 2099) {
      year = publishedYear
    }
  }

  const buyIn = parseBuyIn(name)
  const eventType = parseEventType(name)
  const day = parseDay(name)

  return {
    id,
    name,
    video_source,
    video_url,
    published_at,
    tour,
    city,
    year,
    buyIn,
    eventType,
    day,
    raw: video,
  }
}

// ============================================================
// Tournament/SubEvent Management Functions
// ============================================================

/**
 * Get category name for display
 */
function getCategoryName(tour: string): string {
  const categoryNames: Record<string, string> = {
    'EPT': 'EPT',
    'PCA': 'PCA',
    'LAPT': 'LAPT',
    'BSOP': 'BSOP',
    'APPT': 'APPT',
    'NAPT': 'NAPT',
    'UKIPT': 'UKIPT',
    'PokerStars Championship': 'PokerStars Championship',
    'PokerStars Festival': 'PokerStars Festival',
  }

  return categoryNames[tour] || tour
}

/**
 * Find or create tournament
 */
async function findOrCreateTournament(
  categoryId: string,
  name: string,
  city: string,
  year: number,
  categoryName: string
): Promise<string> {
  // Try to find existing tournament
  const { data: existing, error: findError } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', name)
    .eq('category_id', categoryId)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new tournament
  const { data: newTournament, error: createError } = await supabase
    .from('tournaments')
    .insert({
      name,
      category: categoryName,
      category_id: categoryId,
      game_type: 'tournament',
      location: city,
      city: city,
      start_date: `${year}-01-01`, // Placeholder date
      end_date: `${year}-12-31`, // Placeholder date
    })
    .select('id')
    .single()

  if (createError || !newTournament) {
    throw new Error(`Failed to create tournament: ${createError?.message}`)
  }

  return newTournament.id
}

/**
 * Find or create sub-event
 */
async function findOrCreateSubEvent(
  tournamentId: string,
  name: string,
  buyIn: string,
  eventType: string
): Promise<string> {
  // Try to find existing sub-event
  const { data: existing, error: findError } = await supabase
    .from('sub_events')
    .select('id')
    .eq('name', name)
    .eq('tournament_id', tournamentId)
    .single()

  if (existing) {
    return existing.id
  }

  // Create new sub-event
  const { data: newSubEvent, error: createError } = await supabase
    .from('sub_events')
    .insert({
      name,
      tournament_id: tournamentId,
      buy_in: buyIn,
      date: new Date().toISOString().split('T')[0], // Placeholder date (today)
      event_number: null, // Will be set manually if needed
    })
    .select('id')
    .single()

  if (createError || !newSubEvent) {
    throw new Error(`Failed to create sub-event: ${createError?.message}`)
  }

  return newSubEvent.id
}

/**
 * Organize stream into sub-event
 */
async function organizeStream(streamId: string, subEventId: string): Promise<void> {
  const { error } = await supabase
    .from('streams')
    .update({
      sub_event_id: subEventId,
      is_organized: true,
    })
    .eq('id', streamId)

  if (error) {
    throw new Error(`Failed to organize stream: ${error.message}`)
  }
}

// ============================================================
// Main Organization Logic
// ============================================================

async function organizePokerStarsVideos() {
  console.log('🚀 Starting PokerStars Live Tournament Organization\\n')

  // 1. Fetch all unsorted streams
  console.log('🔍 Fetching unsorted videos...\\n')
  const { data: videos, error } = await supabase
    .from('streams')
    .select('id, name, video_source, video_url, published_at, created_at')
    .is('sub_event_id', null)
    .eq('is_organized', false)
    .order('published_at', { ascending: true })

  if (error) {
    console.error('❌ Error fetching videos:', error)
    process.exit(1)
  }

  if (!videos || videos.length === 0) {
    console.log('✅ No unsorted videos found')
    return
  }

  console.log(`📊 Total unsorted videos: ${videos.length}\\n`)

  // 2. Parse all video titles
  console.log('🔍 Parsing video titles...\\n')
  const parsedVideos = videos.map(parseVideoTitle)

  // 3. Filter out online tournaments
  const liveVideos = parsedVideos.filter(video => !isOnlineTournament(video.name))
  const onlineVideos = parsedVideos.filter(video => isOnlineTournament(video.name))

  console.log(`🎰 Live tournaments: ${liveVideos.length}`)
  console.log(`💻 Online tournaments (excluded): ${onlineVideos.length}\\n`)

  // 4. Group by tournament (tour + city + year)
  const tournamentGroups = new Map<string, TournamentGroup>()
  const unparsedVideos: ParsedVideo[] = []

  for (const video of liveVideos) {
    if (!video.tour || !video.city || !video.year) {
      unparsedVideos.push(video)
      continue
    }

    const tournamentKey = `${video.tour}-${video.city}-${video.year}`
    if (!tournamentGroups.has(tournamentKey)) {
      const categoryId = getCategoryIdForTour(video.tour)
      const categoryName = getCategoryName(video.tour)

      tournamentGroups.set(tournamentKey, {
        name: `${video.tour} ${video.city} ${video.year}`,
        tour: video.tour,
        city: video.city,
        year: video.year,
        categoryId: categoryId,
        videos: [],
      })
    }

    tournamentGroups.get(tournamentKey)!.videos.push(video)
  }

  console.log(`✅ Found ${tournamentGroups.size} tournaments\\n`)

  // 4. Process each tournament
  let totalOrganized = 0
  let totalFailed = 0

  for (const [tournamentKey, tournamentGroup] of tournamentGroups) {
    console.log(`\\n📂 Processing: ${tournamentGroup.name}`)
    console.log(`   Videos: ${tournamentGroup.videos.length}`)

    try {
      const categoryName = getCategoryName(tournamentGroup.tour)

      // Create or find tournament
      const tournamentId = await findOrCreateTournament(
        tournamentGroup.categoryId,
        tournamentGroup.name,
        tournamentGroup.city,
        tournamentGroup.year,
        categoryName
      )

      // Group videos by sub-event (buy-in + event type)
      const subEventGroups = new Map<string, SubEventGroup>()

      for (const video of tournamentGroup.videos) {
        const buyIn = video.buyIn || 'Unknown'
        const eventType = video.eventType || 'NLH'
        const subEventKey = `${buyIn}-${eventType}`

        if (!subEventGroups.has(subEventKey)) {
          subEventGroups.set(subEventKey, {
            name: `${buyIn} ${eventType}`,
            buyIn,
            eventType,
            videos: [],
          })
        }

        subEventGroups.get(subEventKey)!.videos.push(video)
      }

      console.log(`   Sub-events: ${subEventGroups.size}`)

      // Process each sub-event
      for (const [subEventKey, subEventGroup] of subEventGroups) {
        try {
          const subEventId = await findOrCreateSubEvent(
            tournamentId,
            subEventGroup.name,
            subEventGroup.buyIn,
            subEventGroup.eventType
          )

          console.log(`   ✅ Sub-event: ${subEventGroup.name} (${subEventGroup.videos.length} videos)`)

          // Organize each video
          for (const video of subEventGroup.videos) {
            try {
              await organizeStream(video.id, subEventId)
              totalOrganized++
              console.log(`      ✅ ${video.name}`)
            } catch (err) {
              totalFailed++
              console.error(`      ❌ Failed: ${video.name}`, err)
            }
          }
        } catch (err) {
          totalFailed += subEventGroup.videos.length
          console.error(`   ❌ Failed sub-event: ${subEventGroup.name}`, err)
        }
      }
    } catch (err) {
      totalFailed += tournamentGroup.videos.length
      console.error(`❌ Failed tournament: ${tournamentGroup.name}`, err)
    }
  }

  // 5. Report results
  console.log('\\n' + '='.repeat(60))
  console.log('📊 ORGANIZATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Successfully organized: ${totalOrganized}`)
  console.log(`❌ Failed: ${totalFailed}`)
  console.log(`⚠️  Unparsed (missing tour/city/year): ${unparsedVideos.length}`)

  if (unparsedVideos.length > 0 && unparsedVideos.length < 50) {
    console.log('\\n⚠️  Unparsed Videos:')
    unparsedVideos.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.name}`)
    })
  } else if (unparsedVideos.length >= 50) {
    console.log(`\\n⚠️  ${unparsedVideos.length} videos could not be parsed (likely online tournaments or non-Live events)`)
  }
}

// Run the script
organizePokerStarsVideos()
  .then(() => {
    console.log('\\n✅ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
