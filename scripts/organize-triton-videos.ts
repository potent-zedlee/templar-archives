import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

interface UnsortedVideo {
  id: string
  name: string
  video_url: string | null
  published_at: string | null
}

interface EventGroup {
  eventNumber: string
  eventName: string
  videos: UnsortedVideo[]
}

interface SeriesGroup {
  seriesName: string
  location: string
  startDate: string
  events: Map<string, EventGroup>
}

// Parse series name from video title
function parseSeriesName(videoName: string): string {
  if (videoName.includes('Montenegro 2025')) {
    return 'Triton Poker Series Montenegro 2025'
  } else if (videoName.includes('Jeju II 2025')) {
    return 'Triton Poker Series Jeju II 2025'
  } else if (videoName.includes('Jeju 2025') && !videoName.includes('Jeju II')) {
    return 'Triton Poker Series Jeju 2025'
  } else if (videoName.includes('JEJU II 2025')) {
    return 'Triton ONE - Jeju II 2025'
  } else {
    return 'Triton Special Events'
  }
}

// Parse event number from video title
function parseEventNumber(videoName: string): string | null {
  const match = videoName.match(/Event #(\d+)/)
  return match ? match[1] : null
}

// Parse event name from video title
function parseEventName(videoName: string): string {
  // Extract everything before " – Event #" or before " |"
  const beforeEvent = videoName.split(' – Event #')[0]
  const beforePipe = beforeEvent.split(' |')[0]

  // For special events without Event # pattern
  if (!videoName.includes('Event #')) {
    return videoName.split(' |')[0].trim()
  }

  return beforePipe.trim()
}

// Get location from series name
function getLocation(seriesName: string): string {
  if (seriesName.includes('Montenegro')) return 'Montenegro'
  if (seriesName.includes('Jeju')) return 'Jeju, South Korea'
  return 'Unknown'
}

// Get approximate start date
function getStartDate(seriesName: string): string {
  if (seriesName.includes('Montenegro 2025')) return '2025-03-01'
  if (seriesName.includes('Jeju II 2025')) return '2025-02-01'
  if (seriesName.includes('Jeju 2025')) return '2025-01-15'
  if (seriesName.includes('Jeju II 2025')) return '2025-02-01'
  return '2025-01-01'
}

// Get approximate end date (7 days after start)
function getEndDate(seriesName: string): string {
  const startDate = new Date(getStartDate(seriesName))
  startDate.setDate(startDate.getDate() + 7)
  return startDate.toISOString().split('T')[0]
}

async function main() {
  console.log('🎬 Triton Videos Auto-Organization Script\n')

  // 1. Fetch all unsorted Triton videos
  console.log('📊 Step 1: Fetching unsorted Triton videos...')
  const { data: videos, error: fetchError } = await supabase
    .from('days')
    .select('id, name, video_url, published_at')
    .is('sub_event_id', null)
    .eq('is_organized', false)
    .ilike('name', '%triton%')

  if (fetchError) {
    console.error('❌ Error fetching videos:', fetchError)
    return
  }

  console.log(`✅ Found ${videos?.length || 0} Triton videos\n`)

  if (!videos || videos.length === 0) {
    console.log('No videos to organize.')
    return
  }

  // 2. Group videos by series and events
  console.log('📁 Step 2: Grouping videos by series and events...')
  const seriesMap = new Map<string, SeriesGroup>()

  for (const video of videos) {
    const seriesName = parseSeriesName(video.name)
    const eventNumber = parseEventNumber(video.name)
    const eventName = parseEventName(video.name)

    if (!seriesMap.has(seriesName)) {
      seriesMap.set(seriesName, {
        seriesName,
        location: getLocation(seriesName),
        startDate: getStartDate(seriesName),
        events: new Map(),
      })
    }

    const series = seriesMap.get(seriesName)!
    const eventKey = eventNumber || 'special'

    if (!series.events.has(eventKey)) {
      series.events.set(eventKey, {
        eventNumber: eventKey,
        eventName,
        videos: [],
      })
    }

    series.events.get(eventKey)!.videos.push(video)
  }

  console.log(`✅ Grouped into ${seriesMap.size} series\n`)

  // 3. Create tournaments and sub-events
  console.log('🏆 Step 3: Creating tournaments and events...\n')

  for (const [seriesName, series] of seriesMap.entries()) {
    console.log(`\n📁 ${seriesName}`)
    console.log(`   Location: ${series.location}`)
    console.log(`   Start Date: ${series.startDate}`)

    // Create tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: seriesName,
        category: 'Triton',
        location: series.location,
        start_date: series.startDate,
        end_date: getEndDate(seriesName),
      })
      .select()
      .single()

    if (tournamentError) {
      console.error(`   ❌ Error creating tournament:`, tournamentError.message)
      continue
    }

    console.log(`   ✅ Tournament created (ID: ${tournament.id})`)

    // Create sub-events and organize videos
    const sortedEvents = Array.from(series.events.entries()).sort((a, b) => {
      if (a[0] === 'special') return 1
      if (b[0] === 'special') return -1
      return parseInt(a[0]) - parseInt(b[0])
    })

    for (const [eventKey, event] of sortedEvents) {
      const subEventName = event.eventName
      const subEventDate = event.videos[0].published_at || series.startDate

      // Create sub-event
      const { data: subEvent, error: subEventError } = await supabase
        .from('sub_events')
        .insert({
          tournament_id: tournament.id,
          name: subEventName,
          date: subEventDate,
        })
        .select()
        .single()

      if (subEventError) {
        console.error(`      ❌ Error creating sub-event "${subEventName}":`, subEventError.message)
        continue
      }

      console.log(`      ├─ Event ${eventKey}: ${subEventName} (${event.videos.length} videos)`)

      // Organize videos into this sub-event
      const videoIds = event.videos.map(v => v.id)
      const { error: organizeError } = await supabase
        .from('days')
        .update({
          sub_event_id: subEvent.id,
          is_organized: true,
          organized_at: new Date().toISOString(),
        })
        .in('id', videoIds)

      if (organizeError) {
        console.error(`         ❌ Error organizing videos:`, organizeError.message)
      } else {
        console.log(`         ✅ ${event.videos.length} videos organized`)
      }
    }
  }

  console.log('\n\n🎉 Organization complete!')
  console.log('🔍 Check the Archive page to verify the results.')
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
