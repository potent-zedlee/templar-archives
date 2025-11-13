/**
 * HAE Active Jobs Page
 * Monitor active HAE analysis jobs in real-time
 */

import { Activity } from 'lucide-react'
import { ActiveJobsMonitor } from '../_components/ActiveJobsMonitor'

export const metadata = {
  title: 'HAE 진행 중 작업 | Templar Archives',
  description: '실시간으로 HAE 분석 작업의 진행 상황을 모니터링합니다',
}

export default function ActiveJobsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">진행 중 작업</h1>
        </div>
        <p className="text-muted-foreground">
          실시간으로 HAE 분석 작업의 진행 상황을 확인할 수 있습니다
        </p>
      </div>

      <ActiveJobsMonitor />
    </div>
  )
}
