/**
 * Logo Management Utilities
 *
 * Provides functions to get logo files from:
 * 1. Static logos (public/logos/)
 * 2. Uploaded logos (Supabase Storage)
 */

import { createClientSupabaseClient } from './supabase-client'

export interface LogoFile {
  name: string
  path: string
  url: string
  source: 'static' | 'uploaded'
  size?: number
  createdAt?: string
}

/**
 * Static logos in public/logos/ folder
 * Updated: 2025-10-25 (42 files)
 */
export const STATIC_LOGOS: LogoFile[] = [
  { name: '888poker Live', path: '/logos/888poker-live.svg', url: '/logos/888poker-live.svg', source: 'static' },
  { name: '888poker', path: '/logos/888poker.svg', url: '/logos/888poker.svg', source: 'static' },
  { name: 'APL', path: '/logos/apl.svg', url: '/logos/apl.svg', source: 'static' },
  { name: 'APPT', path: '/logos/appt.svg', url: '/logos/appt.svg', source: 'static' },
  { name: 'Australian Poker Open', path: '/logos/australian-poker-open.svg', url: '/logos/australian-poker-open.svg', source: 'static' },
  { name: 'BSOP', path: '/logos/bsop.svg', url: '/logos/bsop.svg', source: 'static' },
  { name: 'EPT', path: '/logos/ept.svg', url: '/logos/ept.svg', source: 'static' },
  { name: 'ESPT', path: '/logos/espt.svg', url: '/logos/espt.svg', source: 'static' },
  { name: 'Eureka', path: '/logos/eureka.svg', url: '/logos/eureka.svg', source: 'static' },
  { name: 'GGPoker UK (PNG)', path: '/logos/ggpoker-uk.png', url: '/logos/ggpoker-uk.png', source: 'static' },
  { name: 'GGPoker UK', path: '/logos/ggpoker-uk.svg', url: '/logos/ggpoker-uk.svg', source: 'static' },
  { name: 'Global Poker', path: '/logos/global-poker.svg', url: '/logos/global-poker.svg', source: 'static' },
  { name: 'Hendon Mob', path: '/logos/hendon-mob.svg', url: '/logos/hendon-mob.svg', source: 'static' },
  { name: 'Hustler', path: '/logos/hustler.svg', url: '/logos/hustler.svg', source: 'static' },
  { name: 'LAPT', path: '/logos/lapt.svg', url: '/logos/lapt.svg', source: 'static' },
  { name: 'Merit Poker', path: '/logos/merit-poker.svg', url: '/logos/merit-poker.svg', source: 'static' },
  { name: 'NAPT', path: '/logos/napt.svg', url: '/logos/napt.svg', source: 'static' },
  { name: 'ONCOOP', path: '/logos/oncoop.svg', url: '/logos/oncoop.svg', source: 'static' },
  { name: 'PACOOP', path: '/logos/pacoop.svg', url: '/logos/pacoop.svg', source: 'static' },
  { name: 'Poker Masters', path: '/logos/poker-masters.svg', url: '/logos/poker-masters.svg', source: 'static' },
  { name: 'PokerGO Tour', path: '/logos/pokergo-tour.svg', url: '/logos/pokergo-tour.svg', source: 'static' },
  { name: 'PokerStars Open (PNG)', path: '/logos/pokerstars-open.png', url: '/logos/pokerstars-open.png', source: 'static' },
  { name: 'PokerStars Open', path: '/logos/pokerstars-open.svg', url: '/logos/pokerstars-open.svg', source: 'static' },
  { name: 'RunGood', path: '/logos/rungood.svg', url: '/logos/rungood.svg', source: 'static' },
  { name: 'SCOOP', path: '/logos/scoop.svg', url: '/logos/scoop.svg', source: 'static' },
  { name: 'Super High Roller Bowl', path: '/logos/super-high-roller-bowl.svg', url: '/logos/super-high-roller-bowl.svg', source: 'static' },
  { name: 'Triton One', path: '/logos/triton-one.svg', url: '/logos/triton-one.svg', source: 'static' },
  { name: 'Triton Symbol', path: '/logos/triton-symbol.svg', url: '/logos/triton-symbol.svg', source: 'static' },
  { name: 'Triton (PNG)', path: '/logos/triton.png', url: '/logos/triton.png', source: 'static' },
  { name: 'Triton', path: '/logos/triton.svg', url: '/logos/triton.svg', source: 'static' },
  { name: 'UKIPT', path: '/logos/ukipt.svg', url: '/logos/ukipt.svg', source: 'static' },
  { name: 'US Poker Open', path: '/logos/us-poker-open.svg', url: '/logos/us-poker-open.svg', source: 'static' },
  { name: 'USCOOP', path: '/logos/uscoop.svg', url: '/logos/uscoop.svg', source: 'static' },
  { name: 'WCOOP', path: '/logos/wcoop.svg', url: '/logos/wcoop.svg', source: 'static' },
  { name: 'WPT Prime', path: '/logos/wpt-prime.svg', url: '/logos/wpt-prime.svg', source: 'static' },
  { name: 'WPT Symbol', path: '/logos/wpt-symbol.svg', url: '/logos/wpt-symbol.svg', source: 'static' },
  { name: 'WPT', path: '/logos/wpt.svg', url: '/logos/wpt.svg', source: 'static' },
  { name: 'WSOP Circuit', path: '/logos/wsop-circuit.svg', url: '/logos/wsop-circuit.svg', source: 'static' },
  { name: 'WSOP Paradise', path: '/logos/wsop-paradise.svg', url: '/logos/wsop-paradise.svg', source: 'static' },
  { name: 'WSOP Symbol', path: '/logos/wsop-symbol.svg', url: '/logos/wsop-symbol.svg', source: 'static' },
  { name: 'WSOP', path: '/logos/wsop.svg', url: '/logos/wsop.svg', source: 'static' },
  { name: 'WSOPE', path: '/logos/wsope.svg', url: '/logos/wsope.svg', source: 'static' },
]

/**
 * Get all static logos from public/logos/ folder
 */
export function getStaticLogos(): LogoFile[] {
  return STATIC_LOGOS
}

/**
 * Get uploaded logos from Supabase Storage
 * @returns Promise<LogoFile[]>
 */
export async function getUploadedLogos(): Promise<LogoFile[]> {
  try {
    const supabase = createClientSupabaseClient()

    const { data, error } = await supabase
      .storage
      .from('tournament-logos')
      .list()

    if (error) {
      console.error('Error fetching uploaded logos:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Get public URLs for each file
    const logos: LogoFile[] = data
      .filter((file) => file.name !== '.emptyFolderPlaceholder')
      .map((file) => {
        const { data: urlData } = supabase
          .storage
          .from('tournament-logos')
          .getPublicUrl(file.name)

        return {
          name: file.name.replace(/\.(svg|png|jpg|jpeg)$/i, ''),
          path: `tournament-logos/${file.name}`,
          url: urlData.publicUrl,
          source: 'uploaded' as const,
          size: file.metadata?.size,
          createdAt: file.created_at,
        }
      })

    return logos
  } catch (error) {
    console.error('Error in getUploadedLogos:', error)
    return []
  }
}

/**
 * Get all logos (static + uploaded)
 */
export async function getAllLogos(): Promise<LogoFile[]> {
  const staticLogos = getStaticLogos()
  const uploadedLogos = await getUploadedLogos()

  return [...staticLogos, ...uploadedLogos]
}

/**
 * Search logos by name
 */
export function searchLogos(logos: LogoFile[], query: string): LogoFile[] {
  const lowerQuery = query.toLowerCase().trim()

  if (!lowerQuery) {
    return logos
  }

  return logos.filter((logo) =>
    logo.name.toLowerCase().includes(lowerQuery) ||
    logo.path.toLowerCase().includes(lowerQuery)
  )
}
