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

