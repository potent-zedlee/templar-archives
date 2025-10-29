/**
 * Automatic Hand Boundary Detection Dialog
 *
 * 영상에서 자동으로 핸드 경계를 감지하고 일괄 제출하는 다이얼로그
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Check, X, Edit, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DetectedHand {
  handNumber: number
  startTime: string
  endTime: string
  confidence: number
  description?: string
}

interface AutoDetectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streams: Array<{
    id: string
    name: string
    duration: number
  }>
  onSubmitSuccess?: () => void
}

export function AutoDetectDialog({
  open,
  onOpenChange,
  streams,
  onSubmitSuccess,
}: AutoDetectDialogProps) {
  const [selectedStreamId, setSelectedStreamId] = useState<string>('')
  const [detectionMethod, setDetectionMethod] = useState<'scene_detection' | 'ocr' | 'hybrid'>(
    'scene_detection'
  )
  const [isDetecting, setIsDetecting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [detectedHands, setDetectedHands] = useState<DetectedHand[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<DetectedHand | null>(null)

  const selectedStream = streams.find((s) => s.id === selectedStreamId)

  const handleDetect = async () => {
    if (!selectedStreamId) {
      toast.error('스트림을 선택해주세요')
      return
    }

    setIsDetecting(true)
    setDetectedHands([])

    try {
      const response = await fetch('/api/streams/detect-boundaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId: selectedStreamId,
          method: detectionMethod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '감지에 실패했습니다')
      }

      if (data.success && data.detectedHands) {
        setDetectedHands(data.detectedHands)
        toast.success(
          `${data.totalDetected}개의 핸드를 감지했습니다 (${data.processingTime}초 소요)`
        )
      } else {
        throw new Error('감지 결과가 없습니다')
      }
    } catch (error: any) {
      console.error('Auto detection failed:', error)
      toast.error(error.message || '핸드 경계 감지에 실패했습니다')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditValues({ ...detectedHands[index] })
  }

  const handleSaveEdit = () => {
    if (editingIndex !== null && editValues) {
      const updated = [...detectedHands]
      updated[editingIndex] = editValues
      setDetectedHands(updated)
      setEditingIndex(null)
      setEditValues(null)
      toast.success('수정되었습니다')
    }
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditValues(null)
  }

  const handleDelete = (index: number) => {
    const updated = detectedHands.filter((_, i) => i !== index)
    setDetectedHands(updated)
    toast.success('삭제되었습니다')
  }

  const handleSubmitAll = async () => {
    if (detectedHands.length === 0) {
      toast.error('제출할 핸드가 없습니다')
      return
    }

    if (!selectedStreamId) {
      toast.error('스트림을 선택해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/timecodes/batch-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId: selectedStreamId,
          timecodes: detectedHands.map((hand) => ({
            handNumber: hand.handNumber,
            startTime: hand.startTime,
            endTime: hand.endTime,
            description: hand.description || null,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '제출에 실패했습니다')
      }

      toast.success(`${data.submittedCount}개의 타임코드가 제출되었습니다`)
      onSubmitSuccess?.()
      onOpenChange(false)

      // 초기화
      setSelectedStreamId('')
      setDetectedHands([])
    } catch (error: any) {
      console.error('Batch submit failed:', error)
      toast.error(error.message || '타임코드 제출에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isDetecting && !isSubmitting) {
      onOpenChange(false)
      setSelectedStreamId('')
      setDetectedHands([])
      setEditingIndex(null)
      setEditValues(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Automatic Hand Detection
          </DialogTitle>
          <DialogDescription>
            AI가 영상에서 핸드 경계를 자동으로 감지합니다. 결과를 확인하고 수정한 후 일괄 제출하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stream Selection */}
          <div className="space-y-2">
            <Label htmlFor="stream">Stream</Label>
            <Select value={selectedStreamId} onValueChange={setSelectedStreamId}>
              <SelectTrigger id="stream">
                <SelectValue placeholder="스트림을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {streams.map((stream) => (
                  <SelectItem key={stream.id} value={stream.id}>
                    {stream.name} ({Math.floor(stream.duration / 60)}분)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detection Method */}
          <div className="space-y-2">
            <Label htmlFor="method">Detection Method</Label>
            <Select
              value={detectionMethod}
              onValueChange={(value) =>
                setDetectionMethod(value as 'scene_detection' | 'ocr' | 'hybrid')
              }
            >
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scene_detection">
                  Scene Detection (빠름, 70-80% 정확도)
                </SelectItem>
                <SelectItem value="ocr" disabled>
                  OCR (중간, 85-92% 정확도) - 준비 중
                </SelectItem>
                <SelectItem value="hybrid" disabled>
                  Hybrid (느림, 90-95% 정확도) - 준비 중
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Detect Button */}
          <Button
            onClick={handleDetect}
            disabled={!selectedStreamId || isDetecting}
            className="w-full"
          >
            {isDetecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Detection
              </>
            )}
          </Button>

          {/* Results Table */}
          {detectedHands.length > 0 && (
            <div className="space-y-2">
              <Label>Detected Hands ({detectedHands.length})</Label>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Hand #</TableHead>
                      <TableHead className="w-28">Start</TableHead>
                      <TableHead className="w-28">End</TableHead>
                      <TableHead className="w-24">Confidence</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-28 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detectedHands.map((hand, index) =>
                      editingIndex === index && editValues ? (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              type="number"
                              value={editValues.handNumber}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  handNumber: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-16 h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editValues.startTime}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  startTime: e.target.value,
                                })
                              }
                              placeholder="HH:MM:SS"
                              className="w-24 h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editValues.endTime}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  endTime: e.target.value,
                                })
                              }
                              placeholder="HH:MM:SS"
                              className="w-24 h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">
                              {(hand.confidence * 100).toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editValues.description || ''}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  description: e.target.value,
                                })
                              }
                              placeholder="설명 (선택)"
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleSaveEdit}
                              className="h-7 px-2"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-7 px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">
                            {hand.handNumber}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {hand.startTime}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {hand.endTime}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs ${
                                hand.confidence >= 0.8
                                  ? 'text-green-600'
                                  : hand.confidence >= 0.6
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {(hand.confidence * 100).toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {hand.description || '-'}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(index)}
                              className="h-7 px-2"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(index)}
                              className="h-7 px-2"
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Submit All Button */}
              <Button
                onClick={handleSubmitAll}
                disabled={isSubmitting || detectedHands.length === 0}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  `Submit All (${detectedHands.length})`
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
