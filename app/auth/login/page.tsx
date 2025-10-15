"use client"

export const runtime = 'edge'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signInWithGoogle } from "@/lib/auth"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

export default function loginClient() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 이미 Login된 사용자는 홈으로 리디렉션
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
      // OAuth 리디렉션이 발생하므로 여기서 로딩 상태를 해제할 필요 없음
    } catch (err) {
      console.error("Login 실패:", err)
      setError("Login에 실패했습니다. 다시 시도해주세요.")
      setLoading(false)
    }
  }

  // 로딩 중이거나 이미 Login된 경우
  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
              <span className="font-mono text-2xl font-bold text-primary-foreground">GG</span>
            </div>
          </div>
          <CardTitle className="text-title-lg">GGVault에 오신 것을 환영합니다</CardTitle>
          <CardDescription>
            포커 핸드 Archive와 Community 플랫폼
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Login 중...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 Login
              </>
            )}
          </Button>

          {error && (
            <p className="text-caption text-destructive text-center">{error}</p>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Login하면 GGVault의{" "}
            <a href="#" className="underline hover:text-foreground">
              이용약관
            </a>
            과{" "}
            <a href="#" className="underline hover:text-foreground">
              개인정보처리방침
            </a>
            에 동의하는 것으로 간주됩니다.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
