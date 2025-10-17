import { NextResponse } from 'next/server'

export const revalidate = 300 // Cache for 5 minutes

// Priority poker channels (in order of priority)
const PRIORITY_CHANNELS = [
  { name: 'WSOP', handle: '@WSOP', priority: 1 },
  { name: 'PokerGO', handle: '@PokerGO', priority: 2 }, // TRITON, WPT
  { name: 'World Poker Tour', handle: '@WorldPokerTour', priority: 2 },
  { name: 'PokerStars', handle: '@pokerstars', priority: 3 }, // EPT
  { name: 'APT Poker', handle: '@aptpoker', priority: 4 },
  { name: 'Hustler Casino Live', handle: '@HustlerCasinoLive', priority: 2 },
] as const

interface YouTubeVideo {
  id: {
    videoId: string
  }
  snippet: {
    title: string
    description: string
    channelId: string
    channelTitle: string
    thumbnails: {
      high: {
        url: string
        width: number
        height: number
      }
    }
    liveBroadcastContent: string
  }
}

interface YouTubeSearchResponse {
  items: YouTubeVideo[]
}

interface LiveStream {
  id: string
  title: string
  channelName: string
  channelThumbnail: string
  thumbnailUrl: string
  videoUrl: string
  viewerCount?: string
  priority?: number
}

/**
 * Get channel ID from handle using the improved method
 */
async function getChannelIdFromHandle(handle: string, apiKey: string): Promise<string | null> {
  try {
    // Remove @ if present
    const cleanHandle = handle.replace(/^@/, '')

    // Try forHandle parameter (most accurate for @username format)
    const handleUrl = new URL('https://www.googleapis.com/youtube/v3/channels')
    handleUrl.searchParams.append('part', 'id')
    handleUrl.searchParams.append('forHandle', cleanHandle)
    handleUrl.searchParams.append('key', apiKey)

    const response = await fetch(handleUrl.toString())

    if (response.ok) {
      const data = await response.json()
      if (data.items && data.items.length > 0) {
        console.log(`✓ Found channel ID for ${handle}:`, data.items[0].id)
        return data.items[0].id
      }
    } else {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Failed to get channel ID for ${handle} (status: ${response.status})`, errorData)
    }

    return null
  } catch (error) {
    console.error(`Error getting channel ID for ${handle}:`, error)
    return null
  }
}

/**
 * Search for live streams from a specific channel
 */
async function searchChannelLiveStreams(
  channelHandle: string,
  priority: number,
  apiKey: string
): Promise<YouTubeVideo[]> {
  try {
    // First, get the channel ID
    const channelId = await getChannelIdFromHandle(channelHandle, apiKey)

    if (!channelId) {
      console.log(`Channel ID not found for ${channelHandle}`)
      return []
    }

    // Search for live streams from this specific channel
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.append('part', 'snippet')
    searchUrl.searchParams.append('channelId', channelId)
    searchUrl.searchParams.append('type', 'video')
    searchUrl.searchParams.append('eventType', 'live')
    searchUrl.searchParams.append('maxResults', '5')
    searchUrl.searchParams.append('order', 'date')
    searchUrl.searchParams.append('key', apiKey)

    const response = await fetch(searchUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Failed to fetch ${channelHandle} live streams (status: ${response.status})`, errorData)
      return []
    }

    const data: YouTubeSearchResponse = await response.json()
    const itemCount = data.items?.length || 0
    if (itemCount > 0) {
      console.log(`✓ Found ${itemCount} live stream(s) for ${channelHandle}`)
    }
    return data.items || []
  } catch (error) {
    console.error(`Error fetching ${channelHandle} live streams:`, error)
    return []
  }
}

/**
 * Search for general live poker streams
 */
async function searchGeneralPokerStreams(apiKey: string, maxResults: number = 8): Promise<YouTubeVideo[]> {
  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.append('part', 'snippet')
    searchUrl.searchParams.append('q', 'poker tournament live')
    searchUrl.searchParams.append('type', 'video')
    searchUrl.searchParams.append('eventType', 'live')
    searchUrl.searchParams.append('maxResults', maxResults.toString())
    searchUrl.searchParams.append('order', 'viewCount')
    searchUrl.searchParams.append('relevanceLanguage', 'en')
    searchUrl.searchParams.append('videoCategoryId', '20') // Gaming category
    searchUrl.searchParams.append('key', apiKey)

    const response = await fetch(searchUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('YouTube API general search error (status:', response.status, ')', errorData)
      return []
    }

    const data: YouTubeSearchResponse = await response.json()
    const itemCount = data.items?.length || 0
    if (itemCount > 0) {
      console.log(`✓ Found ${itemCount} general poker stream(s)`)
    }
    return data.items || []
  } catch (error) {
    console.error('Error fetching general poker streams:', error)
    return []
  }
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY

  console.log('[YouTube API] Starting request...')
  console.log('[YouTube API] API Key present:', !!apiKey)
  console.log('[YouTube API] API Key length:', apiKey?.length || 0)

  if (!apiKey) {
    console.error('[YouTube API] YouTube API key not configured in environment variables')
    console.error('[YouTube API] Please set YOUTUBE_API_KEY in .env.local')
    return NextResponse.json({
      streams: [],
      error: 'YouTube API key not configured'
    }, { status: 200 })
  }

  try {
    console.log('[YouTube API] Fetching priority channels:', PRIORITY_CHANNELS.map(c => c.name).join(', '))
    // Phase 1: Search priority channels for live streams
    const priorityStreamsPromises = PRIORITY_CHANNELS.map(channel =>
      searchChannelLiveStreams(channel.handle, channel.priority, apiKey).then(videos =>
        videos.map(video => ({ video, priority: channel.priority }))
      )
    )

    const priorityResults = await Promise.all(priorityStreamsPromises)
    const priorityStreams = priorityResults.flat()
    console.log('[YouTube API] Priority streams found:', priorityStreams.length)

    // Phase 2: If we need more streams, search generally
    let allVideos = priorityStreams.map(s => s.video)
    if (allVideos.length < 8) {
      console.log('[YouTube API] Searching for general poker streams...')
      const generalStreams = await searchGeneralPokerStreams(apiKey, 8 - allVideos.length)
      console.log('[YouTube API] General streams found:', generalStreams.length)
      allVideos = [...allVideos, ...generalStreams]
    }

    // Remove duplicates
    const uniqueVideos = Array.from(
      new Map(allVideos.map(v => [v.id.videoId, v])).values()
    )
    console.log('[YouTube API] Unique videos after deduplication:', uniqueVideos.length)

    if (uniqueVideos.length === 0) {
      console.warn('[YouTube API] No live streams found')
      return NextResponse.json({ streams: [] }, { status: 200 })
    }

    // Get video details for viewer count
    const videoIds = uniqueVideos.map(item => item.id.videoId).join(',')
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    videosUrl.searchParams.append('part', 'liveStreamingDetails,statistics')
    videosUrl.searchParams.append('id', videoIds)
    videosUrl.searchParams.append('key', apiKey)

    const videosResponse = await fetch(videosUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    })

    let viewerCounts: Record<string, string> = {}

    if (videosResponse.ok) {
      const videosData = await videosResponse.json()

      if (videosData.items) {
        viewerCounts = videosData.items.reduce((acc: Record<string, string>, item: any) => {
          if (item.liveStreamingDetails?.concurrentViewers) {
            acc[item.id] = item.liveStreamingDetails.concurrentViewers
          }
          return acc
        }, {})
      }
    }

    // Get channel thumbnails
    const channelIds = uniqueVideos.map(item => item.snippet.channelId).join(',')
    const channelsUrl = new URL('https://www.googleapis.com/youtube/v3/channels')
    channelsUrl.searchParams.append('part', 'snippet')
    channelsUrl.searchParams.append('id', channelIds)
    channelsUrl.searchParams.append('key', apiKey)

    const channelsResponse = await fetch(channelsUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    })

    let channelThumbnails: Record<string, string> = {}

    if (channelsResponse.ok) {
      const channelsData = await channelsResponse.json()

      if (channelsData.items) {
        channelThumbnails = channelsData.items.reduce((acc: Record<string, string>, item: any) => {
          if (item.snippet?.thumbnails?.default?.url) {
            acc[item.id] = item.snippet.thumbnails.default.url
          }
          return acc
        }, {})
      }
    }

    // Map priority by channel name
    const channelPriorityMap = new Map(
      PRIORITY_CHANNELS.map(ch => [ch.name.toLowerCase(), ch.priority])
    )

    // Transform to our format with priority
    const streams: LiveStream[] = uniqueVideos
      .filter(item => item.snippet.liveBroadcastContent === 'live')
      .map(item => {
        // Check if this channel is in priority list
        const channelName = item.snippet.channelTitle.toLowerCase()
        let priority = 99 // Default low priority for non-priority channels

        for (const [name, p] of channelPriorityMap.entries()) {
          if (channelName.includes(name.toLowerCase()) ||
              name.includes(channelName)) {
            priority = p
            break
          }
        }

        return {
          id: item.id.videoId,
          title: item.snippet.title,
          channelName: item.snippet.channelTitle,
          channelThumbnail: channelThumbnails[item.snippet.channelId] || '',
          thumbnailUrl: item.snippet.thumbnails.high.url,
          videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          viewerCount: viewerCounts[item.id.videoId] || undefined,
          priority,
        }
      })
      // Sort by priority first, then by viewer count
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        const aViewers = parseInt(a.viewerCount || '0')
        const bViewers = parseInt(b.viewerCount || '0')
        return bViewers - aViewers
      })
      // Take top 8
      .slice(0, 8)

    console.log('[YouTube API] Final streams count:', streams.length)
    console.log('[YouTube API] Channels:', streams.map(s => s.channelName).join(', '))
    console.log('[YouTube API] Request completed successfully')

    return NextResponse.json({ streams }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })

  } catch (error) {
    console.error('[YouTube API] Failed to fetch YouTube live streams:', error)
    console.error('[YouTube API] Error details:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ streams: [], error: 'Failed to fetch streams' }, { status: 200 })
  }
}
