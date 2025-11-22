/**
 * Check tournament categories
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://diopilmkehygiqpizvga.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpb3BpbG1rZWh5Z2lxcGl6dmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY0MTUzNywiZXhwIjoyMDc1MjE3NTM3fQ.7_vC-KkzSeJL1rBRiVSzY6ktJ7oO8kVeBWRSV_tHnSg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCategories() {
  console.log('🔍 Checking tournament categories...\n')

  try {
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('id, name, category, category_id')
      .order('start_date', { ascending: false })

    if (error) throw error

    console.log('📊 Tournament Categories:\n')

    const grouped: Record<string, any[]> = {}
    tournaments?.forEach(t => {
      const cat = t.category || 'NULL'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(t)
    })

    Object.entries(grouped).forEach(([category, items]) => {
      console.log(`  ${category}: ${items.length} tournaments`)
      items.slice(0, 3).forEach(t => {
        console.log(`    - ${t.name}`)
        console.log(`      category_id: ${t.category_id || 'NULL'}`)
      })
      if (items.length > 3) {
        console.log(`    ... and ${items.length - 3} more`)
      }
      console.log('')
    })

    // Check Triton specifically
    const tritonTournaments = tournaments?.filter(t =>
      t.name.toLowerCase().includes('triton')
    )

    if (tritonTournaments && tritonTournaments.length > 0) {
      console.log('\n🎯 Triton Tournaments Detail:')
      tritonTournaments.forEach(t => {
        console.log(`  ${t.name}`)
        console.log(`    category: "${t.category}"`)
        console.log(`    category_id: "${t.category_id || 'NULL'}"`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkCategories()
