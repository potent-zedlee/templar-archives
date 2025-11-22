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
  tournamentName: string
  subEventName: string
  year: string | null
}

interface ProcessResult {
  total: number
  tritonVideos: number
  matched: number
  tournamentsCreated: number
  subEventsCreated: number
  daysUpdated: number
  errors: number
  details: Array<{
    videoName: string
    action: string
    tournamentName?: string
    subEventName?: string
    error?: string
  }>
}

// Helper: Parse video name
function parseVideoName(name: string): ParsedName | null {
  // Patterns:
  // "Triton Poker Cyprus 2024 - Day 1A"
  // "Triton Million London - Final Table"
  // "Triton Super High Roller - Event #1"

  const tritonMatch = name.match(/Triton[^-]*/i)
  if (!tritonMatch) return null

  const parts = name.split('-').map(p => p.trim())
  const tournamentPart = parts[0]
  const subEventPart = parts[1] || 'Main Event'

  // Extract year
  const yearMatch = tournamentPart.match(/\b(20\d{2})\b/)
  const year = yearMatch ? yearMatch[1] : null

  return {
    tournamentName: tournamentPart,
    subEventName: subEventPart,
    year,
  }
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

  // Find best match by name similarity
  if (data && data.length > 0) {
    // Simple name matching: check if tournament name contains key parts
    const nameParts = name.toLowerCase().split(' ')
    const matches = data.filter(t => {
      const tName = t.name.toLowerCase()
      return nameParts.some(part => part.length > 3 && tName.includes(part))
    })

    if (matches.length > 0) {
      // Return the one with the closest date range
      return matches.sort((a, b) => {
        const aDiff = Math.abs(new Date(a.start_date).getTime() - targetDate.getTime())
        const bDiff = Math.abs(new Date(b.start_date).getTime() - targetDate.getTime())
        return aDiff - bDiff
      })[0]
    }
  }

  return null
}

// Helper: Extract location from name
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
    'JEJU': 'Jeju, South Korea',
  }

  for (const [keyword, location] of Object.entries(locationMap)) {
    if (name.includes(keyword)) {
      return location
    }
  }

  return 'TBD' // Default location
}

// Helper: Create tournament
async function createTournament(name: string, date: string | null): Promise<Tournament | null> {
  if (!date) return null

  const targetDate = new Date(date)
  const startDate = new Date(targetDate)
  startDate.setDate(startDate.getDate() - 3) // Default 3 days before
  const endDate = new Date(targetDate)
  endDate.setDate(endDate.getDate() + 3) // Default 3 days after

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

// Helper: Find matching sub event
async function findMatchingSubEvent(
  tournamentId: string,
  name: string
): Promise<SubEvent | null> {
  const { data, error } = await supabase
    .from('sub_events')
    .select('*')
    .eq('tournament_id', tournamentId)
    .ilike('name', `%${name}%`)

  if (error) {
    console.error('Error finding sub event:', error)
    return null
  }

  return data && data.length > 0 ? data[0] : null
}

// Helper: Create sub event
async function createSubEvent(
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
      date: date.split('T')[0], // Convert to DATE format
      event_number: eventNumber || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating sub event:', error)
    return null
  }

  return data
}

// Helper: Update day
async function updateDay(
  dayId: string,
  subEventId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('days')
    .update({
      sub_event_id: subEventId,
      is_organized: true,
      organized_at: new Date().toISOString(),
    })
    .eq('id', dayId)

  if (error) {
    console.error('Error updating day:', error)
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
    subEventsCreated: 0,
    daysUpdated: 0,
    errors: 0,
    details: [],
  }

  console.log('\n' + '='.repeat(60))
  console.log(dryRun ? '🔍 DRY RUN MODE (No DB changes)' : '⚡ LIVE MODE (DB will be updated)')
  console.log('='.repeat(60) + '\n')

  // Fetch unsorted videos
  const { data: videos, error: fetchError } = await supabase
    .from('days')
    .select('id, name, video_url, published_at, sub_event_id, is_organized')
    .eq('video_source', 'youtube')
    .is('sub_event_id', null)
    .eq('is_organized', false)
    .order('published_at', { ascending: false })

  if (fetchError) {
    console.error('❌ Error fetching videos:', fetchError)
    return result
  }

  result.total = videos?.length || 0
  console.log(`📊 Found ${result.total} unsorted YouTube videos\n`)

  if (!videos || videos.length === 0) {
    console.log('✅ No videos to process')
    return result
  }

  // Filter Triton videos
  const tritonVideos = videos.filter(v =>
    v.name.toLowerCase().includes('triton')
  )

  result.tritonVideos = tritonVideos.length
  console.log(`🎯 Filtering Triton videos: ${result.tritonVideos} found\n`)

  if (tritonVideos.length === 0) {
    console.log('✅ No Triton videos to process')
    return result
  }

  // Process each video
  for (const video of tritonVideos) {
    console.log(`\n📹 Processing: ${video.name}`)
    console.log(`   Published: ${video.published_at || 'Unknown'}`)

    const parsed = parseVideoName(video.name)
    if (!parsed) {
      console.log('   ❌ Failed to parse video name')
      result.errors++
      result.details.push({
        videoName: video.name,
        action: 'PARSE_ERROR',
        error: 'Could not parse tournament/sub-event from name',
      })
      continue
    }

    console.log(`   Tournament: ${parsed.tournamentName}`)
    console.log(`   SubEvent: ${parsed.subEventName}`)

    // Find or create tournament
    let tournament = await findMatchingTournament(
      parsed.tournamentName,
      video.published_at,
      3 // ±3 days
    )

    if (!tournament) {
      console.log(`   📝 Creating new tournament: ${parsed.tournamentName}`)
      if (!dryRun) {
        tournament = await createTournament(parsed.tournamentName, video.published_at)
        if (tournament) {
          result.tournamentsCreated++
          console.log(`   ✅ Tournament created: ${tournament.id}`)
        } else {
          console.log('   ❌ Failed to create tournament')
          result.errors++
          result.details.push({
            videoName: video.name,
            action: 'CREATE_TOURNAMENT_ERROR',
            tournamentName: parsed.tournamentName,
            error: 'Failed to create tournament',
          })
          continue
        }
      } else {
        console.log(`   ⏭️  [DRY RUN] Would create tournament: ${parsed.tournamentName}`)
        result.tournamentsCreated++
        continue // Skip further processing in dry run
      }
    } else {
      console.log(`   ✅ Matched tournament: ${tournament.name} (${tournament.id})`)
      result.matched++
    }

    if (!tournament) continue

    // Find or create sub event
    let subEvent = await findMatchingSubEvent(tournament.id, parsed.subEventName)

    if (!subEvent) {
      console.log(`   📝 Creating new sub event: ${parsed.subEventName}`)
      if (!dryRun) {
        subEvent = await createSubEvent(tournament.id, parsed.subEventName, video.published_at)
        if (subEvent) {
          result.subEventsCreated++
          console.log(`   ✅ Sub event created: ${subEvent.id}`)
        } else {
          console.log('   ❌ Failed to create sub event')
          result.errors++
          result.details.push({
            videoName: video.name,
            action: 'CREATE_SUBEVENT_ERROR',
            tournamentName: tournament.name,
            subEventName: parsed.subEventName,
            error: 'Failed to create sub event',
          })
          continue
        }
      } else {
        console.log(`   ⏭️  [DRY RUN] Would create sub event: ${parsed.subEventName}`)
        result.subEventsCreated++
        continue
      }
    } else {
      console.log(`   ✅ Matched sub event: ${subEvent.name} (${subEvent.id})`)
    }

    if (!subEvent) continue

    // Update day
    if (!dryRun) {
      const updated = await updateDay(video.id, subEvent.id)
      if (updated) {
        result.daysUpdated++
        console.log(`   ✅ Day updated successfully`)
        result.details.push({
          videoName: video.name,
          action: 'SUCCESS',
          tournamentName: tournament.name,
          subEventName: subEvent.name,
        })
      } else {
        console.log('   ❌ Failed to update day')
        result.errors++
        result.details.push({
          videoName: video.name,
          action: 'UPDATE_DAY_ERROR',
          tournamentName: tournament.name,
          subEventName: subEvent.name,
          error: 'Failed to update day',
        })
      }
    } else {
      console.log(`   ⏭️  [DRY RUN] Would update day: ${video.id}`)
      result.daysUpdated++
      result.details.push({
        videoName: video.name,
        action: 'DRY_RUN_SUCCESS',
        tournamentName: tournament.name,
        subEventName: subEvent.name,
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
  console.log(`Total unsorted videos: ${result.total}`)
  console.log(`Triton videos found: ${result.tritonVideos}`)
  console.log(`Tournaments created: ${result.tournamentsCreated}`)
  console.log(`Sub events created: ${result.subEventsCreated}`)
  console.log(`Days updated: ${result.daysUpdated}`)
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
