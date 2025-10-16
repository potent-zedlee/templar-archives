/**
 * Auto-organization logic for YouTube channel videos
 * Groups videos by date and creates Tournament/SubEvent structure
 */

import type { YouTubeVideo } from './youtube-api'

export interface VideoGroup {
  startDate: Date
  endDate: Date
  videos: YouTubeVideo[]
}

export interface OrganizedStructure {
  tournaments: TournamentStructure[]
}

export interface TournamentStructure {
  name: string
  category: string
  location: string
  startDate: string
  endDate: string
  subEvents: SubEventStructure[]
}

export interface SubEventStructure {
  name: string
  date: string
  videos: YouTubeVideo[]
}

export type GroupingStrategy = 'week' | 'month' | 'day'

/**
 * Get the start of week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the start of month for a given date
 */
function getMonthStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the start of day for a given date
 */
function getDayStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Format date range for display
 */
function formatDateRange(startDate: Date, endDate: Date, strategy: GroupingStrategy): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

  if (strategy === 'month') {
    return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  if (strategy === 'day') {
    return startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Week
  const start = startDate.toLocaleDateString('en-US', options)
  const end = endDate.toLocaleDateString('en-US', options)
  return `${start} - ${end}`
}

/**
 * Group videos by date strategy
 */
export function groupVideosByDate(
  videos: YouTubeVideo[],
  strategy: GroupingStrategy = 'week'
): Map<string, VideoGroup> {
  const groups = new Map<string, VideoGroup>()

  // Sort videos by publish date (oldest first)
  const sortedVideos = [...videos].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  )

  for (const video of sortedVideos) {
    const publishDate = new Date(video.publishedAt)

    let groupStartDate: Date
    let groupKey: string

    switch (strategy) {
      case 'month':
        groupStartDate = getMonthStart(publishDate)
        groupKey = `${groupStartDate.getFullYear()}-${String(groupStartDate.getMonth() + 1).padStart(2, '0')}`
        break
      case 'day':
        groupStartDate = getDayStart(publishDate)
        groupKey = `${groupStartDate.getFullYear()}-${String(groupStartDate.getMonth() + 1).padStart(2, '0')}-${String(groupStartDate.getDate()).padStart(2, '0')}`
        break
      case 'week':
      default:
        groupStartDate = getWeekStart(publishDate)
        groupKey = `${groupStartDate.getFullYear()}-W${getWeekNumber(groupStartDate)}`
        break
    }

    if (!groups.has(groupKey)) {
      const endDate = new Date(groupStartDate)

      switch (strategy) {
        case 'month':
          endDate.setMonth(endDate.getMonth() + 1)
          endDate.setDate(0) // Last day of month
          break
        case 'day':
          endDate.setDate(endDate.getDate() + 1)
          endDate.setMilliseconds(-1) // End of day
          break
        case 'week':
        default:
          endDate.setDate(endDate.getDate() + 6) // End of week (Sunday)
          break
      }

      groups.set(groupKey, {
        startDate: groupStartDate,
        endDate: endDate,
        videos: [],
      })
    }

    groups.get(groupKey)!.videos.push(video)
  }

  return groups
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Extract channel name from videos or use default
 */
function getChannelName(videos: YouTubeVideo[]): string {
  // Try to extract from first video's URL or title
  if (videos.length > 0) {
    // For now, return a generic name
    // In a real implementation, you might want to fetch channel details
    return 'YouTube Channel'
  }
  return 'YouTube Channel'
}

/**
 * Detect category from video titles (simple heuristic)
 */
function detectCategory(videos: YouTubeVideo[]): string {
  const titles = videos.map(v => v.title.toLowerCase()).join(' ')

  if (titles.includes('wsop') || titles.includes('world series')) return 'WSOP'
  if (titles.includes('triton')) return 'Triton'
  if (titles.includes('ept') || titles.includes('pokerstars')) return 'EPT'
  if (titles.includes('hustler')) return 'Hustler Casino Live'
  if (titles.includes('apt')) return 'APT'
  if (titles.includes('apl')) return 'APL'
  if (titles.includes('ggpoker')) return 'GGPOKER'

  return 'Other'
}

/**
 * Create organized structure from videos
 */
export function createAutoOrganizedStructure(
  videos: YouTubeVideo[],
  options: {
    channelName?: string
    groupBy?: GroupingStrategy
    category?: string
    location?: string
  } = {}
): OrganizedStructure {
  const {
    channelName = getChannelName(videos),
    groupBy = 'week',
    category = detectCategory(videos),
    location = 'Online',
  } = options

  const videoGroups = groupVideosByDate(videos, groupBy)

  // Group by month for tournaments
  const monthGroups = new Map<string, Map<string, VideoGroup>>()

  for (const [key, group] of videoGroups.entries()) {
    const monthKey = `${group.startDate.getFullYear()}-${String(group.startDate.getMonth() + 1).padStart(2, '0')}`

    if (!monthGroups.has(monthKey)) {
      monthGroups.set(monthKey, new Map())
    }

    monthGroups.get(monthKey)!.set(key, group)
  }

  // Create tournament structures
  const tournaments: TournamentStructure[] = []

  for (const [monthKey, groups] of monthGroups.entries()) {
    const allVideos = Array.from(groups.values()).flatMap(g => g.videos)
    const startDate = new Date(Math.min(...allVideos.map(v => new Date(v.publishedAt).getTime())))
    const endDate = new Date(Math.max(...allVideos.map(v => new Date(v.publishedAt).getTime())))

    const monthStart = new Date(startDate)
    monthStart.setDate(1)
    const tournamentName = `${channelName} - ${monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`

    const subEvents: SubEventStructure[] = []

    // Sort groups by date
    const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
      a[1].startDate.getTime() - b[1].startDate.getTime()
    )

    for (const [key, group] of sortedGroups) {
      const subEventName = formatDateRange(group.startDate, group.endDate, groupBy)

      subEvents.push({
        name: subEventName,
        date: group.startDate.toISOString().split('T')[0],
        videos: group.videos,
      })
    }

    tournaments.push({
      name: tournamentName,
      category: category,
      location: location,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      subEvents,
    })
  }

  return { tournaments }
}

/**
 * Preview the organized structure as a tree
 */
export function previewOrganizedStructure(structure: OrganizedStructure): string {
  let preview = ''

  for (const tournament of structure.tournaments) {
    preview += `📁 ${tournament.name} (${tournament.category})\n`
    preview += `   📍 ${tournament.location}\n`
    preview += `   📅 ${tournament.startDate} → ${tournament.endDate}\n`

    for (const subEvent of tournament.subEvents) {
      preview += `   ├─ ${subEvent.name} (${subEvent.videos.length} video${subEvent.videos.length > 1 ? 's' : ''})\n`
    }

    preview += '\n'
  }

  return preview
}
