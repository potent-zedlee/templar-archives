import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env.local', 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.+)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

// Check hands table schema by selecting everything with limit 1
const { data, error } = await supabase
  .from('hands')
  .select('*')
  .limit(1)

console.log('\n=== hands 테이블 구조 ===')
if (error) {
  console.error('Error:', error)
} else if (data && data.length > 0) {
  console.log('Columns:', Object.keys(data[0]))
} else {
  console.log('No data in hands table')
  // Try to get columns from a failed query
  const { error: schemaError } = await supabase
    .from('hands')
    .select('id, created_at, updated_at')
    .limit(0)
  
  if (!schemaError) {
    console.log('Basic columns exist: id, created_at, updated_at')
  }
}
