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
