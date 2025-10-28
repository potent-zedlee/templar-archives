/**
 * Delete All Unsorted Videos
 *
 * This script deletes all unsorted streams from the database
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

async function deleteAllUnsortedVideos() {
  console.log('🔍 Fetching all unsorted videos...\n')

  // Fetch all unsorted streams (sub_event_id IS NULL AND is_organized = FALSE)
  const { data: videos, error } = await supabase
    .from('streams')
    .select('id, name, video_source')
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

  console.log(`📊 Total unsorted videos to delete: ${videos.length}\n`)

  console.log('🗑️  Videos to delete:')
  videos.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.name} (${v.video_source})`)
  })
  console.log()

  // Delete all unsorted videos
  console.log('🚀 Deleting all unsorted videos...\n')

  const { error: deleteError } = await supabase
    .from('streams')
    .delete()
    .is('sub_event_id', null)
    .eq('is_organized', false)

  if (deleteError) {
    console.error('❌ Error deleting videos:', deleteError)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted ${videos.length} unsorted videos`)
}

deleteAllUnsortedVideos()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
