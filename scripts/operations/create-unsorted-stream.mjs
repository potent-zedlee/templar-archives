#!/usr/bin/env node
/**
 * Create "Unsorted Hands" stream for HAE analysis
 * This is a one-time setup script
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env.local file
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
})

async function createUnsortedStream() {
  console.log('Creating "Unsorted Hands" stream...\n')

  try {
    // Check if stream already exists
    const { data: existing } = await supabase
      .from('streams')
      .select('id, name, sub_event_id')
      .eq('name', 'Unsorted Hands')
      .single()

    if (existing) {
      console.log('✅ "Unsorted Hands" stream already exists!')
      console.log('Stream ID:', existing.id)
      console.log('Sub-event ID:', existing.sub_event_id)
      return
    }

    // Get any existing sub_event (we need one due to FK constraint)
    console.log('Looking for existing sub_events...')
    const { data: subEvents, error: subEventsError } = await supabase
      .from('sub_events')
      .select('id, name, tournament_id')
      .limit(10)

    if (subEventsError || !subEvents || subEvents.length === 0) {
      console.error('❌ No sub_events found in database')
      console.error('You must create at least one tournament and sub_event first')
      console.error('\nSteps:')
      console.error('1. Go to your Supabase dashboard')
      console.error('2. Create a tournament in the "tournaments" table')
      console.error('3. Create a sub_event linked to that tournament')
      console.error('4. Run this script again')
      process.exit(1)
    }

    console.log(`Found ${subEvents.length} sub_events:`)
    subEvents.forEach((se, idx) => {
      console.log(`  ${idx + 1}. ${se.name} (ID: ${se.id})`)
    })

    // Use the first sub_event
    const selectedSubEvent = subEvents[0]
    console.log(`\nUsing sub_event: ${selectedSubEvent.name} (${selectedSubEvent.id})`)

    // Create "Unsorted Hands" stream
    const { data: newStream, error: streamError } = await supabase
      .from('streams')
      .insert({
        sub_event_id: selectedSubEvent.id,
        name: 'Unsorted Hands',
        video_url: 'https://youtube.com/watch?v=unsorted',  // Placeholder URL
        video_source: 'youtube',
      })
      .select('id, name')
      .single()

    if (streamError) {
      console.error('❌ Failed to create stream:', streamError)
      process.exit(1)
    }

    console.log('\n✅ Successfully created "Unsorted Hands" stream!')
    console.log('Stream ID:', newStream.id)
    console.log('Name:', newStream.name)
    console.log('\nYou can now use HAE analysis without providing a streamId.')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

createUnsortedStream()
