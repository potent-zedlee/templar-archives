"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { getUser, onAuthStateChange, type AuthUser } from '@/lib/auth'
import { getCurrentUserProfile } from '@/lib/user-profile'
import { NicknameSetupModal } from '@/components/nickname-setup-modal'
import type { UserProfile } from '@/lib/user-profile'

type AuthContextType = {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNicknameModal, setShowNicknameModal] = useState(false)

  const loadProfile = async (currentUser: AuthUser) => {
    const userProfile = await getCurrentUserProfile()
    setProfile(userProfile)

    // Profile이 있고 임시 닉네임 형식이면 모달 표시
    if (userProfile) {
      // 임시 닉네임 형식: 아무 문자 + 6자리 숫자 (예: user123456, User123456, abc123456)
      const isTempNickname = /\d{6}$/.test(userProfile.nickname)
      setShowNicknameModal(isTempNickname)
    }
  }

  useEffect(() => {
    // 초기 사용자 조회
    getUser().then((user) => {
      setUser(user)
      if (user) {
        loadProfile(user)
      }
      setLoading(false)
    })

    // 인증 상태 변경 감지
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user)
      if (user) {
        loadProfile(user)
      } else {
        setProfile(null)
        setShowNicknameModal(false)
      }
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleNicknameComplete = async () => {
    setShowNicknameModal(false)
    // Profile 다시 로드
    if (user) {
      await loadProfile(user)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
      {showNicknameModal && profile && (
        <NicknameSetupModal
          open={showNicknameModal}
          currentNickname={profile.nickname}
          onComplete={handleNicknameComplete}
        />
      )}
    </AuthContext.Provider>
  )
}

/**
 * 인증 상태를 가져오는 훅
 * @returns {AuthContextType} user - 현재 Login한 사용자, profile - 사용자 Profile, loading - 로딩 상태
 *
 * @example
 * const { user, profile, loading } = useAuth()
 *
 * if (loading) return <div>Loading...</div>
 * if (!user) return <div>Login이 필요합니다</div>
 *
 * return <div>{profile?.nickname}</div>
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내에서만 사용할 수 있습니다')
  }

  return context
}
