import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Service role for update permissions
)

async function main() {
  console.log('🔍 Finding all STUCK jobs...\n')

  // Find all jobs that have been processing for more than 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  const { data: stuckJobs, error: fetchError } = await supabase
    .from('analysis_jobs')
    .select('id, status, started_at, created_at, progress')
    .eq('status', 'processing')
    .lt('started_at', tenMinutesAgo)

  if (fetchError) {
    console.error('❌ Error fetching stuck jobs:', fetchError.message)
    return
  }

  if (!stuckJobs || stuckJobs.length === 0) {
    console.log('✅ No stuck jobs found')
    return
  }

  console.log(`⚠️  Found ${stuckJobs.length} stuck jobs:\n`)

  stuckJobs.forEach((job, idx) => {
    const elapsed = Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000)
    console.log(`  ${idx + 1}. ${job.id}`)
    console.log(`     Progress: ${job.progress}%`)
    console.log(`     Elapsed: ${elapsed}s\n`)
  })

  console.log('🔄 Cleaning up stuck jobs...\n')

  const { error: updateError } = await supabase
    .from('analysis_jobs')
    .update({
      status: 'failed',
      error_message: 'Job stuck in processing state for more than 10 minutes (auto-cleanup)',
      completed_at: new Date().toISOString(),
    })
    .eq('status', 'processing')
    .lt('started_at', tenMinutesAgo)

  if (updateError) {
    console.error('❌ Error updating stuck jobs:', updateError.message)
    return
  }

  console.log(`✅ Successfully cleaned up ${stuckJobs.length} stuck jobs`)
}

main().catch(console.error)
