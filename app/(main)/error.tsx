'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('HomePage Error:', error)
  }, [error])

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-50">
            페이지 로딩 실패
          </h1>
          <p className="text-gray-400">
            일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gold-400 text-gray-900 font-semibold rounded-lg hover:bg-gold-500 transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-800 text-gray-50 font-semibold rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
          >
            홈으로 이동
          </Link>
        </div>

        {error.digest && (
          <p className="text-sm text-gray-600 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </main>
  )
}
