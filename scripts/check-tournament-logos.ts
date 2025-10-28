import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkLogos() {
  console.log('🔍 Checking tournament logos...\n')

  // 1. Check EPT tournaments
  console.log('1. EPT Tournaments:')
  const { data: eptTournaments } = await supabase
    .from('tournaments')
    .select('id, name, category, category_id, category_logo')
    .ilike('name', '%EPT%')
    .limit(5)

  eptTournaments?.forEach((t) => {
    console.log(`  - ${t.name}`)
    console.log(`    category: ${t.category}`)
    console.log(`    category_id: ${t.category_id}`)
    console.log(`    category_logo: ${t.category_logo || 'NULL'}`)
  })

  // 2. Check Triton tournaments
  console.log('\n2. Triton Tournaments:')
  const { data: tritonTournaments } = await supabase
    .from('tournaments')
    .select('id, name, category, category_id, category_logo')
    .ilike('name', '%Triton%')
    .limit(5)

  tritonTournaments?.forEach((t) => {
    console.log(`  - ${t.name}`)
    console.log(`    category: ${t.category}`)
    console.log(`    category_id: ${t.category_id}`)
    console.log(`    category_logo: ${t.category_logo || 'NULL'}`)
  })

  // 3. Check tournament_categories table
  console.log('\n3. Tournament Categories:')
  const { data: categories } = await supabase
    .from('tournament_categories')
    .select('id, name, short_name, aliases, logo_url')
    .order('name')

  categories?.forEach((c) => {
    console.log(`  - ${c.name} (${c.id})`)
    console.log(`    short_name: ${c.short_name || 'NULL'}`)
    console.log(`    aliases: ${c.aliases?.join(', ') || 'NULL'}`)
    console.log(`    logo_url: ${c.logo_url || 'NULL'}`)
  })

  // 4. Check if category_id matches with tournament_categories.id
  console.log('\n4. Checking category_id mappings:')

  // EPT category
  const { data: eptCategory } = await supabase
    .from('tournament_categories')
    .select('*')
    .eq('id', 'ept')
    .single()

  console.log('  EPT Category:')
  console.log(`    id: ${eptCategory?.id}`)
  console.log(`    name: ${eptCategory?.name}`)
  console.log(`    aliases: ${eptCategory?.aliases?.join(', ')}`)
  console.log(`    logo_url: ${eptCategory?.logo_url || 'NULL'}`)

  // Triton category
  const { data: tritonCategory } = await supabase
    .from('tournament_categories')
    .select('*')
    .eq('id', 'triton')
    .single()

  console.log('  Triton Category:')
  console.log(`    id: ${tritonCategory?.id}`)
  console.log(`    name: ${tritonCategory?.name}`)
  console.log(`    aliases: ${tritonCategory?.aliases?.join(', ')}`)
  console.log(`    logo_url: ${tritonCategory?.logo_url || 'NULL'}`)
}

checkLogos().then(() => process.exit(0))
