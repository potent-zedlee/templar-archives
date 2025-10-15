import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function grantAdmin(email: string) {
  console.log(`Granting admin role to ${email}...`)

  const { data, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('email', email)
    .select()

  if (error) {
    console.error('Error granting admin role:', error)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.error(`User with email ${email} not found`)
    process.exit(1)
  }

  console.log('✓ Admin role granted successfully!')
  console.log('User:', data[0])
}

const email = process.argv[2] || 'jhng.mov@gmail.com'
grantAdmin(email)
