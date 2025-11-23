"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/components/layout/AuthProvider"
import { isReporterOrAdmin } from "@/lib/admin"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { Loader2 } from "lucide-react"

/**
 * Admin Layout
 *
 * 모든 /admin/* 및 /reporter/* 페이지에 공통으로 적용되는 레이아웃
 * - AdminSidebar + AdminHeader 통합
 * - 권한 체크:
 *   - 비로그인: /auth/login?redirect=/admin/dashboard
 *   - user 역할: / (홈)
 *   - admin/high_templar/reporter: 접근 허용
 * - 로딩 상태 처리
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      // 인증 로딩 중이면 대기
      if (authLoading) {
        return
      }

      // 비로그인: 로그인 페이지로 리다이렉트
      if (!user) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(pathname || '/admin/dashboard')}`)
        return
      }

      // 권한 확인
      const hasAccess = await isReporterOrAdmin(user.id)

      if (!hasAccess) {
        // 권한 없음: 홈으로 리다이렉트
        router.replace('/')
        return
      }

      // 권한 확인 완료
      setAuthorized(true)
      setChecking(false)
    }

    checkAccess()
  }, [user, profile, authLoading, router, pathname])

  // 로딩 중
  if (authLoading || checking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 권한 없음 (리다이렉트 중)
  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 권한 확인 완료: Admin Layout 렌더링
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
