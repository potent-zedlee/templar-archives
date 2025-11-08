import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let serviceClient: ReturnType<typeof createClient<Database>> | null = null

/**
 * Supabase Service Role Client
 *
 * 백엔드 배치 작업/서버 액션에서 RLS 없이 DB 작업을 수행할 때 사용.
 * (서비스 롤 키는 서버 환경에서만 접근 가능)
 */
export function getServiceSupabaseClient() {
  if (serviceClient) {
    return serviceClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role credentials are not configured')
  }

  serviceClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return serviceClient
}

