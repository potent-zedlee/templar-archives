/**
 * KAN New Analysis Request Page
 * Admin page for creating new KAN analysis requests
 */

import { Suspense } from 'react'
import { Sparkles } from 'lucide-react'
import { AnalysisRequestForm } from '../_components/AnalysisRequestForm'

export const metadata = {
  title: 'KAN 새 분석 요청 | Templar Archives',
  description: 'AI를 사용하여 포커 영상을 분석하고 핸드 히스토리를 추출합니다',
}

export default function NewAnalysisPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          <h1 className="text-3xl font-bold">새 KAN 분석 요청</h1>
        </div>
        <p className="text-muted-foreground">
          YouTube 영상을 AI로 분석하여 핸드 히스토리를 자동으로 추출합니다
        </p>
      </div>

      <Suspense fallback={<div>로딩 중...</div>}>
        <AnalysisRequestForm />
      </Suspense>
    </div>
  )
}
