import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const revalidate = 300 // Cache for 5 minutes

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
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    console.warn('YouTube API key not configured')
    return NextResponse.json({ streams: [] }, { status: 200 })
  }

  try {
    // Search for live poker streams
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.append('part', 'snippet')
    searchUrl.searchParams.append('q', 'poker')
    searchUrl.searchParams.append('type', 'video')
    searchUrl.searchParams.append('eventType', 'live')
    searchUrl.searchParams.append('maxResults', '8')
    searchUrl.searchParams.append('order', 'viewCount')
    searchUrl.searchParams.append('relevanceLanguage', 'en')
    searchUrl.searchParams.append('videoCategoryId', '20') // Gaming category
    searchUrl.searchParams.append('key', apiKey)

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!searchResponse.ok) {
      const errorData = await searchResponse.text()
      console.error('YouTube API search error:', errorData)
      return NextResponse.json({ streams: [] }, { status: 200 })
    }

    const searchData: YouTubeSearchResponse = await searchResponse.json()

    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({ streams: [] }, { status: 200 })
    }

    // Get video details for viewer count
    const videoIds = searchData.items.map(item => item.id.videoId).join(',')
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
    const channelIds = searchData.items.map(item => item.snippet.channelId).join(',')
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

    // Transform to our format
    const streams: LiveStream[] = searchData.items
      .filter(item => item.snippet.liveBroadcastContent === 'live')
      .map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        channelThumbnail: channelThumbnails[item.snippet.channelId] || '',
        thumbnailUrl: item.snippet.thumbnails.high.url,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        viewerCount: viewerCounts[item.id.videoId] || undefined,
      }))

    return NextResponse.json({ streams }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })

  } catch (error) {
    console.error('Failed to fetch YouTube live streams:', error)
    return NextResponse.json({ streams: [] }, { status: 200 })
  }
}
