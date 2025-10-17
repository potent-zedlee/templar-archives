import { NextResponse } from 'next/server'

export const revalidate = 300 // Cache for 5 minutes

// Priority poker channels with pre-fetched channel IDs
// This reduces API calls by not having to look up channel IDs every time
const PRIORITY_CHANNELS = [
  { name: 'WSOP', handle: '@WSOP', channelId: null, priority: 1 },
  { name: 'Triton Poker', handle: '@TritonPoker', channelId: null, priority: 1 },
  { name: 'PokerGO', handle: '@PokerGO', channelId: null, priority: 1 }, // EPT
  { name: 'World Poker Tour', handle: '@WorldPokerTour', channelId: null, priority: 1 },
  { name: 'Hustler Casino Live', handle: '@HustlerCasinoLive', channelId: null, priority: 1 },
] as const

// Cache for channel IDs to avoid repeated API calls
const channelIdCache = new Map<string, string>()

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
  streamType: 'live' | 'completed' | 'recent'
  publishedAt?: string
}

/**
 * Get channel ID from handle with caching
 */
async function getChannelIdFromHandle(handle: string, apiKey: string): Promise<string | null> {
  // Check cache first
  if (channelIdCache.has(handle)) {
    return channelIdCache.get(handle)!
  }

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
        const channelId = data.items[0].id
        console.log(`✓ Found channel ID for ${handle}:`, channelId)
        // Cache it
        channelIdCache.set(handle, channelId)
        return channelId
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
    console.log('[YouTube API] Fetching live streams from priority channels:', PRIORITY_CHANNELS.map(c => c.name).join(', '))

    // Get channel IDs first (will be cached after first call)
    const channelIds: string[] = []
    for (const channel of PRIORITY_CHANNELS) {
      const channelId = await getChannelIdFromHandle(channel.handle, apiKey)
      if (channelId) {
        channelIds.push(channelId)
      }
    }

    console.log('[YouTube API] Found', channelIds.length, 'channel IDs')

    if (channelIds.length === 0) {
      console.warn('[YouTube API] No channel IDs found')
      return NextResponse.json({ streams: [] }, { status: 200 })
    }

    // Search for live and recent streams from these channels
    const allVideos: Array<YouTubeVideo & { streamType: 'live' | 'completed' | 'recent' }> = []

    // Step 1: Search for currently live streams
    for (let i = 0; i < channelIds.length; i++) {
      const channelId = channelIds[i]
      const channelName = PRIORITY_CHANNELS[i].name

      try {
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
        searchUrl.searchParams.append('part', 'snippet')
        searchUrl.searchParams.append('channelId', channelId)
        searchUrl.searchParams.append('type', 'video')
        searchUrl.searchParams.append('eventType', 'live')
        searchUrl.searchParams.append('maxResults', '3')
        searchUrl.searchParams.append('key', apiKey)

        const response = await fetch(searchUrl.toString())

        if (response.ok) {
          const data: YouTubeSearchResponse = await response.json()
          if (data.items && data.items.length > 0) {
            console.log(`✓ Found ${data.items.length} live stream(s) for ${channelName}`)
            allVideos.push(...data.items.map(item => ({ ...item, streamType: 'live' as const })))
          }
        }
      } catch (error) {
        console.error(`Error fetching live streams for ${channelName}:`, error)
      }
    }

    console.log('[YouTube API] Live streams found:', allVideos.filter(v => v.streamType === 'live').length)

    // Step 2: If we need more content, get recent videos (max 5 per channel)
    if (allVideos.length < 8) {
      for (let i = 0; i < channelIds.length; i++) {
        const channelId = channelIds[i]
        const channelName = PRIORITY_CHANNELS[i].name

        try {
          const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
          searchUrl.searchParams.append('part', 'snippet')
          searchUrl.searchParams.append('channelId', channelId)
          searchUrl.searchParams.append('type', 'video')
          searchUrl.searchParams.append('maxResults', '5')
          searchUrl.searchParams.append('order', 'date')
          searchUrl.searchParams.append('key', apiKey)

          const response = await fetch(searchUrl.toString())

          if (response.ok) {
            const data: YouTubeSearchResponse = await response.json()
            if (data.items && data.items.length > 0) {
              console.log(`✓ Found ${data.items.length} recent video(s) for ${channelName}`)
              // Mark as 'recent' for now, will determine actual type later
              allVideos.push(...data.items.map(item => ({ ...item, streamType: 'recent' as const })))
            } else {
              console.log(`No videos found for ${channelName}`)
            }
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error(`Failed to fetch videos for ${channelName} (status: ${response.status})`, errorData)
          }
        } catch (error) {
          console.error(`Error fetching recent videos for ${channelName}:`, error)
        }
      }
    }

    console.log('[YouTube API] Total videos found (all types):', allVideos.length)

    // Remove duplicates
    const uniqueVideos = Array.from(
      new Map(allVideos.map(v => [v.id.videoId, v])).values()
    )
    console.log('[YouTube API] Unique videos after deduplication:', uniqueVideos.length)

    if (uniqueVideos.length === 0) {
      console.warn('[YouTube API] No live streams found')
      return NextResponse.json({ streams: [] }, { status: 200 })
    }

    // Get video details for viewer count and actual live status
    const videoIds = uniqueVideos.map(item => item.id.videoId).join(',')
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    videosUrl.searchParams.append('part', 'liveStreamingDetails,statistics,snippet')
    videosUrl.searchParams.append('id', videoIds)
    videosUrl.searchParams.append('key', apiKey)

    const videosResponse = await fetch(videosUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    })

    let viewerCounts: Record<string, string> = {}
    let videoTypes: Record<string, 'live' | 'completed' | 'recent'> = {}

    if (videosResponse.ok) {
      const videosData = await videosResponse.json()

      if (videosData.items) {
        videosData.items.forEach((item: any) => {
          // Determine actual stream type based on liveBroadcastContent
          const liveBroadcastContent = item.snippet?.liveBroadcastContent
          if (liveBroadcastContent === 'live') {
            videoTypes[item.id] = 'live'
            if (item.liveStreamingDetails?.concurrentViewers) {
              viewerCounts[item.id] = item.liveStreamingDetails.concurrentViewers
            }
          } else if (liveBroadcastContent === 'none' && item.liveStreamingDetails) {
            // Was a live stream, now ended
            videoTypes[item.id] = 'completed'
          } else {
            videoTypes[item.id] = 'recent'
          }
        })
      }
    }

    // Update stream types based on actual video data
    uniqueVideos.forEach((video: any) => {
      if (videoTypes[video.id.videoId]) {
        video.streamType = videoTypes[video.id.videoId]
      }
    })

    // Get channel thumbnails
    const channelIdsForThumbnails = uniqueVideos.map(item => item.snippet.channelId).join(',')
    const channelsUrl = new URL('https://www.googleapis.com/youtube/v3/channels')
    channelsUrl.searchParams.append('part', 'snippet')
    channelsUrl.searchParams.append('id', channelIdsForThumbnails)
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

    // Transform to our format with priority and stream type
    const streams: LiveStream[] = uniqueVideos
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
          streamType: item.streamType,
          publishedAt: item.snippet.publishedAt,
        }
      })
      // Sort by stream type first (live > completed > recent), then by priority, then by time/viewers
      .sort((a, b) => {
        // 1. Live streams always first
        const typeOrder = { live: 0, completed: 1, recent: 2 }
        if (typeOrder[a.streamType] !== typeOrder[b.streamType]) {
          return typeOrder[a.streamType] - typeOrder[b.streamType]
        }

        // 2. Then by priority
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }

        // 3. Live: sort by viewer count, Others: sort by publish date
        if (a.streamType === 'live') {
          const aViewers = parseInt(a.viewerCount || '0')
          const bViewers = parseInt(b.viewerCount || '0')
          return bViewers - aViewers
        } else {
          // More recent first
          return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
        }
      })
      // Take top 8
      .slice(0, 8)

    console.log('[YouTube API] Final streams count:', streams.length)
    console.log('[YouTube API] Stream types:', streams.reduce((acc, s) => {
      acc[s.streamType] = (acc[s.streamType] || 0) + 1
      return acc
    }, {} as Record<string, number>))
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
