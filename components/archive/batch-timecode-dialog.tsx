/**
 * Batch Timecode Dialog
 *
 * High Templar 이상이 여러 핸드의 타임코드를 한 번에 입력하는 다이얼로그
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, X, AlertCircle } from 'lucide-react'
import { useBatchSubmitTimecodeMutation } from '@/lib/queries/timecode-queries'
import { validateHHMMSS, parseHHMMSS } from '@/lib/timecode-utils'
import { toast } from 'sonner'

interface TimecodeRow {
  id: string
  handNumber: string
  startTime: string
  endTime: string
  description: string
}

interface BatchTimecodeDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  streamId: string | null
  streamName?: string
  existingHandsCount: number
  onSuccess?: () => void
}

export function BatchTimecodeDialog({
  isOpen,
  onOpenChange,
  streamId,
  streamName,
  existingHandsCount,
  onSuccess,
}: BatchTimecodeDialogProps) {
  const [rows, setRows] = useState<TimecodeRow[]>([])
  const batchSubmitMutation = useBatchSubmitTimecodeMutation()

  // 다이얼로그 열릴 때 초기화
  useEffect(() => {
    if (isOpen && streamId) {
      // 첫 번째 행 추가 (기존 핸드 수 + 1부터 시작)
      const firstHandNumber = String(existingHandsCount + 1).padStart(3, '0')
      setRows([
        {
          id: crypto.randomUUID(),
          handNumber: firstHandNumber,
          startTime: '',
          endTime: '',
          description: '',
        },
      ])
    } else {
      // 다이얼로그 닫힐 때 초기화
      setRows([])
    }
  }, [isOpen, streamId, existingHandsCount])

  // 행 추가
  const addRow = () => {
    if (rows.length >= 50) {
      toast.error('최대 50개까지 추가할 수 있습니다')
      return
    }

    // 마지막 핸드 번호 + 1
    const lastHandNumber = rows.length > 0 ? parseInt(rows[rows.length - 1].handNumber, 10) : existingHandsCount
    const nextHandNumber = String(lastHandNumber + 1).padStart(3, '0')

    setRows([
      ...rows,
      {
        id: crypto.randomUUID(),
        handNumber: nextHandNumber,
        startTime: '',
        endTime: '',
        description: '',
      },
    ])
  }

  // 행 삭제
  const removeRow = (id: string) => {
    if (rows.length === 1) {
      toast.error('최소 1개의 행이 필요합니다')
      return
    }
    setRows(rows.filter((row) => row.id !== id))
  }

  // 필드 업데이트
  const updateRow = (id: string, field: keyof TimecodeRow, value: string) => {
    setRows(
      rows.map((row) => {
        if (row.id === id) {
          return { ...row, [field]: value }
        }
        return row
      })
    )
  }

  // Validation
  const errors = useMemo(() => {
    const errorMap: Record<string, string[]> = {}

    rows.forEach((row) => {
      const rowErrors: string[] = []

      // 핸드 번호 검증
      if (!row.handNumber.trim()) {
        rowErrors.push('핸드 번호 필수')
      }

      // 시작 타임코드 검증
      if (!row.startTime.trim()) {
        rowErrors.push('시작 시간 필수')
      } else if (!validateHHMMSS(row.startTime)) {
        rowErrors.push('시작 시간 형식 오류 (HH:MM:SS)')
      }

      // 종료 타임코드 검증
      if (!row.endTime.trim()) {
        rowErrors.push('종료 시간 필수')
      } else if (!validateHHMMSS(row.endTime)) {
        rowErrors.push('종료 시간 형식 오류 (HH:MM:SS)')
      }

      // 시작 < 종료 검증
      if (
        row.startTime.trim() &&
        row.endTime.trim() &&
        validateHHMMSS(row.startTime) &&
        validateHHMMSS(row.endTime)
      ) {
        const startSeconds = parseHHMMSS(row.startTime)
        const endSeconds = parseHHMMSS(row.endTime)
        if (startSeconds >= endSeconds) {
          rowErrors.push('시작 시간 ≥ 종료 시간')
        }
      }

      if (rowErrors.length > 0) {
        errorMap[row.id] = rowErrors
      }
    })

    // 중복 핸드 번호 체크
    const handNumbers = rows.map((row) => row.handNumber.trim()).filter((num) => num)
    const duplicates = handNumbers.filter((num, index) => handNumbers.indexOf(num) !== index)
    if (duplicates.length > 0) {
      rows.forEach((row) => {
        if (duplicates.includes(row.handNumber.trim())) {
          if (!errorMap[row.id]) {
            errorMap[row.id] = []
          }
          errorMap[row.id].push('중복 핸드 번호')
        }
      })
    }

    return errorMap
  }, [rows])

  const hasErrors = Object.keys(errors).length > 0
  const isSubmitting = batchSubmitMutation.isPending

  // 제출
  const handleSubmit = async () => {
    if (!streamId) {
      toast.error('스트림을 선택해주세요')
      return
    }

    if (hasErrors) {
      toast.error('입력 오류가 있습니다')
      return
    }

    const timecodes = rows.map((row) => ({
      handNumber: row.handNumber.trim(),
      startTime: row.startTime.trim(),
      endTime: row.endTime.trim(),
      description: row.description.trim() || null,
    }))

    try {
      await batchSubmitMutation.mutateAsync({
        streamId,
        timecodes,
      })

      // 성공 시 다이얼로그 닫고 콜백 호출
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      // 에러는 mutation에서 toast로 표시됨
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>핸드 타임코드 일괄 입력</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 정보 표시 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">선택된 Stream:</span>{' '}
              <span className="font-medium">{streamName || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">기존 핸드 수:</span>{' '}
              <span className="font-medium">{existingHandsCount}개</span>
            </div>
          </div>

          {/* 안내 메시지 */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">타임코드 입력 안내</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>시간 형식: HH:MM:SS (예: 01:23:45)</li>
                <li>핸드 번호는 자동으로 생성되며, 수정 가능합니다</li>
                <li>시작 시간은 종료 시간보다 이전이어야 합니다</li>
                <li>최대 50개까지 한 번에 제출할 수 있습니다</li>
              </ul>
            </div>
          </div>

          {/* 테이블 헤더 */}
          <div className="grid grid-cols-[60px_100px_1fr_1fr_1fr_50px] gap-2 px-2 text-sm font-medium text-muted-foreground border-b pb-2">
            <div>#</div>
            <div>핸드번호</div>
            <div>시작 (HH:MM:SS)</div>
            <div>종료 (HH:MM:SS)</div>
            <div>설명 (선택)</div>
            <div></div>
          </div>

          {/* 스크롤 영역 */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {rows.map((row, index) => {
                const rowErrors = errors[row.id] || []
                const hasError = rowErrors.length > 0

                return (
                  <div key={row.id} className={`grid grid-cols-[60px_100px_1fr_1fr_1fr_50px] gap-2 items-start`}>
                    {/* 순번 */}
                    <div className="flex items-center h-10 text-sm text-muted-foreground">{index + 1}</div>

                    {/* 핸드 번호 */}
                    <div>
                      <Input
                        value={row.handNumber}
                        onChange={(e) => updateRow(row.id, 'handNumber', e.target.value)}
                        placeholder="001"
                        maxLength={50}
                        className={hasError && rowErrors.includes('핸드 번호 필수') ? 'border-red-500' : ''}
                      />
                    </div>

                    {/* 시작 타임코드 */}
                    <div>
                      <Input
                        value={row.startTime}
                        onChange={(e) => updateRow(row.id, 'startTime', e.target.value)}
                        placeholder="01:23:45"
                        maxLength={8}
                        className={
                          hasError &&
                          (rowErrors.includes('시작 시간 필수') || rowErrors.includes('시작 시간 형식 오류 (HH:MM:SS)'))
                            ? 'border-red-500'
                            : ''
                        }
                      />
                    </div>

                    {/* 종료 타임코드 */}
                    <div>
                      <Input
                        value={row.endTime}
                        onChange={(e) => updateRow(row.id, 'endTime', e.target.value)}
                        placeholder="01:25:30"
                        maxLength={8}
                        className={
                          hasError &&
                          (rowErrors.includes('종료 시간 필수') ||
                            rowErrors.includes('종료 시간 형식 오류 (HH:MM:SS)') ||
                            rowErrors.includes('시작 시간 ≥ 종료 시간'))
                            ? 'border-red-500'
                            : ''
                        }
                      />
                    </div>

                    {/* 설명 */}
                    <div>
                      <Input
                        value={row.description}
                        onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                        placeholder="예: AA vs KK all-in"
                        maxLength={500}
                      />
                    </div>

                    {/* 삭제 버튼 */}
                    <div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="h-10 w-10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 에러 메시지 (다음 행) */}
                    {hasError && (
                      <div className="col-span-6 text-xs text-red-600 dark:text-red-400 pl-16">
                        {rowErrors.join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* 행 추가 버튼 */}
          <div className="flex justify-start">
            <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={rows.length >= 50}>
              <Plus className="mr-2 h-4 w-4" />
              핸드 추가
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={hasErrors || isSubmitting || rows.length === 0}>
            {isSubmitting ? '제출 중...' : `모두 제출 (${rows.length}개)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
