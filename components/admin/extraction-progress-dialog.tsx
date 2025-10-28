/**
 * Hand Extraction Progress Dialog
 *
 * SSE로 실시간 진행 상황을 표시하는 다이얼로그
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExtractionStep {
  step: number
  total: number
  message: string
  completed: boolean
  error: boolean
}

interface ExtractionProgressDialogProps {
  submissionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: (result: any) => void
  onError?: (error: string) => void
}

export function ExtractionProgressDialog({
  submissionId,
  open,
  onOpenChange,
  onComplete,
  onError,
}: ExtractionProgressDialogProps) {
  const [steps, setSteps] = useState<ExtractionStep[]>([])
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [totalSteps, setTotalSteps] = useState<number>(6)
  const [isComplete, setIsComplete] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [result, setResult] = useState<any>(null)

  const startExtraction = useCallback(() => {
    // Reset state
    setSteps([])
    setCurrentStep(0)
    setIsComplete(false)
    setIsError(false)
    setErrorMessage('')
    setResult(null)

    // SSE 연결
    const eventSource = new EventSource(`/api/extract-hand-stream?submissionId=${submissionId}`)

    eventSource.addEventListener('start', (event) => {
      const data = JSON.parse(event.data)
      console.log('[extraction] Started:', data)
    })

    eventSource.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data)
      setCurrentStep(data.step)
      setTotalSteps(data.total)

      setSteps((prev) => {
        const newSteps = [...prev]
        const existingIndex = newSteps.findIndex((s) => s.step === data.step)

        if (existingIndex >= 0) {
          newSteps[existingIndex] = {
            ...newSteps[existingIndex],
            message: data.message,
            completed: false,
            error: false,
          }
        } else {
          newSteps.push({
            step: data.step,
            total: data.total,
            message: data.message,
            completed: false,
            error: false,
          })
        }

        return newSteps.sort((a, b) => a.step - b.step)
      })
    })

    eventSource.addEventListener('step_complete', (event) => {
      const data = JSON.parse(event.data)

      setSteps((prev) => {
        const newSteps = [...prev]
        const existingIndex = newSteps.findIndex((s) => s.step === data.step)

        if (existingIndex >= 0) {
          newSteps[existingIndex] = {
            ...newSteps[existingIndex],
            message: data.message,
            completed: true,
            error: false,
          }
        } else {
          newSteps.push({
            step: data.step,
            total: totalSteps,
            message: data.message,
            completed: true,
            error: false,
          })
        }

        return newSteps.sort((a, b) => a.step - b.step)
      })
    })

    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data)
      setIsComplete(true)
      setResult(data)
      eventSource.close()

      if (onComplete) {
        onComplete(data)
      }
    })

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data)
      setIsError(true)
      setErrorMessage(data.message || 'Unknown error')
      eventSource.close()

      if (onError) {
        onError(data.message || 'Unknown error')
      }
    })

    eventSource.onerror = (error) => {
      console.error('[extraction] SSE error:', error)
      setIsError(true)
      setErrorMessage('Connection error')
      eventSource.close()

      if (onError) {
        onError('Connection error')
      }
    }
  }, [submissionId, totalSteps, onComplete, onError])

  useEffect(() => {
    if (open && submissionId) {
      startExtraction()
    }
  }, [open, submissionId, startExtraction])

  const progressPercentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  const handleClose = () => {
    if (isComplete || isError) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Hand Extraction Progress</DialogTitle>
          <DialogDescription>
            {isComplete
              ? 'Extraction completed successfully!'
              : isError
                ? 'Extraction failed'
                : 'Extracting hand data from video...'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Overall Progress: {currentStep} / {totalSteps}
              </span>
              <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Step List */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.step}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                  step.completed && 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900',
                  step.error && 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900',
                  !step.completed && !step.error && 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : step.error ? (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Step {step.step}: {step.message}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {isError && errorMessage && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:bg-red-950/20 dark:border-red-900">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">Error</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Result Summary */}
          {isComplete && result && (
            <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:bg-green-950/20 dark:border-green-900">
              <h4 className="font-semibold text-green-900 dark:text-green-100">Extraction Complete</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Batch ID:</span>
                  <p className="font-mono text-xs break-all">{result.batchId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Frame Count:</span>
                  <p className="font-medium">{result.frameCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">OCR Accuracy:</span>
                  <p className="font-medium">{result.ocrAccuracy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Processing Time:</span>
                  <p className="font-medium">{result.processingTime}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Estimated Cost:</span>
                  <p className="font-medium">{result.estimatedCost}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{result.message}</p>
            </div>
          )}

          {/* Close Button */}
          {(isComplete || isError) && (
            <div className="flex justify-end">
              <Button onClick={handleClose}>{isError ? 'Close' : 'Done'}</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
