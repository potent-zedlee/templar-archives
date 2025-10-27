/**
 * Delete all unsorted videos from the database
 *
 * Usage: npx tsx scripts/delete-unsorted-videos.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function deleteUnsortedVideos() {
  console.log('🔍 Checking for unsorted videos...\n')

  // Count unsorted videos
  const { count, error: countError } = await supabase
    .from('streams')
    .select('*', { count: 'exact', head: true })
    .eq('is_organized', false)

  if (countError) {
    console.error('❌ Error counting unsorted videos:', countError)
    process.exit(1)
  }

  console.log(`📊 Found ${count} unsorted videos\n`)

  if (!count || count === 0) {
    console.log('✅ No unsorted videos to delete')
    return
  }

  // Get list of unsorted videos before deletion
  const { data: unsortedVideos, error: fetchError } = await supabase
    .from('streams')
    .select('id, name, video_url, video_file, video_nas_path, created_at')
    .eq('is_organized', false)
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('❌ Error fetching unsorted videos:', fetchError)
    process.exit(1)
  }

  console.log('📋 Unsorted videos to be deleted:')
  console.log('─'.repeat(80))
  unsortedVideos?.forEach((video, index) => {
    const videoSource = video.video_url ? 'YouTube' : video.video_file ? 'Upload' : video.video_nas_path ? 'NAS' : 'Unknown'
    console.log(`${index + 1}. ${video.name} (${videoSource}) - Created: ${video.created_at}`)
  })
  console.log('─'.repeat(80))
  console.log()

  // Delete all unsorted videos
  console.log('🗑️  Deleting unsorted videos...')
  const { error: deleteError } = await supabase
    .from('streams')
    .delete()
    .eq('is_organized', false)

  if (deleteError) {
    console.error('❌ Error deleting unsorted videos:', deleteError)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted ${count} unsorted videos\n`)

  // Verify deletion
  const { count: remainingCount } = await supabase
    .from('streams')
    .select('*', { count: 'exact', head: true })
    .eq('is_organized', false)

  if (remainingCount && remainingCount > 0) {
    console.log(`⚠️  Warning: ${remainingCount} unsorted videos still remain`)
  } else {
    console.log('✅ Verification complete: All unsorted videos deleted')
  }
}

deleteUnsortedVideos()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
