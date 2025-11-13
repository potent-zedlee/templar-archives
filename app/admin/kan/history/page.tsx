/**
 * KAN Analysis History Page
 * View completed and failed analysis jobs
 */

import { History } from 'lucide-react'
import { HistoryJobsList } from '../_components/HistoryJobsList'

export const metadata = {
  title: 'KAN 분석 기록 | Templar Archives',
  description: '완료되거나 실패한 KAN 분석 작업의 기록을 확인합니다',
}

export default function HistoryPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <History className="h-8 w-8 text-gray-500" />
          <h1 className="text-3xl font-bold">분석 기록</h1>
        </div>
        <p className="text-muted-foreground">
          완료되거나 실패한 KAN 분석 작업의 기록을 확인할 수 있습니다
        </p>
      </div>

      <HistoryJobsList />
    </div>
  )
}
