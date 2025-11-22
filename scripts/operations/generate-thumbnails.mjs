#!/usr/bin/env node

/**
 * Generate Thumbnails for Existing Hands
 *
 * This script updates thumbnail URLs for existing hands that don't have one.
 * It fetches hands from streams with YouTube videos and generates thumbnail URLs.
 *
 * Usage:
 *   node scripts/generate-thumbnails.mjs
 *   node scripts/generate-thumbnails.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/**
 * Extract YouTube video ID from URL
 */
function getYouTubeVideoId(url) {
  if (!url) return null

  try {
    const urlObj = new URL(url)

    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v')
    }

    // youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1)
    }

    // youtube.com/embed/VIDEO_ID or youtube.com/v/VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      const match = urlObj.pathname.match(/^\/(embed|v)\/([^/?]+)/)
      if (match) {
        return match[2]
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Generate YouTube thumbnail URL
 */
function getYouTubeThumbnailUrl(videoId, quality = 'hqdefault') {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

/**
 * Get thumbnail URL for hand based on stream's video
 */
function getHandThumbnailUrl(videoUrl, videoSource) {
  if (!videoUrl || !videoSource) {
    return null
  }

  // Only process YouTube videos
  if (videoSource !== 'youtube') {
    return null
  }

  const videoId = getYouTubeVideoId(videoUrl)
  if (!videoId) {
    return null
  }

  return getYouTubeThumbnailUrl(videoId, 'hqdefault')
}

/**
 * Main function
 */
async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('🎬 Generating Thumbnails for Existing Hands')
  console.log('=========================================')
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE UPDATE'}`)
  console.log()

  // 1. Fetch streams with YouTube videos
  console.log('📡 Fetching streams with YouTube videos...')
  const { data: streams, error: streamsError } = await supabase
    .from('streams')
    .select('id, video_url, video_source')
    .eq('video_source', 'youtube')
    .not('video_url', 'is', null)

  if (streamsError) {
    console.error('❌ Failed to fetch streams:', streamsError)
    process.exit(1)
  }

  console.log(`✅ Found ${streams.length} YouTube streams`)
  console.log()

  // 2. For each stream, fetch hands without thumbnails
  let totalHandsUpdated = 0
  let totalStreamsProcessed = 0
  let totalHandsSkipped = 0

  for (const stream of streams) {
    const thumbnailUrl = getHandThumbnailUrl(stream.video_url, stream.video_source)

    if (!thumbnailUrl) {
      console.log(`⚠️  Skipping stream ${stream.id}: Invalid YouTube URL`)
      continue
    }

    // Fetch hands without thumbnails for this stream
    const { data: hands, error: handsError } = await supabase
      .from('hands')
      .select('id, number')
      .eq('day_id', stream.id)
      .is('thumbnail_url', null)

    if (handsError) {
      console.error(`❌ Failed to fetch hands for stream ${stream.id}:`, handsError)
      continue
    }

    if (hands.length === 0) {
      continue // Skip streams with no hands to update
    }

    console.log(`📝 Stream ${stream.id}: ${hands.length} hands without thumbnails`)
    console.log(`   Thumbnail URL: ${thumbnailUrl}`)

    if (!isDryRun) {
      // Update hands with thumbnail URL
      const { error: updateError } = await supabase
        .from('hands')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('day_id', stream.id)
        .is('thumbnail_url', null)

      if (updateError) {
        console.error(`❌ Failed to update hands for stream ${stream.id}:`, updateError)
        totalHandsSkipped += hands.length
        continue
      }

      console.log(`✅ Updated ${hands.length} hands`)
    } else {
      console.log(`   [DRY RUN] Would update ${hands.length} hands`)
    }

    totalHandsUpdated += hands.length
    totalStreamsProcessed++
    console.log()
  }

  // 3. Summary
  console.log('=========================================')
  console.log('📊 Summary')
  console.log('=========================================')
  console.log(`Total streams processed: ${totalStreamsProcessed}`)
  console.log(`Total hands updated: ${totalHandsUpdated}`)
  if (totalHandsSkipped > 0) {
    console.log(`Total hands skipped (errors): ${totalHandsSkipped}`)
  }
  console.log()

  if (isDryRun) {
    console.log('ℹ️  This was a dry run. Run without --dry-run to apply changes.')
  } else {
    console.log('✅ Thumbnail generation complete!')
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
