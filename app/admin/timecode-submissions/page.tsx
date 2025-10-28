/**
 * Admin Timecode Submissions Page
 *
 * 관리자가 모든 타임코드 제출 내역을 조회하고 승인/거부/AI 추출을 관리
 */

'use client'

import { useState } from 'react'
import {
  useAllTimecodeSubmissionsQuery,
  useSubmissionStatsQuery,
  useApproveTimecodeMutation,
} from '@/lib/queries/timecode-queries'
import { getStatusLabel, getStatusBadgeColor, type TimecodeSubmission } from '@/lib/timecode-submissions'
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
import { TimecodeReviewDialog } from '@/components/admin/timecode-review-dialog'
import { OcrSetupDialog } from '@/components/admin/ocr-setup-dialog'
import { ExtractionProgressDialog } from '@/components/admin/extraction-progress-dialog'
import { BatchStatusDialog } from '@/components/admin/batch-status-dialog'
import {
  Clock,
  Video,
  AlertCircle,
  CheckCircle2,
  Play,
  Loader2,
  TrendingUp,
  Users,
  FileCheck,
  Settings,
  Eye,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'

type StatusFilter = 'all' | 'pending' | 'approved' | 'ai_processing' | 'review' | 'completed' | 'rejected'

export default function AdminTimecodeSubmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<TimecodeSubmission | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [ocrSetupDialogOpen, setOcrSetupDialogOpen] = useState(false)
  const [extractionProgressDialogOpen, setExtractionProgressDialogOpen] = useState(false)
  const [batchStatusDialogOpen, setBatchStatusDialogOpen] = useState(false)
  const [processingSubmissionId, setProcessingSubmissionId] = useState<string | null>(null)

  // 데이터 조회
  const filters = statusFilter === 'all' ? {} : { status: statusFilter }
  const { data: submissions, isLoading, refetch } = useAllTimecodeSubmissionsQuery(filters)
  const { data: stats } = useSubmissionStatsQuery()

  // Mutations
  const approveMutation = useApproveTimecodeMutation()

  // 승인 처리 (pending → approved)
  const handleApprove = async (submissionId: string) => {
    if (!confirm('이 타임코드를 승인하시겠습니까?')) {
      return
    }

    try {
      await approveMutation.mutateAsync(submissionId)
      refetch()
    } catch (error) {
      // Error는 mutation에서 처리
    }
  }

  // AI 추출 시작 (approved → ai_processing)
  const handleStartAIExtraction = (submission: TimecodeSubmission) => {
    if (!submission.ocr_regions) {
      toast.error('먼저 OCR 영역을 설정해주세요')
      return
    }

    if (!confirm('AI 핸드 추출을 시작하시겠습니까?')) {
      return
    }

    setSelectedSubmission(submission)
    setProcessingSubmissionId(submission.id)
    setExtractionProgressDialogOpen(true)
  }

  // AI 추출 완료 콜백
  const handleExtractionComplete = (result: any) => {
    toast.success('핸드 추출이 완료되었습니다!')
    refetch()
    setProcessingSubmissionId(null)
  }

  // AI 추출 에러 콜백
  const handleExtractionError = (error: string) => {
    toast.error(`추출 실패: ${error}`)
    refetch()
    setProcessingSubmissionId(null)
  }

  // Batch 상태 확인
  const handleCheckBatchStatus = (submission: TimecodeSubmission) => {
    setSelectedSubmission(submission)
    setBatchStatusDialogOpen(true)
  }

  // Batch 다운로드 완료 콜백
  const handleBatchDownloadComplete = () => {
    toast.success('Batch 결과가 다운로드되었습니다!')
    refetch()
  }

  // 검수 다이얼로그 열기 (review)
  const handleOpenReview = (submission: TimecodeSubmission) => {
    setSelectedSubmission(submission)
    setReviewDialogOpen(true)
  }

  // OCR 설정 다이얼로그 열기
  const handleOpenOcrSetup = (submission: TimecodeSubmission) => {
    setSelectedSubmission(submission)
    setOcrSetupDialogOpen(true)
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 헤더 */}
      <div className="space-y-2">
        <h1 className="text-headline font-bold">타임코드 제출 관리</h1>
        <p className="text-body text-muted-foreground">
          사용자가 제출한 타임코드를 승인하고 AI 핸드 추출을 관리합니다.
        </p>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">전체</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">승인 대기</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">검수 대기</p>
                <p className="text-2xl font-bold text-blue-600">{stats.review}</p>
              </div>
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">완료</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </div>
      )}

      {/* 상태 필터 탭 */}
      <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="pending">
            승인 대기
            {stats && stats.pending > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">승인됨</TabsTrigger>
          <TabsTrigger value="ai_processing">AI 처리 중</TabsTrigger>
          <TabsTrigger value="review">
            검수 대기
            {stats && stats.review > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.review}
              </Badge>
            )}
          </TabsTrigger>
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
                <TableHead>제출자</TableHead>
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
                  {/* 제출자 */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{submission.submitter_name}</span>
                    </div>
                  </TableCell>

                  {/* 영상 */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate max-w-xs">
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
                    {submission.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(submission.id)}
                        disabled={approveMutation.isPending}
                      >
                        승인
                      </Button>
                    )}

                    {submission.status === 'approved' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenOcrSetup(submission)}
                          disabled={processingSubmissionId === submission.id}
                        >
                          {submission.ocr_regions ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                              OCR 영역 수정
                            </>
                          ) : (
                            <>
                              <Settings className="mr-2 h-4 w-4" />
                              OCR 영역 설정
                            </>
                          )}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStartAIExtraction(submission)}
                          disabled={processingSubmissionId === submission.id || !submission.ocr_regions}
                        >
                          {processingSubmissionId === submission.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              처리 중...
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              AI 추출 시작
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {submission.status === 'ai_processing' && submission.ai_extracted_data?.vision_batch_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCheckBatchStatus(submission)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Batch 상태 확인
                      </Button>
                    )}

                    {submission.status === 'review' && (
                      <Button variant="default" size="sm" onClick={() => handleOpenReview(submission)}>
                        검수하기
                      </Button>
                    )}

                    {submission.status === 'completed' && submission.final_hand_id && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/hands/${submission.final_hand_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
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
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-title-lg mb-2">제출 내역이 없습니다</h3>
          <p className="text-body text-muted-foreground">
            {statusFilter === 'all'
              ? '아직 제출된 타임코드가 없습니다.'
              : `${getStatusLabel(statusFilter as any)} 상태의 제출 내역이 없습니다.`}
          </p>
        </Card>
      )}

      {/* 검수 다이얼로그 */}
      <TimecodeReviewDialog
        isOpen={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        submission={selectedSubmission}
        onSuccess={() => {
          refetch()
          setSelectedSubmission(null)
        }}
      />

      {/* OCR 설정 다이얼로그 */}
      {selectedSubmission && selectedSubmission.stream?.video_url && (
        <OcrSetupDialog
          open={ocrSetupDialogOpen}
          onOpenChange={setOcrSetupDialogOpen}
          submissionId={selectedSubmission.id}
          videoUrl={selectedSubmission.stream.video_url}
          initialRegions={selectedSubmission.ocr_regions}
          onSuccess={() => {
            refetch()
            setSelectedSubmission(null)
          }}
        />
      )}

      {/* 추출 진행 상황 다이얼로그 */}
      {processingSubmissionId && (
        <ExtractionProgressDialog
          submissionId={processingSubmissionId}
          open={extractionProgressDialogOpen}
          onOpenChange={setExtractionProgressDialogOpen}
          onComplete={handleExtractionComplete}
          onError={handleExtractionError}
        />
      )}

      {/* Batch 상태 다이얼로그 */}
      {selectedSubmission && (
        <BatchStatusDialog
          submissionId={selectedSubmission.id}
          batchId={selectedSubmission.ai_extracted_data?.vision_batch_id || null}
          open={batchStatusDialogOpen}
          onOpenChange={setBatchStatusDialogOpen}
          onDownloadComplete={handleBatchDownloadComplete}
        />
      )}
    </div>
  )
}
