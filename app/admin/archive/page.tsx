'use client'

/**
 * Admin Archive Page (Redesigned)
 *
 * 통합 Archive 대시보드
 * - 파이프라인 상태별 필터링
 * - Tree/Flat 뷰 전환
 * - 실시간 분석 모니터링
 *
 * @see /Users/zed/.claude/plans/sleepy-yawning-lovelace.md
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { isAdmin } from '@/lib/auth-utils'
import { ArchiveDashboard } from '@/components/admin/archive/ArchiveDashboard'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminArchivePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        toast.error('Please sign in')
        router.push('/auth/login')
        return
      }

      const adminCheck = isAdmin(user.email)
      if (!adminCheck) {
        toast.error('Admin access required')
        router.push('/')
        return
      }

      setIsAuthorized(true)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ArchiveDashboard />
    </div>
  )
}
