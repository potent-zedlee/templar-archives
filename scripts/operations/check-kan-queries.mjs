import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
  console.log('🔍 Checking Supabase tables and queries...\n')

  // 1. Check videos table
  console.log('1. Checking videos table...')
  const { data: videos, error: videosError } = await supabase.from('videos').select('*').limit(1)
  if (videosError) {
    console.log('❌ videos table ERROR:', videosError.message)
    console.log('   Details:', videosError)
  } else {
    console.log('✅ videos table EXISTS')
  }

  // 2. Check analysis_jobs table
  console.log('\n2. Checking analysis_jobs table...')
  const { data: jobs, error: jobsError } = await supabase
    .from('analysis_jobs')
    .select('*')
    .limit(1)

  if (jobsError) {
    console.log('❌ analysis_jobs table ERROR:', jobsError.message)
  } else {
    console.log('✅ analysis_jobs table EXISTS')
    if (jobs && jobs.length > 0) {
      console.log('   Sample row keys:', Object.keys(jobs[0]))
    }
  }

  // 3. Try the join query (as in useActiveJobs - updated without creator)
  console.log('\n3. Testing useActiveJobs query (updated)...')
  const { data: joinData, error: joinError } = await supabase
    .from('analysis_jobs')
    .select(`
      *,
      video:videos(id, url, youtube_id, title),
      stream:streams(id, name, sub_event_id)
    `)
    .in('status', ['pending', 'processing'])
    .limit(1)

  if (joinError) {
    console.log('❌ Join query ERROR:', joinError.message)
    console.log('   Code:', joinError.code)
    console.log('   Details:', joinError.details)
    console.log('   Hint:', joinError.hint)
  } else {
    console.log('✅ Join query SUCCESS')
    if (joinData && joinData.length > 0) {
      console.log('   Sample result keys:', Object.keys(joinData[0]))
    } else {
      console.log('   No active jobs found')
    }
  }

  // 4. Check table relationships
  console.log('\n4. Checking table relationships...')
  const { data: jobsWithRelations, error: relError} = await supabase
    .from('analysis_jobs')
    .select('id, video_id, stream_id, created_by')
    .limit(1)

  if (relError) {
    console.log('❌ Relation check ERROR:', relError.message)
  } else {
    console.log('✅ Relation columns exist')
    if (jobsWithRelations && jobsWithRelations.length > 0) {
      console.log('   Sample:', jobsWithRelations[0])
    }
  }
}

main().catch(console.error)
