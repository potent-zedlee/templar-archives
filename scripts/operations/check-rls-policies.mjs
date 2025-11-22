import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies for core tables...\n')

  const tables = [
    'tournaments',
    'sub_events',
    'streams',
    'hands',
    'players',
    'hand_players',
    'hand_actions',
  ]

  // Get all policies at once
  const { data: allPolicies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('schemaname', 'public')
    .in('tablename', tables)
    .order('tablename')
    .order('policyname')

  if (policiesError) {
    console.log(`⚠️  Could not fetch policies: ${policiesError.message}\n`)
    console.log('Trying direct query method...\n')

    // Use direct SQL query
    const { data: directPolicies, error: directError } = await supabase.rpc(
      'exec_sql',
      {
        query: `
          SELECT schemaname, tablename, policyname, cmd, roles::text, qual, with_check
          FROM pg_policies
          WHERE schemaname = 'public' AND tablename = ANY($1)
          ORDER BY tablename, policyname
        `,
        params: [tables],
      }
    )

    if (directError) {
      console.error('❌ Direct query failed:', directError.message)
    }
  }

  for (const table of tables) {
    console.log(`📋 ${table}:`)

    const policies = allPolicies?.filter((p) => p.tablename === table) || []

    if (policies.length === 0) {
      console.log('   ⚠️  No policies found!')
    } else {
      console.log(`   ✅ ${policies.length} policies found:`)
      policies.forEach((policy) => {
        console.log(`      - ${policy.policyname}`)
        console.log(`        Command: ${policy.cmd}`)
        console.log(`        Roles: ${policy.roles}`)
        if (policy.qual) console.log(`        USING: ${policy.qual}`)
        if (policy.with_check)
          console.log(`        WITH CHECK: ${policy.with_check}`)
      })
    }

    console.log()
  }

  // Test actual SELECT access
  console.log('\n🧪 Testing actual SELECT access (anonymous)...\n')

  const anonSupabase = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  for (const table of ['tournaments', 'sub_events']) {
    const { data, error } = await anonSupabase.from(table).select('id').limit(1)

    if (error) {
      console.log(`❌ ${table}: ${error.message}`)
    } else {
      console.log(
        `✅ ${table}: SELECT works (${data ? data.length : 0} rows)`
      )
    }
  }
}

checkRLSPolicies().catch(console.error)
