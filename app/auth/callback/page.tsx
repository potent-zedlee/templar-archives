"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // URL에서 인증 코드를 추출하여 세션 교환
    const handleCallback = async () => {
      const supabase = createClientSupabaseClient()
      try {
        // Supabase는 자동으로 URL의 해시에서 토큰을 읽고 세션을 Settings함
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error("인증 콜백 오류:", error)
          setError("Login 중 오류가 발생했습니다.")
          // 3초 후 Login 페이지로 리디렉션
          setTimeout(() => {
            router.push("/auth/login")
          }, 3000)
          return
        }

        if (session) {
          // Login 성공 - 홈으로 리디렉션
          router.push("/")
        } else {
          // 세션이 없으면 Login 페이지로
          router.push("/auth/login")
        }
      } catch (err) {
        console.error("예상치 못한 오류:", err)
        setError("Login 중 오류가 발생했습니다.")
        setTimeout(() => {
          router.push("/auth/login")
        }, 3000)
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="text-destructive text-body-lg">{error}</div>
        <p className="text-caption text-muted-foreground">잠시 후 Login 페이지로 이동합니다...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-caption text-muted-foreground">Login 처리 중...</p>
    </div>
  )
}
