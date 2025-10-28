/**
 * Organize EPT Videos
 *
 * This script automatically organizes EPT (European Poker Tour) videos from unsorted streams
 * into a proper Tournament/SubEvent/Stream hierarchy.
 *
 * Tournament: EPT {City} {Year}
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
  city?: string
  year?: number
  buyIn?: string
  eventType?: string
  day?: string
  raw: any
}

interface TournamentGroup {
  name: string
  city: string
  year: number
  videos: ParsedVideo[]
}

interface SubEventGroup {
  name: string
  buyIn: string
  eventType: string
  videos: ParsedVideo[]
}

// ============================================================
// Title Parsing Functions
// ============================================================

/**
 * Extract city name from video title
 */
function parseCity(title: string): string | undefined {
  const cities = [
    'Barcelona',
    'Prague',
    'Monte-Carlo',
    'Monte Carlo',
    'Cyprus',
    'Malta',
    'Paris',
    'Sochi',
    'London',
    'Vienna',
    'Deauville',
    'Dublin',
    'Berlin',
    'San Remo',
    'Sanremo',
    'Madrid',
    'Warsaw',
    'Campione',
  ]

  for (const city of cities) {
    const regex = new RegExp(`\\b${city}\\b`, 'i')
    if (regex.test(title)) {
      // Normalize city name
      if (city.toLowerCase() === 'monte carlo') return 'Monte-Carlo'
      if (city.toLowerCase() === 'san remo') return 'Sanremo'
      return city
    }
  }

  return undefined
}

/**
 * Extract year from video title
 */
function parseYear(title: string): number | undefined {
  // Match 4-digit year (2000-2099)
  const match = title.match(/\b(20\d{2})\b/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return undefined
}

/**
 * Extract buy-in amount from video title
 */
function parseBuyIn(title: string): string | undefined {
  // Match various buy-in formats: €5K, €5,300, $5.3K, £5,300, €100K
  const patterns = [
    /([€$£])(\d+)[,.]?(\d+)?K/i, // €5K, €5.3K, $100K
    /([€$£])([\d,]+)/i, // €5,300, $10,000
    /(\d+)[,.]?(\d+)?K\s*([€$£])/i, // 5K€, 100K$
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      // Normalize format to "€X,XXX" or "€XK"
      if (match[0].includes('K')) {
        return match[0].toUpperCase()
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
    if (pattern.test(title)) {
      return name
    }
  }

  // Default to "NLH" if no specific type found
  return 'NLH'
}

/**
 * Extract day information from video title
 */
function parseDay(title: string): string | undefined {
  // Match patterns: Day 1, Day 2, Final Table, Part 1, etc.
  const patterns = [
    { pattern: /Final\s*Table/i, name: 'Final Table' },
    { pattern: /Day\s*(\d+)/i, format: (m: RegExpMatchArray) => `Day ${m[1]}` },
    { pattern: /Part\s*(\d+)/i, format: (m: RegExpMatchArray) => `Part ${m[1]}` },
    { pattern: /\bD(\d+)\b/i, format: (m: RegExpMatchArray) => `Day ${m[1]}` },
  ]

  for (const { pattern, name, format } of patterns) {
    const match = title.match(pattern)
    if (match) {
      return format ? format(match) : name
    }
  }

  return undefined
}

/**
 * Parse video title and extract metadata
 */
function parseVideoTitle(video: any): ParsedVideo {
  const { id, name, video_source, video_url, published_at } = video

  const city = parseCity(name)
  const year = parseYear(name)
  const buyIn = parseBuyIn(name)
  const eventType = parseEventType(name)
  const day = parseDay(name)

  return {
    id,
    name,
    video_source,
    video_url,
    published_at,
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
 * Get EPT category ID
 */
async function getEPTCategoryId(): Promise<string> {
  // EPT category ID is 'ept'
  return 'ept'
}

/**
 * Find or create tournament
 */
async function findOrCreateTournament(
  categoryId: string,
  name: string,
  city: string,
  year: number
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
  const { data: newTournament, error: createError} = await supabase
    .from('tournaments')
    .insert({
      name,
      category: 'EPT', // Legacy category field
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

async function organizeEPTVideos() {
  console.log('🚀 Starting EPT Video Organization\\n')

  // 1. Get EPT category ID
  const categoryId = await getEPTCategoryId()
  console.log(`✅ EPT Category ID: ${categoryId}\\n`)

  // 2. Fetch all unsorted streams
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

  // 3. Parse all video titles
  console.log('🔍 Parsing video titles...\\n')
  const parsedVideos = videos.map(parseVideoTitle)

  // 4. Group by tournament (city + year)
  const tournamentGroups = new Map<string, TournamentGroup>()
  const unparsedVideos: ParsedVideo[] = []

  for (const video of parsedVideos) {
    if (!video.city || !video.year) {
      unparsedVideos.push(video)
      continue
    }

    const tournamentKey = `${video.city}-${video.year}`
    if (!tournamentGroups.has(tournamentKey)) {
      tournamentGroups.set(tournamentKey, {
        name: `EPT ${video.city} ${video.year}`,
        city: video.city,
        year: video.year,
        videos: [],
      })
    }

    tournamentGroups.get(tournamentKey)!.videos.push(video)
  }

  console.log(`✅ Found ${tournamentGroups.size} tournaments\\n`)

  // 5. Process each tournament
  let totalOrganized = 0
  let totalFailed = 0

  for (const [tournamentKey, tournamentGroup] of tournamentGroups) {
    console.log(`\\n📂 Processing: ${tournamentGroup.name}`)
    console.log(`   Videos: ${tournamentGroup.videos.length}`)

    try {
      // Create or find tournament
      const tournamentId = await findOrCreateTournament(
        categoryId,
        tournamentGroup.name,
        tournamentGroup.city,
        tournamentGroup.year
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

  // 6. Report results
  console.log('\\n' + '='.repeat(60))
  console.log('📊 ORGANIZATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Successfully organized: ${totalOrganized}`)
  console.log(`❌ Failed: ${totalFailed}`)
  console.log(`⚠️  Unparsed (missing city/year): ${unparsedVideos.length}`)

  if (unparsedVideos.length > 0) {
    console.log('\\n⚠️  Unparsed Videos:')
    unparsedVideos.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.name}`)
    })
  }
}

// Run the script
organizeEPTVideos()
  .then(() => {
    console.log('\\n✅ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
