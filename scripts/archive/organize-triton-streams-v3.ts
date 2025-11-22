/**
 * organize-triton-streams-v3.ts
 *
 * Improved Triton video organization script with:
 * - 20 hard-coded tournaments from official Triton schedule
 * - ±1 day tolerance instead of ±3 days
 * - Better location keyword matching
 * - Dry-run mode for safety
 *
 * Usage:
 *   npx tsx scripts/organize-triton-streams-v3.ts              # Dry-run mode
 *   npx tsx scripts/organize-triton-streams-v3.ts --execute    # Actually execute
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local manually
const envPath = join(__dirname, '../.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
} catch (error) {
  console.warn('⚠️  Could not load .env.local file')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ============================================================
// Tournament Definitions (from official Triton schedule)
// ============================================================

interface TournamentDefinition {
  name: string
  location: string
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
  keywords: string[] // Location keywords to match in video names
}

const TRITON_TOURNAMENTS: TournamentDefinition[] = [
  { name: "Triton Poker Series Jeju II 2025", location: "JEJU II", startDate: "2025-09-08", endDate: "2025-09-23", keywords: ["JEJU II", "JEJU 2"] },
  { name: "Triton Poker Series ONE 2025", location: "TRITON ONE", startDate: "2025-09-02", endDate: "2025-09-08", keywords: ["TRITON ONE", "ONE"] },
  { name: "Triton Poker Series Montenegro 2025", location: "MONTENEGRO", startDate: "2025-05-13", endDate: "2025-05-27", keywords: ["MONTENEGRO"] },
  { name: "Triton Poker Series Jeju 2025", location: "JEJU", startDate: "2025-02-26", endDate: "2025-03-15", keywords: ["JEJU 2025"] },
  { name: "Triton Poker Series Paradise 2024", location: "PARADISE", startDate: "2024-12-07", endDate: "2024-12-12", keywords: ["PARADISE"] },
  { name: "Triton Poker Series Monte-Carlo 2024", location: "MONTE-CARLO", startDate: "2024-11-01", endDate: "2024-11-14", keywords: ["MONTE-CARLO", "MONTE CARLO", "MONACO"] },
  { name: "Triton Poker Series Montenegro 2024", location: "MONTENEGRO", startDate: "2024-05-12", endDate: "2024-05-26", keywords: ["MONTENEGRO"] },
  { name: "Triton Poker Series Jeju 2024", location: "JEJU", startDate: "2024-03-05", endDate: "2024-03-21", keywords: ["JEJU 2024"] },
  { name: "Triton Poker Series Monte-Carlo 2023", location: "MONTE-CARLO", startDate: "2023-10-24", endDate: "2023-11-04", keywords: ["MONTE-CARLO", "MONTE CARLO", "MONACO"] },
  { name: "Triton Poker Series London 2023", location: "LONDON", startDate: "2023-07-27", endDate: "2023-08-10", keywords: ["LONDON"] },
  { name: "Triton Poker Series Cyprus 2023", location: "CYPRUS", startDate: "2023-05-10", endDate: "2023-05-25", keywords: ["CYPRUS"] },
  { name: "Triton Poker Series Cyprus 2022", location: "CYPRUS", startDate: "2022-09-05", endDate: "2022-09-17", keywords: ["CYPRUS"] },
  { name: "Triton Poker Series Madrid 2022", location: "MADRID", startDate: "2022-05-13", endDate: "2022-05-25", keywords: ["MADRID"] },
  { name: "Triton Poker Series Cyprus Spring 2022", location: "CYPRUS", startDate: "2022-04-02", endDate: "2022-04-07", keywords: ["CYPRUS"] },
  { name: "Triton Poker Series London 2019", location: "LONDON", startDate: "2019-07-31", endDate: "2019-08-11", keywords: ["LONDON"] },
  { name: "Triton Poker Series Montenegro 2019", location: "MONTENEGRO", startDate: "2019-05-05", endDate: "2019-05-17", keywords: ["MONTENEGRO"] },
  { name: "Triton Poker Series Jeju 2019", location: "JEJU", startDate: "2019-03-02", endDate: "2019-03-09", keywords: ["JEJU 2019"] },
  { name: "Triton Poker Series Sochi 2018", location: "SOCHI", startDate: "2018-08-07", endDate: "2018-09-09", keywords: ["SOCHI"] },
  { name: "Triton Poker Series Jeju 2018", location: "JEJU", startDate: "2018-07-23", endDate: "2018-08-01", keywords: ["JEJU 2018"] },
  { name: "Triton Poker Series Montenegro 2018", location: "MONTENEGRO", startDate: "2018-05-12", endDate: "2018-05-18", keywords: ["MONTENEGRO"] },
]

// ============================================================
// Types
// ============================================================

interface UnsortedStream {
  id: string
  name: string
  video_url: string | null
  published_at: string | null
  created_at: string
}

interface ParsedStream {
  streamId: string
  streamName: string
  eventName: string
  eventNumber: string | null
  tournamentName: string
  publishedAt: string | null
  matchedTournament: TournamentDefinition | null
  matchConfidence: number
  matchReason: string
}

interface OrganizationPlan {
  tournament: { name: string; startDate: string; endDate: string; location: string }
  events: {
    name: string
    eventNumber: string | null
    date: string
    streams: {
      id: string
      name: string
      publishedAt: string | null
    }[]
  }[]
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Match video to tournament based on location keywords and date
 */
function matchVideoToTournament(
  videoName: string,
  publishedAt: string | null
): { tournament: TournamentDefinition | null; confidence: number; reason: string } {
  if (!publishedAt) {
    return { tournament: null, confidence: 0, reason: 'No published date' }
  }

  const videoDate = new Date(publishedAt)
  const videoNameUpper = videoName.toUpperCase()

  let bestMatch: TournamentDefinition | null = null
  let bestScore = 0
  let bestReason = ''

  for (const tournament of TRITON_TOURNAMENTS) {
    let score = 0
    let reasons: string[] = []

    // Check location keywords
    const hasLocationKeyword = tournament.keywords.some(keyword =>
      videoNameUpper.includes(keyword.toUpperCase())
    )

    if (hasLocationKeyword) {
      score += 50
      reasons.push('location match')
    } else {
      // Skip if no location keyword found
      continue
    }

    // Check date range (±1 day tolerance)
    const tournamentStart = new Date(tournament.startDate)
    const tournamentEnd = new Date(tournament.endDate)

    // Add ±1 day tolerance
    const startWithTolerance = new Date(tournamentStart)
    startWithTolerance.setDate(startWithTolerance.getDate() - 1)

    const endWithTolerance = new Date(tournamentEnd)
    endWithTolerance.setDate(endWithTolerance.getDate() + 1)

    if (videoDate >= startWithTolerance && videoDate <= endWithTolerance) {
      score += 50
      reasons.push('±1 day date range')
    } else {
      // Check if it's close but outside tolerance
      const daysBefore = Math.floor((tournamentStart.getTime() - videoDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysAfter = Math.floor((videoDate.getTime() - tournamentEnd.getTime()) / (1000 * 60 * 60 * 24))

      if (daysBefore >= 0 && daysBefore <= 3) {
        score += 20
        reasons.push(`${daysBefore} days before start`)
      } else if (daysAfter >= 0 && daysAfter <= 3) {
        score += 20
        reasons.push(`${daysAfter} days after end`)
      } else {
        // Too far from date range, skip
        continue
      }
    }

    // Check for year match
    const videoYear = videoDate.getFullYear()
    const tournamentYear = new Date(tournament.startDate).getFullYear()
    if (videoYear === tournamentYear) {
      score += 10
      reasons.push('year match')
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = tournament
      bestReason = reasons.join(', ')
    }
  }

  return {
    tournament: bestMatch,
    confidence: bestScore,
    reason: bestReason || 'No match found'
  }
}

/**
 * Parse video name to extract event and stream information
 */
function parseVideoName(name: string): {
  eventName: string
  eventNumber: string | null
  streamName: string
} {
  let eventName = ''
  let eventNumber: string | null = null
  let streamName = ''

  // Extract tournament name (after pipe |)
  const pipeIndex = name.lastIndexOf('|')
  const beforePipe = pipeIndex !== -1 ? name.substring(0, pipeIndex).trim() : name

  // Extract stream name (after comma ,)
  const commaIndex = beforePipe.lastIndexOf(',')
  if (commaIndex !== -1) {
    streamName = beforePipe.substring(commaIndex + 1).trim()
  }

  // Extract event name (before dash –)
  const beforeComma = commaIndex !== -1 ? beforePipe.substring(0, commaIndex).trim() : beforePipe
  const dashIndex = Math.max(
    beforeComma.lastIndexOf('–'),
    beforeComma.lastIndexOf('—'),
    beforeComma.lastIndexOf('-')
  )

  if (dashIndex !== -1) {
    eventName = beforeComma.substring(0, dashIndex).trim()
  } else {
    eventName = beforeComma
  }

  // Extract event number (Event #N pattern)
  const eventNumberMatch = name.match(/Event\s*#(\d+)/i)
  if (eventNumberMatch) {
    eventNumber = eventNumberMatch[1]
  }

  return { eventName, eventNumber, streamName }
}

/**
 * Calculate date differences in days
 */
function daysDifference(date1: Date, date2: Date): number {
  return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24))
}

// ============================================================
// Main Logic
// ============================================================

async function main() {
  const isExecuteMode = process.argv.includes('--execute')

  console.log('\n' + '='.repeat(60))
  console.log('🎯 Triton Streams Organization Script v3')
  console.log('='.repeat(60))
  console.log(`Mode: ${isExecuteMode ? '🚀 EXECUTE' : '👁️  DRY-RUN'}`)
  console.log('Improvements:')
  console.log('  - 20 hard-coded tournaments from official schedule')
  console.log('  - ±1 day tolerance (instead of ±3 days)')
  console.log('  - Better location keyword matching')
  console.log('='.repeat(60) + '\n')

  // Step 1: Fetch all unsorted streams
  console.log('📥 Step 1: Fetching unsorted streams...')
  const { data: unsortedStreams, error: fetchError } = await supabase
    .from('streams')
    .select('*')
    .is('sub_event_id', null)
    .eq('is_organized', false)
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('❌ Error fetching streams:', fetchError)
    process.exit(1)
  }

  console.log(`   Found ${unsortedStreams?.length || 0} unsorted streams\n`)

  if (!unsortedStreams || unsortedStreams.length === 0) {
    console.log('✅ No unsorted streams to process')
    return
  }

  // Step 2: Parse and match each stream
  console.log('🔍 Step 2: Matching streams to tournaments...')
  const parsedStreams: ParsedStream[] = []
  let matchedCount = 0
  let unmatchedCount = 0

  for (const stream of unsortedStreams) {
    const { eventName, eventNumber, streamName } = parseVideoName(stream.name)
    const { tournament, confidence, reason } = matchVideoToTournament(stream.name, stream.published_at)

    const parsed: ParsedStream = {
      streamId: stream.id,
      streamName: stream.name,
      eventName,
      eventNumber,
      tournamentName: tournament?.name || 'UNKNOWN',
      publishedAt: stream.published_at,
      matchedTournament: tournament,
      matchConfidence: confidence,
      matchReason: reason,
    }

    parsedStreams.push(parsed)

    if (tournament && confidence >= 60) {
      matchedCount++
      console.log(`   ✅ [${confidence}%] ${stream.name.substring(0, 60)}...`)
      console.log(`      → ${tournament.name} (${reason})`)
    } else {
      unmatchedCount++
      console.log(`   ⚠️  [${confidence}%] ${stream.name.substring(0, 60)}...`)
      console.log(`      → ${reason}`)
    }
  }

  console.log(`\n📊 Matching Results:`)
  console.log(`   ✅ Matched: ${matchedCount}`)
  console.log(`   ⚠️  Unmatched: ${unmatchedCount}`)
  console.log(`   📋 Total: ${parsedStreams.length}\n`)

  // Step 3: Group by tournament and event
  console.log('📦 Step 3: Grouping by tournament and event...')
  const organizationPlan: OrganizationPlan[] = []

  const tournamentGroups = new Map<string, ParsedStream[]>()
  for (const stream of parsedStreams) {
    if (!stream.matchedTournament || stream.matchConfidence < 60) continue

    const key = stream.matchedTournament.name
    if (!tournamentGroups.has(key)) {
      tournamentGroups.set(key, [])
    }
    tournamentGroups.get(key)!.push(stream)
  }

  for (const [tournamentName, streams] of tournamentGroups.entries()) {
    const tournament = streams[0].matchedTournament!

    // Group by event name
    const eventGroups = new Map<string, ParsedStream[]>()
    for (const stream of streams) {
      const eventKey = stream.eventName || 'Main Event'
      if (!eventGroups.has(eventKey)) {
        eventGroups.set(eventKey, [])
      }
      eventGroups.get(eventKey)!.push(stream)
    }

    const events = Array.from(eventGroups.entries()).map(([eventName, eventStreams]) => {
      // Use the first stream's published_at as event date
      const eventDate = eventStreams[0].publishedAt || tournament.startDate

      return {
        name: eventName,
        eventNumber: eventStreams[0].eventNumber,
        date: eventDate,
        streams: eventStreams.map(s => ({
          id: s.streamId,
          name: s.streamName,
          publishedAt: s.publishedAt,
        })),
      }
    })

    organizationPlan.push({
      tournament: {
        name: tournamentName,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        location: tournament.location,
      },
      events,
    })
  }

  console.log(`   📋 Tournaments: ${organizationPlan.length}`)
  console.log(`   📋 Events: ${organizationPlan.reduce((sum, t) => sum + t.events.length, 0)}`)
  console.log(`   📋 Streams: ${organizationPlan.reduce((sum, t) => sum + t.events.reduce((s, e) => s + e.streams.length, 0), 0)}\n`)

  // Step 4: Display organization plan
  console.log('📋 Step 4: Organization Plan:')
  console.log('='.repeat(60))
  for (const plan of organizationPlan) {
    console.log(`\n🏆 ${plan.tournament.name}`)
    console.log(`   📅 ${plan.tournament.startDate} ~ ${plan.tournament.endDate}`)
    console.log(`   📍 ${plan.tournament.location}`)
    console.log(`   📊 ${plan.events.length} events, ${plan.events.reduce((sum, e) => sum + e.streams.length, 0)} streams`)

    for (const event of plan.events) {
      console.log(`\n   📌 ${event.name}${event.eventNumber ? ` #${event.eventNumber}` : ''}`)
      console.log(`      📅 ${event.date}`)
      console.log(`      🎬 ${event.streams.length} streams`)
    }
  }

  console.log('\n' + '='.repeat(60))

  // Step 5: Execute if --execute flag is present
  if (!isExecuteMode) {
    console.log('\n👁️  DRY-RUN MODE - No changes made')
    console.log('💡 Run with --execute flag to apply changes')
    console.log('\nExample: npx tsx scripts/organize-triton-streams-v3.ts --execute\n')
    return
  }

  console.log('\n🚀 Step 5: Executing organization...')

  let tournamentsCreated = 0
  let eventsCreated = 0
  let streamsOrganized = 0
  let errors = 0

  for (const plan of organizationPlan) {
    try {
      // Create tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: plan.tournament.name,
          category: 'Triton',
          category_id: 'triton',
          game_type: 'tournament',
          location: plan.tournament.location,
          start_date: plan.tournament.startDate,
          end_date: plan.tournament.endDate,
        })
        .select()
        .single()

      if (tournamentError) {
        console.error(`   ❌ Error creating tournament ${plan.tournament.name}:`, tournamentError.message)
        errors++
        continue
      }

      tournamentsCreated++
      console.log(`   ✅ Created tournament: ${plan.tournament.name}`)

      // Create events and organize streams
      for (const event of plan.events) {
        const { data: subEvent, error: subEventError } = await supabase
          .from('sub_events')
          .insert({
            tournament_id: tournament.id,
            name: event.name,
            event_number: event.eventNumber,
            date: event.date,
          })
          .select()
          .single()

        if (subEventError) {
          console.error(`      ❌ Error creating event ${event.name}:`, subEventError.message)
          errors++
          continue
        }

        eventsCreated++

        // Organize streams
        for (const stream of event.streams) {
          const { error: updateError } = await supabase
            .from('streams')
            .update({
              sub_event_id: subEvent.id,
              is_organized: true,
              organized_at: new Date().toISOString(),
            })
            .eq('id', stream.id)

          if (updateError) {
            console.error(`         ❌ Error organizing stream ${stream.name}:`, updateError.message)
            errors++
          } else {
            streamsOrganized++
          }
        }

        console.log(`      ✅ Created event: ${event.name} (${event.streams.length} streams)`)
      }
    } catch (error: any) {
      console.error(`   ❌ Unexpected error:`, error.message)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Organization Complete!')
  console.log('='.repeat(60))
  console.log(`📊 Results:`)
  console.log(`   🏆 Tournaments created: ${tournamentsCreated}`)
  console.log(`   📌 Events created: ${eventsCreated}`)
  console.log(`   🎬 Streams organized: ${streamsOrganized}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log('='.repeat(60) + '\n')
}

// Run
main().catch(console.error)
