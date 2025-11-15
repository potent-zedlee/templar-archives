import type { SupabaseClient } from '@supabase/supabase-js'

// Admin email list
const ADMIN_EMAILS = [
  'jhng.mov@gmail.com',
  'zed.lee@ggproduction.net'
]

/**
 * Check if the given email is an admin
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Check if the user has High Templar role or higher
 * (high_templar, reporter, admin)
 */
export async function isHighTemplar(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!user) return false

    const highRoles = ['high_templar', 'reporter', 'admin']
    return highRoles.includes(user.role)
  } catch (error) {
    console.error('Error checking High Templar status:', error)
    return false
  }
}

/**
 * Check if the user has Arbiter role or higher
 * (arbiter, high_templar, reporter, admin)
 */
export async function isArbiter(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('role, banned_at')
      .eq('id', userId)
      .single()

    if (!user) return false
    if (user.banned_at) return false // 차단된 사용자 제외

    const arbiterRoles = ['arbiter', 'high_templar', 'reporter', 'admin']
    return arbiterRoles.includes(user.role)
  } catch (error) {
    console.error('Error checking Arbiter status:', error)
    return false
  }
}

/**
 * Verify user is Arbiter or higher (throws error if not)
 */
export async function verifyArbiter(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const isValid = await isArbiter(supabase, userId)
  if (!isValid) {
    throw new Error('Insufficient permissions: Arbiter role required')
  }
}

