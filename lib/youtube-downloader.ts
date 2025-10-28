/**
 * YouTube Video Downloader Utility
 *
 * YouTube 비디오 정보 추출 및 스트림 URL 가져오기
 */

import ytdl from '@distube/ytdl-core'

export interface VideoInfo {
  videoId: string
  title: string
  duration: number // seconds
  author: string
  thumbnailUrl: string
  formats: VideoFormat[]
}

export interface VideoFormat {
  itag: number
  container: string
  quality: string
  qualityLabel: string
  width?: number
  height?: number
  fps?: number
  url: string
  hasAudio: boolean
  hasVideo: boolean
}

/**
 * YouTube URL에서 비디오 ID 추출
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url)

    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v')
    }

    // youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1)
    }

    return null
  } catch {
    return null
  }
}

/**
 * YouTube URL 유효성 검증
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null
}

/**
 * YouTube 비디오 정보 가져오기
 */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  try {
    if (!isValidYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL')
    }

    const info = await ytdl.getInfo(url)

    // 비디오 포맷 정보 추출
    const formats: VideoFormat[] = info.formats
      .filter((f) => f.hasVideo && f.container === 'mp4')
      .map((f) => ({
        itag: f.itag,
        container: f.container || 'mp4',
        quality: f.quality || 'unknown',
        qualityLabel: f.qualityLabel || 'unknown',
        width: f.width,
        height: f.height,
        fps: f.fps,
        url: f.url,
        hasAudio: f.hasAudio,
        hasVideo: f.hasVideo,
      }))

    return {
      videoId: info.videoDetails.videoId,
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      author: info.videoDetails.author.name,
      thumbnailUrl:
        info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url || '',
      formats,
    }
  } catch (error) {
    console.error('Failed to get video info:', error)
    throw new Error('Failed to get video info: ' + (error as Error).message)
  }
}

/**
 * 최적의 비디오 포맷 선택 (1280x720 우선)
 */
export function selectBestFormat(formats: VideoFormat[]): VideoFormat | null {
  // 1. 1280x720 포맷 찾기
  const format720p = formats.find(
    (f) => f.width === 1280 && f.height === 720 && f.hasVideo && !f.hasAudio
  )
  if (format720p) return format720p

  // 2. 720p 레이블이 있는 포맷 찾기
  const format720pLabel = formats.find(
    (f) => f.qualityLabel === '720p' && f.hasVideo && !f.hasAudio
  )
  if (format720pLabel) return format720pLabel

  // 3. 가장 가까운 해상도 찾기 (720p 근처)
  const closest = formats
    .filter((f) => f.hasVideo && !f.hasAudio && f.height)
    .sort((a, b) => {
      const diffA = Math.abs((a.height || 0) - 720)
      const diffB = Math.abs((b.height || 0) - 720)
      return diffA - diffB
    })[0]

  return closest || null
}

/**
 * YouTube 비디오 스트림 URL 가져오기
 */
export async function getVideoStreamUrl(url: string): Promise<{
  streamUrl: string
  format: VideoFormat
  videoInfo: VideoInfo
}> {
  const videoInfo = await getVideoInfo(url)

  const bestFormat = selectBestFormat(videoInfo.formats)
  if (!bestFormat) {
    throw new Error('No suitable video format found')
  }

  return {
    streamUrl: bestFormat.url,
    format: bestFormat,
    videoInfo,
  }
}

/**
 * YouTube 비디오 다운로드 (실제 다운로드는 하지 않고 스트림 반환)
 */
export async function createYouTubeStream(url: string) {
  if (!isValidYouTubeUrl(url)) {
    throw new Error('Invalid YouTube URL')
  }

  // 비디오 only 포맷 선택 (오디오 제외)
  return ytdl(url, {
    quality: 'highestvideo',
    filter: (format) => format.container === 'mp4' && format.hasVideo && !format.hasAudio,
  })
}
