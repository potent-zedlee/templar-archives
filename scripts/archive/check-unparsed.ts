import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUnparsed() {
  const { data: videos } = await supabase
    .from('streams')
    .select('name')
    .is('sub_event_id', null)
    .eq('is_organized', false)
    .order('name')
    .limit(50)

  console.log('First 50 unparsed videos:')
  videos?.forEach((v, i) => {
    console.log(`${i + 1}. ${v.name}`)
  })
}

checkUnparsed().then(() => process.exit(0))
