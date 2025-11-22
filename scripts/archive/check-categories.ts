import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCategories() {
  const { data, error } = await supabase
    .from('tournament_categories')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Tournament Categories:')
  console.log(JSON.stringify(data, null, 2))
}

checkCategories().then(() => process.exit(0))
