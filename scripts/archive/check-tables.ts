/**
 * Check if streams table exists in Supabase
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://diopilmkehygiqpizvga.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpb3BpbG1rZWh5Z2lxcGl6dmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY0MTUzNywiZXhwIjoyMDc1MjE3NTM3fQ.7_vC-KkzSeJL1rBRiVSzY6ktJ7oO8kVeBWRSV_tHnSg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTables() {
  console.log('🔍 Checking if days and streams tables exist...\n')

  try {
    // Check days table
    const { error: daysError, count: daysCount } = await supabase
      .from('days')
      .select('*', { count: 'exact', head: true })

    if (daysError) {
      console.log('❌ days table:', daysError.message)
    } else {
      console.log(`✅ days table exists (${daysCount} rows)`)
    }

    // Check streams table
    const { error: streamsError, count: streamsCount } = await supabase
      .from('streams')
      .select('*', { count: 'exact', head: true })

    if (streamsError) {
      console.log('❌ streams table:', streamsError.message)
    } else {
      console.log(`✅ streams table exists (${streamsCount} rows)`)
    }

    console.log('\n💡 Conclusion:')
    if (!daysError && !streamsError) {
      console.log('Both tables exist! Need to check which one is being used.')
    } else if (!daysError) {
      console.log('Only days table exists. Queries should use "days".')
    } else if (!streamsError) {
      console.log('Only streams table exists. Queries should use "streams".')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkTables()
