/**
 * Batch Timecode Panel
 *
 * High Templar 이상이 여러 핸드의 타임코드를 입력하는 사이드 패널
 * 비디오 플레이어 옆에 표시되어 영상을 보면서 입력 가능
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface BatchTimecodePanelProps {
  streamId: string | null
  streamName?: string
  existingHandsCount: number
  onSuccess?: () => void
  onClose?: () => void
}

export function BatchTimecodePanel({
  streamId,
  streamName,
  existingHandsCount,
  onSuccess,
  onClose,
}: BatchTimecodePanelProps) {
  const [rows, setRows] = useState<TimecodeRow[]>([])
  const batchSubmitMutation = useBatchSubmitTimecodeMutation()

  // 초기화
  useEffect(() => {
    if (streamId) {
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
    }
  }, [streamId, existingHandsCount])

  // 행 추가 (특정 인덱스에 삽입)
  const addRowAt = (index: number) => {
    if (rows.length >= 50) {
      toast.error('최대 50개까지 추가할 수 있습니다')
      return
    }

    // 삽입 위치의 핸드 번호를 기준으로 새 번호 생성
    const currentHandNumber = index >= 0 && index < rows.length ? parseInt(rows[index].handNumber, 10) : existingHandsCount
    const nextHandNumber = String(currentHandNumber + 1).padStart(3, '0')

    const newRow: TimecodeRow = {
      id: crypto.randomUUID(),
      handNumber: nextHandNumber,
      startTime: '',
      endTime: '',
      description: '',
    }

    // 삽입 후 뒤의 핸드 번호들을 모두 +1
    const newRows = [...rows]
    newRows.splice(index + 1, 0, newRow)

    // 삽입된 위치 이후의 핸드 번호들 재조정
    for (let i = index + 2; i < newRows.length; i++) {
      const prevNumber = parseInt(newRows[i - 1].handNumber, 10)
      newRows[i].handNumber = String(prevNumber + 1).padStart(3, '0')
    }

    setRows(newRows)
  }

  // 행 삭제
  const removeRow = (id: string) => {
    if (rows.length === 1) {
      toast.error('최소 1개의 행이 필요합니다')
      return
    }

    const index = rows.findIndex((row) => row.id === id)
    const newRows = rows.filter((row) => row.id !== id)

    // 삭제된 위치 이후의 핸드 번호들 재조정
    for (let i = index; i < newRows.length; i++) {
      if (i === 0) {
        newRows[i].handNumber = String(existingHandsCount + 1).padStart(3, '0')
      } else {
        const prevNumber = parseInt(newRows[i - 1].handNumber, 10)
        newRows[i].handNumber = String(prevNumber + 1).padStart(3, '0')
      }
    }

    setRows(newRows)
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
        rowErrors.push('시작 시간 형식 오류')
      }

      // 종료 타임코드 검증
      if (!row.endTime.trim()) {
        rowErrors.push('종료 시간 필수')
      } else if (!validateHHMMSS(row.endTime)) {
        rowErrors.push('종료 시간 형식 오류')
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
          rowErrors.push('시작 ≥ 종료')
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
          errorMap[row.id].push('중복')
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

      // 성공 시 콜백 호출
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      // 에러는 mutation에서 toast로 표시됨
    }
  }

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* 헤더 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">핸드 타임코드 일괄 입력</h3>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* 정보 표시 */}
        <div className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Stream:</span>{' '}
            <span className="font-medium">{streamName || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">기존 핸드:</span>{' '}
            <span className="font-medium">{existingHandsCount}개</span>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 dark:text-blue-100 space-y-1">
            <p className="font-medium">HH:MM:SS 형식 (예: 01:23:45)</p>
            <p>각 행 옆 [+]로 중간 삽입 가능</p>
          </div>
        </div>
      </div>

      {/* 스크롤 영역 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {rows.map((row, index) => {
            const rowErrors = errors[row.id] || []
            const hasError = rowErrors.length > 0

            return (
              <div key={row.id} className="space-y-2">
                {/* 행 */}
                <div className="flex items-start gap-2">
                  {/* 순번 */}
                  <div className="w-8 pt-2 text-sm text-muted-foreground">{index + 1}</div>

                  {/* 입력 필드들 */}
                  <div className="flex-1 space-y-2">
                    {/* 핸드 번호 */}
                    <Input
                      value={row.handNumber}
                      onChange={(e) => updateRow(row.id, 'handNumber', e.target.value)}
                      placeholder="001"
                      maxLength={50}
                      className={hasError && rowErrors.includes('핸드 번호 필수') ? 'border-red-500 h-8 text-sm' : 'h-8 text-sm'}
                    />

                    {/* 시작/종료 타임코드 */}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={row.startTime}
                        onChange={(e) => updateRow(row.id, 'startTime', e.target.value)}
                        placeholder="01:23:45"
                        maxLength={8}
                        className={
                          hasError &&
                          (rowErrors.includes('시작 시간 필수') || rowErrors.includes('시작 시간 형식 오류'))
                            ? 'border-red-500 h-8 text-sm'
                            : 'h-8 text-sm'
                        }
                      />
                      <Input
                        value={row.endTime}
                        onChange={(e) => updateRow(row.id, 'endTime', e.target.value)}
                        placeholder="01:25:30"
                        maxLength={8}
                        className={
                          hasError &&
                          (rowErrors.includes('종료 시간 필수') ||
                            rowErrors.includes('종료 시간 형식 오류') ||
                            rowErrors.includes('시작 ≥ 종료'))
                            ? 'border-red-500 h-8 text-sm'
                            : 'h-8 text-sm'
                        }
                      />
                    </div>

                    {/* 설명 */}
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                      placeholder="예: AA vs KK"
                      maxLength={500}
                      className="h-8 text-sm"
                    />

                    {/* 에러 메시지 */}
                    {hasError && (
                      <div className="text-xs text-red-600 dark:text-red-400">{rowErrors.join(', ')}</div>
                    )}
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => addRowAt(index)}
                      disabled={rows.length >= 50}
                      className="h-8 w-8"
                      title="이 행 다음에 추가"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="h-8 w-8"
                      title="삭제"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* 하단 버튼 */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={hasErrors || isSubmitting || rows.length === 0}
          className="w-full"
        >
          {isSubmitting ? '제출 중...' : `모두 제출 (${rows.length}개)`}
        </Button>
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full">
            취소
          </Button>
        )}
      </div>
    </div>
  )
}
