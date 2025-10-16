import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

async function main() {
  const { data: unsorted } = await supabase
    .from('days')
    .select('id, name')
    .is('sub_event_id', null)
    .eq('is_organized', false)

  console.log('\n📊 Remaining unsorted videos:', unsorted ? unsorted.length : 0)

  const tritonCount = unsorted ? unsorted.filter(v => v.name.toLowerCase().includes('triton')).length : 0
  console.log('   - Triton videos:', tritonCount)
  console.log('   - Other videos:', (unsorted ? unsorted.length : 0) - tritonCount)

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, category')
    .eq('category', 'Triton')

  console.log('\n📁 Created Triton Tournaments:', tournaments ? tournaments.length : 0)

  for (const t of tournaments || []) {
    const { data: subEvents } = await supabase
      .from('sub_events')
      .select('id, name')
      .eq('tournament_id', t.id)

    const subEventIds = subEvents ? subEvents.map(se => se.id) : []

    if (subEventIds.length > 0) {
      const { data: days } = await supabase
        .from('days')
        .select('id')
        .in('sub_event_id', subEventIds)

      console.log(`\n   ✅ ${t.name}`)
      console.log(`      - ${subEvents ? subEvents.length : 0} SubEvents`)
      console.log(`      - ${days ? days.length : 0} Videos`)
    }
  }

  console.log('\n✅ Verification complete!\n')
}

main()
