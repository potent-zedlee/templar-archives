'use client'

/**
 * History Jobs List
 * List of completed and failed HAE analysis jobs
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { useHistoryJobs, useRetryJobMutation } from '@/lib/queries/hae-queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { formatTime } from '@/types/segments'

type StatusFilter = 'all' | 'completed' | 'failed'

export function HistoryJobsList() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())

  const { data, isLoading, error } = useHistoryJobs({
    page,
    limit: 20,
    status: statusFilter,
  })

  const retryMutation = useRetryJobMutation()

  const handleRetry = (jobId: string) => {
    retryMutation.mutate(jobId)
  }

  const toggleExpanded = (jobId: string) => {
    setExpandedJobs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-500/50">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <XCircle className="h-12 w-12 text-red-500" />
          <div className="text-center">
            <p className="font-medium text-red-600 dark:text-red-400">
              기록을 불러오는데 실패했습니다
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : '알 수 없는 오류'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const jobs = data?.jobs || []
  const hasMore = data?.hasMore || false

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium text-muted-foreground">분석 기록이 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              필터를 변경하거나 새로운 분석을 시작해보세요
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">상태:</span>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter)
              setPage(1) // Reset page
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
              <SelectItem value="failed">실패</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          총 {data?.total || 0}개 작업
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.map((job) => {
          const isExpanded = expandedJobs.has(job.id)
          const segmentResults = job.result?.segment_results || []
          const successCount = segmentResults.filter((s) => s.status === 'success').length
          const failedCount = segmentResults.filter((s) => s.status === 'failed').length

          return (
            <Collapsible key={job.id} open={isExpanded}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {job.status === 'completed' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {job.status === 'failed' && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <CardTitle className="text-lg">
                          {job.video?.title || 'YouTube 영상'}
                        </CardTitle>
                        {job.status === 'completed' && (
                          <Badge className="bg-green-500">완료</Badge>
                        )}
                        {job.status === 'failed' && (
                          <Badge variant="destructive">실패</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {job.stream && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {job.stream.name}
                          </span>
                        )}
                        {job.completed_at && (
                          <span>
                            {format(new Date(job.completed_at), 'yyyy-MM-dd HH:mm', {
                              locale: ko,
                            })}
                          </span>
                        )}
                        {job.creator && <span>요청자: {job.creator.email}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {job.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(job.id)}
                          disabled={retryMutation.isPending}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          재시도
                        </Button>
                      )}

                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(job.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">발견된 핸드</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {job.hands_found || 0}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">성공 세그먼트</div>
                      <div className="text-2xl font-bold">{successCount}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">실패 세그먼트</div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {failedCount}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">처리 시간</div>
                      <div className="text-2xl font-bold">
                        {job.processing_time ? formatTime(job.processing_time) : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {job.status === 'failed' && job.error_message && (
                    <Card className="bg-red-500/10 border-red-500/20">
                      <CardContent className="p-4">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          <span className="font-medium">오류: </span>
                          {job.error_message}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Expanded Details */}
                  <CollapsibleContent className="space-y-4">
                    {/* Segment Results */}
                    {segmentResults.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">세그먼트 처리 결과</div>
                        <ScrollArea className="max-h-[300px]">
                          <div className="space-y-2">
                            {segmentResults.map((segment, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                              >
                                {segment.status === 'success' && (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                )}
                                {segment.status === 'failed' && (
                                  <XCircle className="h-5 w-5 text-red-500" />
                                )}

                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      세그먼트 {idx + 1}
                                    </span>
                                    {segment.status === 'success' && (
                                      <Badge variant="default" className="text-xs bg-green-500">
                                        완료
                                      </Badge>
                                    )}
                                    {segment.status === 'failed' && (
                                      <Badge variant="destructive" className="text-xs">
                                        실패
                                      </Badge>
                                    )}
                                  </div>
                                  {segment.hands_found !== undefined && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {segment.hands_found}개 핸드 발견
                                    </p>
                                  )}
                                  {segment.error && (
                                    <p className="text-xs text-red-500 mt-1">
                                      {segment.error}
                                    </p>
                                  )}
                                </div>

                                {segment.processing_time && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(segment.processing_time)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Job Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Job ID:</span>
                        <span className="ml-2 font-mono">{job.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">플랫폼:</span>
                        <Badge variant="outline" className="ml-2">
                          {job.platform?.toUpperCase()}
                        </Badge>
                      </div>
                      {job.created_at && (
                        <div>
                          <span className="text-muted-foreground">생성 시간:</span>
                          <span className="ml-2">
                            {format(new Date(job.created_at), 'yyyy-MM-dd HH:mm', {
                              locale: ko,
                            })}
                          </span>
                        </div>
                      )}
                      {job.ai_provider && (
                        <div>
                          <span className="text-muted-foreground">AI 제공자:</span>
                          <Badge variant="outline" className="ml-2">
                            {job.ai_provider.toUpperCase()}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>

      {/* Pagination */}
      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setPage(page + 1)}>
            더 보기
          </Button>
        </div>
      )}
    </div>
  )
}
