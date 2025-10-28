/**
 * Clean Unsorted Videos - Keep only EPT videos
 *
 * This script:
 * 1. Fetches all unsorted videos
 * 2. Identifies non-EPT videos (name doesn't contain "EPT")
 * 3. Deletes non-EPT videos
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

async function cleanUnsortedVideos() {
  console.log('🔍 Fetching all unsorted videos...\n')

  // Fetch all unsorted streams (sub_event_id IS NULL AND is_organized = FALSE)
  const { data: videos, error } = await supabase
    .from('streams')
    .select('id, name, video_source, video_url, created_at')
    .is('sub_event_id', null)
    .eq('is_organized', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching videos:', error)
    process.exit(1)
  }

  if (!videos || videos.length === 0) {
    console.log('✅ No unsorted videos found')
    return
  }

  console.log(`📊 Total unsorted videos: ${videos.length}\n`)

  // Separate EPT and non-EPT videos
  const eptVideos = videos.filter(v =>
    v.name?.toLowerCase().includes('ept') ||
    v.name?.toLowerCase().includes('european poker tour')
  )
  const nonEptVideos = videos.filter(v =>
    !v.name?.toLowerCase().includes('ept') &&
    !v.name?.toLowerCase().includes('european poker tour')
  )

  console.log(`✅ EPT videos: ${eptVideos.length}`)
  console.log(`❌ Non-EPT videos to delete: ${nonEptVideos.length}\n`)

  if (eptVideos.length > 0) {
    console.log('📺 EPT Videos (keeping):')
    eptVideos.forEach(v => {
      console.log(`  - ${v.name} (${v.video_source})`)
    })
    console.log()
  }

  if (nonEptVideos.length === 0) {
    console.log('✅ No non-EPT videos to delete')
    return
  }

  console.log('🗑️  Non-EPT Videos (deleting):')
  nonEptVideos.forEach(v => {
    console.log(`  - ${v.name} (${v.video_source})`)
  })
  console.log()

  // Delete non-EPT videos
  console.log('🚀 Deleting non-EPT videos...\n')

  const { error: deleteError } = await supabase
    .from('streams')
    .delete()
    .in('id', nonEptVideos.map(v => v.id))

  if (deleteError) {
    console.error('❌ Error deleting videos:', deleteError)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted ${nonEptVideos.length} non-EPT videos`)
  console.log(`✅ Kept ${eptVideos.length} EPT videos`)
}

cleanUnsortedVideos()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
