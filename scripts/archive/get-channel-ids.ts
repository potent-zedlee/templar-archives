/**
 * Script to fetch YouTube channel IDs for priority poker channels
 * Run once to get channel IDs for hardcoding
 */

const PRIORITY_HANDLES = [
  '@wsop',
  '@tritonpoker',
  '@pokerstars',
  '@HustlerCasinoLive',
  '@PokerGO',
]

async function getChannelIdFromHandle(handle: string, apiKey: string): Promise<string | null> {
  try {
    const cleanHandle = handle.replace(/^@/, '')

    const handleUrl = new URL('https://www.googleapis.com/youtube/v3/channels')
    handleUrl.searchParams.append('part', 'id,snippet')
    handleUrl.searchParams.append('forHandle', cleanHandle)
    handleUrl.searchParams.append('key', apiKey)

    const response = await fetch(handleUrl.toString())

    if (response.ok) {
      const data = await response.json()
      if (data.items && data.items.length > 0) {
        return data.items[0].id
      }
    } else {
      const errorData = await response.json().catch(() => ({}))
      console.error(`Failed for ${handle}:`, errorData)
    }

    return null
  } catch (error) {
    console.error(`Error for ${handle}:`, error)
    return null
  }
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    console.error('YOUTUBE_API_KEY not found in environment')
    process.exit(1)
  }

  console.log('Fetching channel IDs...\n')

  const results: Array<{ handle: string, channelId: string | null }> = []

  for (const handle of PRIORITY_HANDLES) {
    const channelId = await getChannelIdFromHandle(handle, apiKey)
    results.push({ handle, channelId })
    console.log(`${handle}: ${channelId || 'NOT FOUND'}`)
  }

  console.log('\n--- Copy this to PRIORITY_CHANNELS ---\n')

  const channelNames = ['WSOP', 'Triton Poker', 'PokerStars', 'Hustler Casino Live', 'PokerGO']

  results.forEach((result, i) => {
    const name = channelNames[i]
    const priority = i < 4 ? 1 : 2
    console.log(`  { name: '${name}', handle: '${result.handle}', channelId: '${result.channelId}', priority: ${priority} },`)
  })
}

main()
