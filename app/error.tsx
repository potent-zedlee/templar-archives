'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 에러 로깅
    console.error('전역 에러 발생:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <h1 className="text-title-lg mb-4">
          문제가 발생했습니다
        </h1>

        <p className="text-body text-muted-foreground mb-6">
          예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>

        {error.message && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <p className="text-caption text-muted-foreground font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={reset}
            variant="default"
            className="flex-1"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            다시 시도
          </Button>

          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              홈으로
            </Button>
          </Link>
        </div>

        {error.digest && (
          <p className="text-caption text-muted-foreground mt-6">
            에러 코드: {error.digest}
          </p>
        )}
      </Card>
    </div>
  )
}
