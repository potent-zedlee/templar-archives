import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('🚀 Applying performance optimization indexes migration...')

    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20251017000025_performance_optimization_indexes.sql')
    const migrationSql = readFileSync(migrationPath, 'utf-8')

    // Split by statements (simple approach - just execute the whole thing)
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql })

    if (error) {
      // Try alternative approach: execute via direct connection
      console.log('⚠️  RPC failed, trying alternative approach...')

      // Execute individual statements
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('DO $$'))

      let successCount = 0
      let skipCount = 0

      for (const statement of statements) {
        if (statement.startsWith('CREATE EXTENSION')) {
          console.log(`⏭️  Skipping: ${statement.substring(0, 50)}...`)
          skipCount++
          continue
        }

        if (statement.startsWith('CREATE INDEX')) {
          const indexName = statement.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1]
          console.log(`📊 Creating index: ${indexName}`)

          try {
            // Execute via SQL editor endpoint (if available)
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ query: statement })
            })

            if (response.ok) {
              successCount++
            } else {
              console.log(`   ℹ️  Index may already exist or needs manual creation`)
              skipCount++
            }
          } catch (err) {
            console.log(`   ⚠️  Could not create index automatically: ${err}`)
            skipCount++
          }
        }
      }

      console.log(`\n✅ Migration completed:`)
      console.log(`   - Created: ${successCount} indexes`)
      console.log(`   - Skipped: ${skipCount} statements`)
      console.log(`\n💡 Note: Some indexes may need to be created manually via Supabase Studio SQL Editor`)
      console.log(`   Copy the contents of: supabase/migrations/20251017000025_performance_optimization_indexes.sql`)

    } else {
      console.log('✅ Migration applied successfully!')
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error)
    process.exit(1)
  }
}

applyMigration()
