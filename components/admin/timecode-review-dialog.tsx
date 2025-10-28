/**
 * Timecode Review Dialog
 *
 * 관리자가 AI 추출된 핸드 히스토리를 검수하고 승인/거부하는 다이얼로그
 */

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, CheckCircle2, XCircle, Loader2, Clock, Video } from 'lucide-react'
import { toast } from 'sonner'
import type { TimecodeSubmission } from '@/lib/timecode-submissions'

interface TimecodeReviewDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  submission: TimecodeSubmission | null
  onSuccess: () => void
}

export function TimecodeReviewDialog({
  isOpen,
  onOpenChange,
  submission,
  onSuccess,
}: TimecodeReviewDialogProps) {
  // 폼 상태
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [adminComment, setAdminComment] = useState('')

  // AI 추출 데이터를 폼 데이터로 변환
  const aiData = submission?.ai_extracted_data || {}

  // 다이얼로그가 열릴 때마다 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setAdminComment('')
    }
  }, [isOpen])

  // 승인 처리
  const handleApprove = async () => {
    if (!submission) return

    setIsSubmitting(true)

    try {
      // AI 추출 데이터를 그대로 사용 (간단한 버전)
      const response = await fetch('/api/timecodes/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submission.id,
          handData: {
            number: aiData.handNumber || submission.hand_number,
            description: aiData.description || submission.description,
            potSize: aiData.potSize || null,
            boardCards: aiData.boardCards || null,
            players: aiData.players || [],
            actions: aiData.actions || [],
          },
          adminComment: adminComment || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '검수 승인에 실패했습니다')
      }

      toast.success('핸드가 승인되어 Archive에 추가되었습니다')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Approve error:', error)
      toast.error(error instanceof Error ? error.message : '검수 승인에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 거부 처리
  const handleReject = async () => {
    if (!submission) return

    if (!adminComment.trim()) {
      toast.error('거부 사유를 입력해주세요')
      return
    }

    if (!confirm('이 핸드를 거부하시겠습니까?')) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/timecodes/review', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionId: submission.id,
          adminComment: adminComment,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '거부 처리에 실패했습니다')
      }

      toast.success('핸드가 거부되었습니다')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Reject error:', error)
      toast.error(error instanceof Error ? error.message : '거부 처리에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!submission) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>핸드 히스토리 검수</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* 제출 정보 */}
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{submission.stream?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{submission.start_time}</span>
                  {submission.end_time && (
                    <>
                      <span>~</span>
                      <span>{submission.end_time}</span>
                    </>
                  )}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">제출자:</span>{' '}
                  <span className="font-medium">{submission.submitter_name}</span>
                </div>
              </div>
            </Card>

            {/* AI 추출 데이터 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">AI 추출 데이터</h3>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">개요</TabsTrigger>
                  <TabsTrigger value="players">플레이어</TabsTrigger>
                  <TabsTrigger value="actions">액션</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">핸드 번호</Label>
                      <div className="text-sm font-medium">
                        {aiData.handNumber || submission.hand_number || '-'}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">팟 크기</Label>
                      <div className="text-sm font-medium">
                        {aiData.potSize ? `$${aiData.potSize.toLocaleString()}` : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">설명</Label>
                    <div className="text-sm">
                      {aiData.description || submission.description || '-'}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">보드 카드</Label>
                    <div className="text-sm font-mono">
                      {aiData.boardCards || '-'}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="players" className="mt-4">
                  {aiData.players && aiData.players.length > 0 ? (
                    <div className="space-y-2">
                      {aiData.players.map((player: any, idx: number) => (
                        <Card key={idx} className="p-3">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">이름:</span>{' '}
                              <span className="font-medium">{player.name}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">포지션:</span>{' '}
                              <Badge variant="outline">{player.position}</Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">스택:</span>{' '}
                              <span>${player.stackSize?.toLocaleString() || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">홀카드:</span>{' '}
                              <span className="font-mono">{player.holeCards || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">승자:</span>{' '}
                              {player.isWinner ? (
                                <CheckCircle2 className="inline h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="inline h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            {player.winAmount && (
                              <div>
                                <span className="text-muted-foreground">승리 금액:</span>{' '}
                                <span className="text-green-600 font-medium">
                                  ${player.winAmount.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      플레이어 정보가 없습니다
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="mt-4">
                  {aiData.actions && aiData.actions.length > 0 ? (
                    <div className="space-y-2">
                      {aiData.actions.map((action: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 text-sm p-2 border rounded"
                        >
                          <Badge variant="secondary" className="w-16 justify-center">
                            {action.sequenceNumber}
                          </Badge>
                          <Badge variant="outline">{action.street}</Badge>
                          <span className="font-medium">{action.playerName}</span>
                          <Badge>{action.actionType}</Badge>
                          {action.amount && (
                            <span className="text-muted-foreground ml-auto">
                              ${action.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      액션 정보가 없습니다
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* 관리자 코멘트 */}
            <div className="space-y-2">
              <Label htmlFor="admin-comment">관리자 코멘트 (선택)</Label>
              <Textarea
                id="admin-comment"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="승인/거부 사유를 입력하세요..."
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">{adminComment.length}/1000</p>
            </div>

            {/* 경고 메시지 */}
            <Card className="p-4 border-yellow-500/50 bg-yellow-500/5">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    검수 시 주의사항
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>AI 추출 데이터는 추정값이므로 정확도를 확인하세요</li>
                    <li>승인 시 핸드가 Archive에 추가되며 되돌릴 수 없습니다</li>
                    <li>거부 시 제출자에게 알림이 전송됩니다</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                거부
              </>
            )}
          </Button>
          <Button type="button" onClick={handleApprove} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                승인
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
