import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
  console.log('🔍 Checking streams video URLs...\n')

  // Get all streams with their video URLs
  const { data: streams, error } = await supabase
    .from('streams')
    .select(`
      id,
      name,
      video_url,
      video_source,
      sub_event:sub_events(
        id,
        name,
        tournament:tournaments(
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Error fetching streams:', error.message)
    return
  }

  console.log(`✅ Found ${streams.length} streams\n`)

  // Check which streams have video URLs
  const streamsWithVideo = streams.filter(s => s.video_url)
  const streamsWithoutVideo = streams.filter(s => !s.video_url)

  console.log(`📊 Summary:`)
  console.log(`   With video URL: ${streamsWithVideo.length}`)
  console.log(`   Without video URL: ${streamsWithoutVideo.length}\n`)

  if (streamsWithoutVideo.length > 0) {
    console.log(`⚠️  Streams WITHOUT video URL (AI 분석 버튼이 비활성화됨):`)
    console.log('━'.repeat(80))
    streamsWithoutVideo.forEach((stream, idx) => {
      console.log(`${idx + 1}. ${stream.name}`)
      if (stream.sub_event) {
        console.log(`   Tournament: ${stream.sub_event.tournament?.name || 'N/A'}`)
        console.log(`   SubEvent: ${stream.sub_event.name}`)
      }
      console.log(`   ID: ${stream.id}`)
      console.log()
    })
  }

  if (streamsWithVideo.length > 0) {
    console.log(`\n✅ Streams WITH video URL (AI 분석 가능):`)
    console.log('━'.repeat(80))
    streamsWithVideo.slice(0, 5).forEach((stream, idx) => {
      console.log(`${idx + 1}. ${stream.name}`)
      if (stream.sub_event) {
        console.log(`   Tournament: ${stream.sub_event.tournament?.name || 'N/A'}`)
        console.log(`   SubEvent: ${stream.sub_event.name}`)
      }
      console.log(`   Video URL: ${stream.video_url?.substring(0, 50)}...`)
      console.log(`   Source: ${stream.video_source || 'N/A'}`)
      console.log(`   ID: ${stream.id}`)
      console.log()
    })
  }
}

main().catch(console.error)
