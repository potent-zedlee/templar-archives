#!/usr/bin/env node
import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Supabase connection string format:
// postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const connectionString = `postgresql://postgres.bbncbglljzxkvacuoxwz:IcT3zSeCeJ1PTDMr@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

const sql = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '20251115000004_fix_rpc_sequence_field.sql'), 'utf-8')

// Update the SQL to use action_order instead of sequence
const updatedSql = sql.replace(
  "(v_action->>'sequence')::INTEGER,  -- Fixed: use sequence field",
  "(v_action->>'action_order')::INTEGER,  -- Read action_order, write to sequence"
)

console.log('🔧 Updating RPC function via PostgreSQL client...\n')

const client = new pg.Client({ connectionString })

try {
  await client.connect()
  console.log('✅ Connected to database')

  await client.query(updatedSql)
  console.log('✅ RPC function updated successfully!')

  console.log('\n📝 Now you can run: node scripts/generate-dummy-hands.mjs')

} catch (err) {
  console.error('❌ Error:', err.message)
  console.log('\n💡 Alternative: Use Supabase Dashboard SQL Editor')
  console.log('   https://supabase.com/dashboard/project/diopilmkehygiqpizvga/sql/new')
  process.exit(1)
} finally {
  await client.end()
}
