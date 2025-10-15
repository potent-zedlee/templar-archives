import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Components용 Supabase 클라이언트
 * - 브라우저 환경에서만 사용
 * - useState, useEffect 등과 함께 사용
 * - 쿠키 자동 관리
 */
export function createClientSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
