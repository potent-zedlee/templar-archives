/**
 * Apply RLS fix directly via Supabase client
 * This script applies the SQL from the migration file
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyRLSFix() {
  console.log('🔧 Applying RLS SELECT policy fixes...\n')

  const tables = [
    'tournaments',
    'sub_events',
    'streams',
    'hands',
    'players',
    'hand_players',
    'hand_actions',
  ]

  let successCount = 0
  let errorCount = 0

  for (const table of tables) {
    console.log(`📋 Processing ${table}...`)

    try {
      // Drop existing SELECT policies
      const dropPolicies = [
        `DROP POLICY IF EXISTS "Anyone can view ${table}" ON ${table}`,
        `DROP POLICY IF EXISTS "${table.charAt(0).toUpperCase() + table.slice(1)} are viewable" ON ${table}`,
        `DROP POLICY IF EXISTS "Public can read ${table}" ON ${table}`,
      ]

      for (const dropSql of dropPolicies) {
        const { error: dropError } = await supabase.rpc('exec_sql_admin', {
          sql: dropSql,
        })
        // Ignore errors on DROP (policy might not exist)
      }

      // Create new public SELECT policy
      const createPolicy = `
        CREATE POLICY "Public can read ${table}"
          ON ${table}
          FOR SELECT
          TO public
          USING (true);
      `

      const { error: createError } = await supabase.rpc('exec_sql_admin', {
        sql: createPolicy,
      })

      if (createError) {
        console.log(`   ⚠️  Could not create policy via RPC, trying direct SQL...`)

        // Try using a raw query instead
        // Note: This might not work either depending on Supabase configuration
        console.log(`   ⚠️  Cannot apply via JS client. Please use Supabase Dashboard SQL Editor.`)
        errorCount++
      } else {
        console.log(`   ✅ Policy created successfully`)
        successCount++
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
      errorCount++
    }

    console.log()
  }

  console.log('\n' + '='.repeat(60))
  console.log(`Summary: ${successCount} succeeded, ${errorCount} failed`)
  console.log('='.repeat(60))

  if (errorCount > 0) {
    console.log('\n⚠️  Some policies could not be applied via script.')
    console.log('Please apply the migration manually via Supabase Dashboard:')
    console.log('1. Go to: https://supabase.com/dashboard/project/diopilmkehygiqpizvga/sql/new')
    console.log(
      '2. Copy the SQL from: supabase/migrations/20251113091025_fix_tournaments_rls_select.sql'
    )
    console.log('3. Execute the SQL in the SQL Editor')
  }
}

applyRLSFix().catch(console.error)
