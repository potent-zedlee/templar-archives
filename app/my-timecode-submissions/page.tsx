/**
 * My Timecode Submissions Page
 *
 * 사용자가 제출한 타임코드 내역 조회 페이지
 */

'use client'

import { useState } from 'react'
import { useMyTimecodeSubmissionsQuery } from '@/lib/queries/timecode-queries'
import { getStatusLabel, getStatusBadgeColor } from '@/lib/timecode-submissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Video, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

type StatusFilter = 'all' | 'pending' | 'approved' | 'ai_processing' | 'review' | 'completed' | 'rejected'

export default function MyTimecodeSubmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // 상태별 필터를 전달하여 제출 내역 조회
  const filters = statusFilter === 'all' ? {} : { status: statusFilter }
  const { data: submissions, isLoading, error } = useMyTimecodeSubmissionsQuery(filters)

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-title-lg mb-2">데이터를 불러올 수 없습니다</h2>
          <p className="text-body text-muted-foreground">
            {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 헤더 */}
      <div className="space-y-2">
        <h1 className="text-headline font-bold">내 타임코드 제출 내역</h1>
        <p className="text-body text-muted-foreground">
          제출한 핸드 타임코드의 처리 상태를 확인할 수 있습니다.
        </p>
      </div>

      {/* 상태 필터 탭 */}
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="pending">
            승인 대기
            {submissions && submissions.filter((s) => s.status === 'pending').length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {submissions.filter((s) => s.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">승인됨</TabsTrigger>
          <TabsTrigger value="ai_processing">AI 처리 중</TabsTrigger>
          <TabsTrigger value="review">검수 대기</TabsTrigger>
          <TabsTrigger value="completed">완료</TabsTrigger>
          <TabsTrigger value="rejected">거부됨</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 제출 내역 테이블 */}
      {submissions && submissions.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>영상</TableHead>
                <TableHead>타임코드</TableHead>
                <TableHead>핸드 정보</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>제출 시간</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  {/* 영상 */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate max-w-xs">
                        {submission.stream?.name || '알 수 없음'}
                      </span>
                    </div>
                  </TableCell>

                  {/* 타임코드 */}
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">{submission.start_time}</span>
                      {submission.end_time && (
                        <>
                          <span className="text-muted-foreground">~</span>
                          <span className="font-mono">{submission.end_time}</span>
                        </>
                      )}
                    </div>
                  </TableCell>

                  {/* 핸드 정보 */}
                  <TableCell>
                    <div className="space-y-1">
                      {submission.hand_number && (
                        <div className="text-sm font-medium">{submission.hand_number}</div>
                      )}
                      {submission.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                          {submission.description}
                        </div>
                      )}
                      {!submission.hand_number && !submission.description && (
                        <span className="text-xs text-muted-foreground">정보 없음</span>
                      )}
                    </div>
                  </TableCell>

                  {/* 상태 */}
                  <TableCell>
                    <Badge variant={getStatusBadgeColor(submission.status)}>
                      {getStatusLabel(submission.status)}
                    </Badge>
                    {submission.status === 'rejected' && submission.admin_comment && (
                      <div className="mt-1 text-xs text-destructive line-clamp-2 max-w-xs">
                        {submission.admin_comment}
                      </div>
                    )}
                  </TableCell>

                  {/* 제출 시간 */}
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(submission.created_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </div>
                  </TableCell>

                  {/* 액션 */}
                  <TableCell className="text-right">
                    {submission.status === 'completed' && submission.final_hand_id && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/hands/${submission.final_hand_id}`} target="_blank" rel="noopener noreferrer">
                          핸드 보기
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        // Empty state
        <Card className="p-12 text-center">
          <div className="mx-auto w-fit mb-4">
            {statusFilter === 'all' ? (
              <Clock className="h-12 w-12 text-muted-foreground" />
            ) : statusFilter === 'pending' ? (
              <Loader2 className="h-12 w-12 text-muted-foreground" />
            ) : statusFilter === 'completed' ? (
              <CheckCircle2 className="h-12 w-12 text-muted-foreground" />
            ) : statusFilter === 'rejected' ? (
              <XCircle className="h-12 w-12 text-muted-foreground" />
            ) : (
              <Clock className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-title-lg mb-2">제출 내역이 없습니다</h3>
          <p className="text-body text-muted-foreground mb-4">
            {statusFilter === 'all'
              ? '아직 제출한 타임코드가 없습니다.'
              : `${getStatusLabel(statusFilter as any)} 상태의 제출 내역이 없습니다.`}
          </p>
          <p className="text-sm text-muted-foreground">
            영상을 보면서 핸드가 시작되는 타임코드를 입력해주세요.
          </p>
        </Card>
      )}
    </div>
  )
}
