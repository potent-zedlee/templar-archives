import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local file
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

// Check analysis_jobs table
const { data: jobs, error: jobsError } = await supabase
  .from('analysis_jobs')
  .select('id, status, progress, hands_found, created_at, completed_at')
  .order('created_at', { ascending: false })
  .limit(10)

console.log('\n=== 최근 분석 작업 10개 ===')
if (jobsError) {
  console.error('Error:', jobsError)
} else {
  console.table(jobs.map(j => ({
    id: j.id.substring(0, 8),
    status: j.status,
    progress: j.progress,
    hands: j.hands_found,
    created: j.created_at?.substring(11, 19),
    completed: j.completed_at?.substring(11, 19) || 'N/A'
  })))
}

// Check hands table count
const { count, error: countError } = await supabase
  .from('hands')
  .select('*', { count: 'exact', head: true })

console.log('\n=== 전체 핸드 수 ===')
if (countError) {
  console.error('Error:', countError)
} else {
  console.log(`Total hands: ${count}`)
}

// Check recent hands
const { data: hands, error: handsError } = await supabase
  .from('hands')
  .select('id, number, pot_size, created_at')
  .order('created_at', { ascending: false })
  .limit(10)

console.log('\n=== 최근 핸드 10개 ===')
if (handsError) {
  console.error('Error:', handsError)
} else {
  console.table(hands.map(h => ({
    id: h.id.substring(0, 8),
    hand_num: h.number,
    pot: h.pot_size,
    created: h.created_at?.substring(11, 19)
  })))
}
