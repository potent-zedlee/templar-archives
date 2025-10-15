import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

export type AuthUser = User
export type AuthSession = Session

/**
 * Google OAuth로 로그인
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    console.error('Google 로그인 실패:', error)
    throw error
  }

  return data
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('로그아웃 실패:', error)
    throw error
  }
}

/**
 * 현재 로그인한 사용자 조회
 */
export async function getUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('사용자 조회 실패:', error)
    return null
  }

  return user
}

/**
 * 현재 세션 조회
 */
export async function getSession(): Promise<AuthSession | null> {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('세션 조회 실패:', error)
    return null
  }

  return session
}

/**
 * 인증 상태 변경 감지
 * @param callback 인증 상태가 변경될 때 호출될 콜백 함수
 * @returns 구독 해제 함수
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null, session: AuthSession | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null, session)
    }
  )

  return () => {
    subscription.unsubscribe()
  }
}
