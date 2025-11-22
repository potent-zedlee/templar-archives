import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
  const jobId = 'e5e2d2d5-990d-4c01-90e7-b67fe3ba4b32'

  console.log(`🔍 Checking job status: ${jobId}\n`)

  const { data: jobs, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', jobId)

  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  if (!jobs || jobs.length === 0) {
    console.log('❌ Job not found')
    return
  }

  const job = jobs[0]

  console.log('📊 Job Status:')
  console.log('━'.repeat(80))
  console.log(`Status: ${job.status}`)
  console.log(`Progress: ${job.progress}%`)
  console.log(`Hands Found: ${job.hands_found || 0}`)
  console.log(`Created: ${job.created_at}`)
  console.log(`Started: ${job.started_at || 'Not started'}`)
  console.log(`Completed: ${job.completed_at || 'Not completed'}`)

  if (job.error_message) {
    console.log(`\n❌ Error Message: ${job.error_message}`)
  }

  if (job.result) {
    console.log('\n📋 Result:')
    console.log(JSON.stringify(job.result, null, 2))
  }

  console.log('\n')
}

main().catch(console.error)
