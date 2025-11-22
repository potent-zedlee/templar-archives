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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
})

// Get table schema
const { data, error } = await supabase
  .from('hand_actions')
  .select('*')
  .limit(1)

if (error) {
  console.log('Error:', error)
} else {
  console.log('Sample row:', data)
  if (data.length > 0) {
    console.log('\nColumns:', Object.keys(data[0]))
  } else {
    console.log('No rows found')
  }
}
