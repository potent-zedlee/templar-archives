import { createClientSupabaseClient } from './supabase-client'

export interface UnsortedVideo {
  id: string
  name: string
  video_url: string | null
  video_file: string | null
  video_source: 'youtube' | 'local' | 'nas' | null
  created_at: string
}

/**
 * Normalize YouTube URL to standard format
 */
export function normalizeYoutubeUrl(url: string): string {
  try {
    // Remove whitespace
    url = url.trim()

    // If URL doesn't start with http:// or https://, add https://
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url
    }

    const urlObj = new URL(url)

    // Handle youtu.be short URLs
    if (urlObj.hostname === 'youtu.be' || urlObj.hostname === 'www.youtu.be') {
      const videoId = urlObj.pathname.slice(1)
      return `https://www.youtube.com/watch?v=${videoId}`
    }

    // Handle youtube.com URLs
    if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
      // Ensure www prefix
      return url.replace(/^(https?:\/\/)youtube\.com/, '$1www.youtube.com')
    }

    // Return original URL if not YouTube
    return url
  } catch (error) {
    console.error('Error normalizing YouTube URL:', error)
    return url
  }
}

/**
 * Get all unsorted videos
 */
export async function getUnsortedVideos(): Promise<UnsortedVideo[]> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('days')
    .select('id, name, video_url, video_file, video_source, created_at')
    .is('sub_event_id', null)
    .eq('is_organized', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching unsorted videos:', error)
    return []
  }

  return data || []
}

/**
 * Create a new unsorted video
 */
export async function createUnsortedVideo(params: {
  name: string
  video_url?: string
  video_file?: string
  video_source?: 'youtube' | 'local' | 'nas'
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createClientSupabaseClient()

  // Normalize YouTube URL if provided
  let normalizedUrl = params.video_url || null
  if (normalizedUrl && params.video_source === 'youtube') {
    normalizedUrl = normalizeYoutubeUrl(normalizedUrl)
    console.log('Normalized YouTube URL:', normalizedUrl)
  }

  const { data, error } = await supabase
    .from('days')
    .insert({
      name: params.name,
      video_url: normalizedUrl,
      video_file: params.video_file || null,
      video_source: params.video_source || 'youtube',
      sub_event_id: null,
      is_organized: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating unsorted video:', error)
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

/**
 * Organize a video by assigning it to a sub_event
 */
export async function organizeVideo(
  dayId: string,
  subEventId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient()

  const { error } = await supabase
    .from('days')
    .update({
      sub_event_id: subEventId,
      is_organized: true,
      organized_at: new Date().toISOString(),
    })
    .eq('id', dayId)

  if (error) {
    console.error('Error organizing video:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Delete an unsorted video
 */
export async function deleteUnsortedVideo(
  dayId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient()

  const { error } = await supabase
    .from('days')
    .delete()
    .eq('id', dayId)

  if (error) {
    console.error('Error deleting unsorted video:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Organize multiple videos at once
 */
export async function organizeVideos(
  dayIds: string[],
  subEventId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientSupabaseClient()

  const { error } = await supabase
    .from('days')
    .update({
      sub_event_id: subEventId,
      is_organized: true,
      organized_at: new Date().toISOString(),
    })
    .in('id', dayIds)

  if (error) {
    console.error('Error organizing videos:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
