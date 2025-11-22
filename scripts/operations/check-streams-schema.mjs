#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

// Get one stream to see its structure
const { data, error } = await supabase
  .from('streams')
  .select('*')
  .limit(1)
  .single()

if (error) {
  console.error('Error:', error)
} else {
  console.log('Sample stream record:')
  console.log(JSON.stringify(data, null, 2))
  console.log('\nColumns:', Object.keys(data))
}
