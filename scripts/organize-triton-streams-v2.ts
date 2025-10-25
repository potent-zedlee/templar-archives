import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      const value = valueParts.join('=')
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    }
  })
}

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Types
interface VideoStream {
  id: string
  name: string
  video_url: string
  published_at: string | null
  sub_event_id: string | null
  is_organized: boolean
}

interface Tournament {
  id: string
  name: string
  start_date: string
  end_date: string
  category: string
}

interface SubEvent {
  id: string
  name: string
  event_number: string | null
  tournament_id: string
}

interface ParsedName {
  tournamentName: string | null
  eventName: string | null
  streamName: string | null
  eventNumber: string | null
}

interface ProcessResult {
  total: number
  tritonVideos: number
  matched: number
  tournamentsCreated: number
  eventsCreated: number
  streamsUpdated: number
  errors: number
  details: Array<{
    streamName: string
    action: string
    tournamentName?: string
    eventName?: string
    error?: string
  }>
}

// Helper: Parse video name with NEW logic
function parseVideoName(name: string): ParsedName | null {
  /**
   * NEW PARSING LOGIC:
   * Tournament (최상위): 파이프(|) 뒷부분
   * Event (중간): 하이픈(–) 앞부분
   * Stream (최하위): 쉼표(,) 뒷부분
   *
   * Example:
   * "$150K NLH 8-Handed – Event #7, Final Table | Triton Poker Series Jeju II 2025"
   * →  Tournament: "Triton Poker Series Jeju II 2025"
   * →  Event: "$150K NLH 8-Handed"
   * →  EventNumber: "7"
   * →  Stream: "Final Table"
   */

  // Must contain "Triton" to be processed
  if (!name.toLowerCase().includes('triton')) {
    return null
  }

  let tournamentName: string | null = null
  let eventName: string | null = null
  let streamName: string | null = null
  let eventNumber: string | null = null

  // 1. Extract Tournament name (after pipe |)
  const pipeIndex = name.lastIndexOf('|')
  if (pipeIndex !== -1) {
    tournamentName = name.substring(pipeIndex + 1).trim()
  }

  // 2. Get the part before pipe (contains Event and Stream)
  const beforePipe = pipeIndex !== -1 ? name.substring(0, pipeIndex).trim() : name

  // 3. Extract Stream name (after comma ,)
  const commaIndex = beforePipe.lastIndexOf(',')
  if (commaIndex !== -1) {
    streamName = beforePipe.substring(commaIndex + 1).trim()
  }

  // 4. Get the part before comma (contains Event)
  const beforeComma = commaIndex !== -1 ? beforePipe.substring(0, commaIndex).trim() : beforePipe

  // 5. Extract Event name (before long dash –)
  // Try different dash characters
  const dashIndex = Math.max(
    beforeComma.lastIndexOf('–'),  // Em dash
    beforeComma.lastIndexOf('—'),  // En dash
    beforeComma.lastIndexOf('-')   // Regular dash (as fallback)
  )

  if (dashIndex !== -1) {
    eventName = beforeComma.substring(0, dashIndex).trim()
  } else {
    // No dash found, use whole part as event name
    eventName = beforeComma.trim()
  }

  // 6. Extract Event Number (Event #N pattern)
  const eventNumberMatch = name.match(/Event\s*#(\d+)/i)
  if (eventNumberMatch) {
    eventNumber = eventNumberMatch[1]
  }

  // Fallbacks for missing parts
  if (!tournamentName && eventName) {
    // Try to extract tournament from event name
    const tritonMatch = eventName.match(/(Triton[^,]*)/i)
    if (tritonMatch) {
      tournamentName = tritonMatch[1].trim()
    }
  }

  if (!streamName) {
    streamName = 'Main Stream'
  }

  if (!tournamentName) {
    return null  // Must have tournament name
  }

  return {
    tournamentName,
    eventName: eventName || 'Main Event',
    streamName,
    eventNumber,
  }
}

// Helper: Extract location from tournament name
function extractLocation(name: string): string {
  const locationMap: Record<string, string> = {
    'Montenegro': 'Montenegro',
    'Jeju': 'Jeju, South Korea',
    'Monte-Carlo': 'Monte-Carlo, Monaco',
    'Monte Carlo': 'Monte-Carlo, Monaco',
    'London': 'London, UK',
    'Cyprus': 'Cyprus',
    'Paradise': 'Paradise Island, Bahamas',
    'Manila': 'Manila, Philippines',
    'Macau': 'Macau',
    'Las Vegas': 'Las Vegas, USA',
    'Vietnam': 'Ho Chi Minh City, Vietnam',
  }

  for (const [keyword, location] of Object.entries(locationMap)) {
    if (name.includes(keyword)) {
      return location
    }
  }

  return 'TBD'
}

// Helper: Find matching tournament
async function findMatchingTournament(
  name: string,
  date: string | null,
  allowedDaysDiff: number = 3
): Promise<Tournament | null> {
  if (!date) return null

  const targetDate = new Date(date)
  const startRange = new Date(targetDate)
  startRange.setDate(startRange.getDate() - allowedDaysDiff)
  const endRange = new Date(targetDate)
  endRange.setDate(endRange.getDate() + allowedDaysDiff)

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('category', 'Triton')
    .gte('end_date', startRange.toISOString().split('T')[0])
    .lte('start_date', endRange.toISOString().split('T')[0])

  if (error) {
    console.error('Error finding tournament:', error)
    return null
  }

  if (data && data.length > 0) {
    // Find by name similarity
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const matches = data.filter(t => {
      const tName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      // Check if names are very similar (at least 60% match)
      const similarity = calculateSimilarity(normalizedName, tName)
      return similarity > 0.6
    })

    if (matches.length > 0) {
      // Return closest date match
      return matches.sort((a, b) => {
        const aDiff = Math.abs(new Date(a.start_date).getTime() - targetDate.getTime())
        const bDiff = Math.abs(new Date(b.start_date).getTime() - targetDate.getTime())
        return aDiff - bDiff
      })[0]
    }
  }

  return null
}

// Helper: Calculate string similarity (Jaccard index)
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(''))
  const set2 = new Set(str2.split(''))
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  return intersection.size / union.size
}

// Helper: Create tournament
async function createTournament(name: string, date: string | null): Promise<Tournament | null> {
  if (!date) return null

  const targetDate = new Date(date)
  const startDate = new Date(targetDate)
  startDate.setDate(startDate.getDate() - 7) // Default 7 days before
  const endDate = new Date(targetDate)
  endDate.setDate(endDate.getDate() + 7) // Default 7 days after

  const location = extractLocation(name)

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      name,
      category: 'Triton',
      category_id: 'triton',
      location,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      game_type: 'tournament',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tournament:', error)
    return null
  }

  return data
}

// Helper: Find matching event
async function findMatchingEvent(
  tournamentId: string,
  name: string
): Promise<SubEvent | null> {
  const { data, error } = await supabase
    .from('sub_events')
    .select('*')
    .eq('tournament_id', tournamentId)
    .ilike('name', `%${name}%`)

  if (error) {
    console.error('Error finding event:', error)
    return null
  }

  return data && data.length > 0 ? data[0] : null
}

// Helper: Create event
async function createEvent(
  tournamentId: string,
  name: string,
  date: string | null,
  eventNumber?: string
): Promise<SubEvent | null> {
  if (!date) return null

  const { data, error } = await supabase
    .from('sub_events')
    .insert({
      tournament_id: tournamentId,
      name,
      date: date.split('T')[0],
      event_number: eventNumber || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating event:', error)
    return null
  }

  return data
}

// Helper: Update stream
async function updateStream(
  streamId: string,
  subEventId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('streams')
    .update({
      sub_event_id: subEventId,
      is_organized: true,
      organized_at: new Date().toISOString(),
    })
    .eq('id', streamId)

  if (error) {
    console.error('Error updating stream:', error)
    return false
  }

  return true
}

// Main processing function
async function organizeTritonStreams(dryRun: boolean = true): Promise<ProcessResult> {
  const result: ProcessResult = {
    total: 0,
    tritonVideos: 0,
    matched: 0,
    tournamentsCreated: 0,
    eventsCreated: 0,
    streamsUpdated: 0,
    errors: 0,
    details: [],
  }

  console.log('\n' + '='.repeat(60))
  console.log(dryRun ? '🔍 DRY RUN MODE (No DB changes)' : '⚡ LIVE MODE (DB will be updated)')
  console.log('='.repeat(60) + '\n')

  // Fetch unsorted streams
  const { data: streams, error: fetchError } = await supabase
    .from('streams')
    .select('id, name, video_url, published_at, sub_event_id, is_organized')
    .eq('video_source', 'youtube')
    .is('sub_event_id', null)
    .eq('is_organized', false)
    .order('published_at', { ascending: false })

  if (fetchError) {
    console.error('❌ Error fetching streams:', fetchError)
    return result
  }

  result.total = streams?.length || 0
  console.log(`📊 Found ${result.total} unsorted YouTube streams\n`)

  if (!streams || streams.length === 0) {
    console.log('✅ No streams to process')
    return result
  }

  // Filter Triton streams
  const tritonStreams = streams.filter(s =>
    s.name.toLowerCase().includes('triton')
  )

  result.tritonVideos = tritonStreams.length
  console.log(`🎯 Filtering Triton streams: ${result.tritonVideos} found\n`)

  if (tritonStreams.length === 0) {
    console.log('✅ No Triton streams to process')
    return result
  }

  // Process each stream
  for (const stream of tritonStreams) {
    console.log(`\n📹 Processing: ${stream.name}`)
    console.log(`   Published: ${stream.published_at || 'Unknown'}`)

    const parsed = parseVideoName(stream.name)
    if (!parsed || !parsed.tournamentName) {
      console.log('   ❌ Failed to parse stream name')
      result.errors++
      result.details.push({
        streamName: stream.name,
        action: 'PARSE_ERROR',
        error: 'Could not parse tournament/event from name',
      })
      continue
    }

    console.log(`   Tournament: ${parsed.tournamentName}`)
    console.log(`   Event: ${parsed.eventName}`)
    console.log(`   Stream: ${parsed.streamName}`)
    if (parsed.eventNumber) console.log(`   Event #: ${parsed.eventNumber}`)

    // Find or create tournament
    let tournament = await findMatchingTournament(
      parsed.tournamentName,
      stream.published_at,
      3
    )

    if (!tournament) {
      console.log(`   📝 Creating new tournament: ${parsed.tournamentName}`)
      if (!dryRun) {
        tournament = await createTournament(parsed.tournamentName, stream.published_at)
        if (tournament) {
          result.tournamentsCreated++
          console.log(`   ✅ Tournament created: ${tournament.id}`)
        } else {
          console.log('   ❌ Failed to create tournament')
          result.errors++
          result.details.push({
            streamName: stream.name,
            action: 'CREATE_TOURNAMENT_ERROR',
            tournamentName: parsed.tournamentName,
            error: 'Failed to create tournament',
          })
          continue
        }
      } else {
        console.log(`   ⏭️  [DRY RUN] Would create tournament: ${parsed.tournamentName}`)
        result.tournamentsCreated++
        continue
      }
    } else {
      console.log(`   ✅ Matched tournament: ${tournament.name} (${tournament.id})`)
      result.matched++
    }

    if (!tournament) continue

    // Find or create event
    let event = await findMatchingEvent(tournament.id, parsed.eventName!)

    if (!event) {
      console.log(`   📝 Creating new event: ${parsed.eventName}`)
      if (!dryRun) {
        event = await createEvent(tournament.id, parsed.eventName!, stream.published_at, parsed.eventNumber)
        if (event) {
          result.eventsCreated++
          console.log(`   ✅ Event created: ${event.id}`)
        } else {
          console.log('   ❌ Failed to create event')
          result.errors++
          result.details.push({
            streamName: stream.name,
            action: 'CREATE_EVENT_ERROR',
            tournamentName: tournament.name,
            eventName: parsed.eventName!,
            error: 'Failed to create event',
          })
          continue
        }
      } else {
        console.log(`   ⏭️  [DRY RUN] Would create event: ${parsed.eventName}`)
        result.eventsCreated++
        continue
      }
    } else {
      console.log(`   ✅ Matched event: ${event.name} (${event.id})`)
    }

    if (!event) continue

    // Update stream
    if (!dryRun) {
      const updated = await updateStream(stream.id, event.id)
      if (updated) {
        result.streamsUpdated++
        console.log(`   ✅ Stream updated successfully`)
        result.details.push({
          streamName: stream.name,
          action: 'SUCCESS',
          tournamentName: tournament.name,
          eventName: event.name,
        })
      } else {
        console.log('   ❌ Failed to update stream')
        result.errors++
        result.details.push({
          streamName: stream.name,
          action: 'UPDATE_STREAM_ERROR',
          tournamentName: tournament.name,
          eventName: event.name,
          error: 'Failed to update stream',
        })
      }
    } else {
      console.log(`   ⏭️  [DRY RUN] Would update stream: ${stream.id}`)
      result.streamsUpdated++
      result.details.push({
        streamName: stream.name,
        action: 'DRY_RUN_SUCCESS',
        tournamentName: tournament.name,
        eventName: event.name,
      })
    }
  }

  return result
}

// Print results
function printResults(result: ProcessResult, dryRun: boolean) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total unsorted streams: ${result.total}`)
  console.log(`Triton streams found: ${result.tritonVideos}`)
  console.log(`Tournaments created: ${result.tournamentsCreated}`)
  console.log(`Events created: ${result.eventsCreated}`)
  console.log(`Streams updated: ${result.streamsUpdated}`)
  console.log(`Errors: ${result.errors}`)
  console.log('='.repeat(60))

  if (dryRun) {
    console.log('\n💡 This was a DRY RUN. No changes were made to the database.')
    console.log('   Run with --execute flag to apply changes.\n')
  } else {
    console.log('\n✅ Changes have been applied to the database.\n')
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--execute')

  if (dryRun) {
    console.log('\n💡 Running in DRY RUN mode. Add --execute flag to apply changes.\n')
  }

  const result = await organizeTritonStreams(dryRun)
  printResults(result, dryRun)
}

main().catch(console.error)
