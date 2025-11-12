import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Proxy for activity tracking
 * - Tracks user's last activity on the site
 * - Updates every 5 minutes to reduce DB load
 * - Uses cookie to track last update time
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Check last activity update time from cookie
    const lastActivityUpdate = request.cookies.get('last_activity_update')?.value
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds

    // Update activity if:
    // 1. No cookie exists (first visit)
    // 2. More than 5 minutes have passed since last update
    if (!lastActivityUpdate || (now - parseInt(lastActivityUpdate)) > fiveMinutes) {
      try {
        // Update last_activity_at in database
        await supabase
          .from('users')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', user.id)

        // Update cookie with current timestamp
        response.cookies.set('last_activity_update', now.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      } catch (error) {
        console.error('Error updating last_activity_at:', error)
      }
    }
  }

  return response
}

// Configure proxy to run on all routes except static files and API routes that don't need tracking
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes (we only track page visits)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
