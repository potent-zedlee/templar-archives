'use client'

import { useTriggerJob, calculateProgress, getStatusText, getStatusColor } from '@/lib/hooks/use-trigger-job'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface TriggerJobMonitorProps {
  jobId: string | null | undefined
  onComplete?: (output: any) => void
  onError?: (error: string) => void
}

/**
 * Trigger.dev 작업 진행률 모니터링 컴포넌트
 *
 * 사용 예:
 * ```tsx
 * <TriggerJobMonitor
 *   jobId={jobId}
 *   onComplete={(output) => console.log('완료:', output)}
 *   onError={(error) => console.error('에러:', error)}
 * />
 * ```
 */
export function TriggerJobMonitor({ jobId, onComplete, onError }: TriggerJobMonitorProps) {
  const { data: job, isLoading, error } = useTriggerJob(jobId, {
    refetchInterval: 2000, // 2초마다 폴링
    enabled: !!jobId
  })

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 border rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-600">작업 상태 확인 중...</span>
      </div>
    )
  }

  // 에러
  if (error || !job) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>오류</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : '작업 상태를 불러올 수 없습니다'}
        </AlertDescription>
      </Alert>
    )
  }

  // 진행률 계산
  const progress = calculateProgress(job)
  const statusText = getStatusText(job.status)
  const statusColor = getStatusColor(job.status)

  // 완료 콜백
  if (job.status === 'SUCCESS' && onComplete && job.output) {
    onComplete(job.output)
  }

  // 에러 콜백
  if (job.status === 'FAILURE' && onError && job.error) {
    onError(job.error)
  }

  return (
    <div className="space-y-4">
      {/* 상태 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {job.status === 'PENDING' && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
          {job.status === 'EXECUTING' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          {job.status === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {job.status === 'FAILURE' && <XCircle className="w-4 h-4 text-red-500" />}
          <span className={`text-sm font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>
        <span className="text-sm text-gray-500">{progress}%</span>
      </div>

      {/* 진행률 바 */}
      <Progress value={progress} className="h-2" />

      {/* 작업 정보 */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>작업 ID: {job.id}</div>
        {job.startedAt && (
          <div>시작: {new Date(job.startedAt).toLocaleString('ko-KR')}</div>
        )}
        {job.completedAt && (
          <div>완료: {new Date(job.completedAt).toLocaleString('ko-KR')}</div>
        )}
      </div>

      {/* 성공 메시지 */}
      {job.status === 'SUCCESS' && job.output && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>분석 완료</AlertTitle>
          <AlertDescription>
            {job.output.handCount}개의 핸드가 추출되었습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 에러 메시지 */}
      {job.status === 'FAILURE' && job.error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>분석 실패</AlertTitle>
          <AlertDescription>{job.error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
