import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Category {
  id: string
  name: string
  display_name: string
  short_name: string
  aliases: string[]
}

const categories: Category[] = [
  {
    id: 'ept',
    name: 'European Poker Tour',
    display_name: 'EPT',
    short_name: 'EPT',
    aliases: ['EPT', 'European Poker Tour'],
  },
  {
    id: 'pca',
    name: 'PokerStars Caribbean Adventure',
    display_name: 'PCA',
    short_name: 'PCA',
    aliases: ['PCA', 'PokerStars Caribbean Adventure'],
  },
  {
    id: 'lapt',
    name: 'Latin American Poker Tour',
    display_name: 'LAPT',
    short_name: 'LAPT',
    aliases: ['LAPT', 'Latin American Poker Tour'],
  },
  {
    id: 'bsop',
    name: 'Brazilian Series of Poker',
    display_name: 'BSOP',
    short_name: 'BSOP',
    aliases: ['BSOP', 'Brazilian Series of Poker'],
  },
  {
    id: 'appt',
    name: 'Asia Pacific Poker Tour',
    display_name: 'APPT',
    short_name: 'APPT',
    aliases: ['APPT', 'Asia Pacific Poker Tour'],
  },
  {
    id: 'napt',
    name: 'North American Poker Tour',
    display_name: 'NAPT',
    short_name: 'NAPT',
    aliases: ['NAPT', 'North American Poker Tour'],
  },
  {
    id: 'ukipt',
    name: 'UK & Ireland Poker Tour',
    display_name: 'UKIPT',
    short_name: 'UKIPT',
    aliases: ['UKIPT', 'UK & Ireland Poker Tour'],
  },
]

async function setupCategories() {
  console.log('🔍 Checking PokerStars tournament categories...\n')

  for (const category of categories) {
    // Check if category exists
    const { data: existing } = await supabase
      .from('tournament_categories')
      .select('id, name')
      .eq('id', category.id)
      .single()

    if (existing) {
      console.log(`✅ Category "${category.name}" (${category.id}) already exists`)
    } else {
      // Create category
      const { error } = await supabase
        .from('tournament_categories')
        .insert({
          id: category.id,
          name: category.name,
          display_name: category.display_name,
          short_name: category.short_name,
          aliases: category.aliases,
          is_active: true,
          game_type: 'tournament',
        })

      if (error) {
        console.error(`❌ Failed to create category "${category.name}":`, error.message)
      } else {
        console.log(`✅ Created category "${category.name}" (${category.id})`)
      }
    }
  }

  console.log('\n✅ Category setup complete!')
}

setupCategories().then(() => process.exit(0))
