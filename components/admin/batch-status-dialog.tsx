/**
 * Vision Batch Status Dialog
 *
 * Claude Vision Batch 상태 확인 및 결과 다운로드
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
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BatchStatusDialogProps {
  submissionId: string
  batchId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDownloadComplete?: () => void
}

interface BatchStatus {
  batchId: string
  status: string
  requestCounts: {
    processing: number
    succeeded: number
    errored: number
    canceled: number
    expired: number
  }
  isComplete: boolean
  isFailed: boolean
}

export function BatchStatusDialog({
  submissionId,
  batchId,
  open,
  onOpenChange,
  onDownloadComplete,
}: BatchStatusDialogProps) {
  const [status, setStatus] = useState<BatchStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStatus = useCallback(async () => {
    if (!batchId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/vision-batch-status?submissionId=${submissionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch batch status')
      }

      const data = await response.json()
      setStatus(data)

      // 완료되면 자동 새로고침 중지
      if (data.isComplete || data.isFailed) {
        setAutoRefresh(false)
      }
    } catch (error) {
      console.error('[batch-status] Error:', error)
      toast.error('Failed to fetch batch status')
    } finally {
      setIsLoading(false)
    }
  }, [submissionId, batchId])

  const downloadResults = useCallback(async () => {
    if (!batchId) return

    setIsDownloading(true)
    try {
      const response = await fetch('/api/vision-batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to download batch results')
      }

      const data = await response.json()
      toast.success('Batch results downloaded successfully!')

      if (onDownloadComplete) {
        onDownloadComplete()
      }

      onOpenChange(false)
    } catch (error) {
      console.error('[batch-status] Download error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to download results')
    } finally {
      setIsDownloading(false)
    }
  }, [submissionId, batchId, onDownloadComplete, onOpenChange])

  // Initial fetch
  useEffect(() => {
    if (open && batchId) {
      fetchStatus()
    }
  }, [open, batchId, fetchStatus])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!open || !autoRefresh) return

    const interval = setInterval(() => {
      fetchStatus()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [open, autoRefresh, fetchStatus])

  if (!status) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Vision Batch Status</DialogTitle>
            <DialogDescription>Loading batch status...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const totalRequests =
    status.requestCounts.processing +
    status.requestCounts.succeeded +
    status.requestCounts.errored +
    status.requestCounts.canceled +
    status.requestCounts.expired

  const completedRequests =
    status.requestCounts.succeeded +
    status.requestCounts.errored +
    status.requestCounts.canceled +
    status.requestCounts.expired

  const progressPercentage = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Vision Batch Status</DialogTitle>
          <DialogDescription>
            {status.isComplete
              ? 'Batch processing completed'
              : status.isFailed
                ? 'Batch processing failed'
                : 'Batch processing in progress'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Batch ID */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Batch ID</p>
            <p className="font-mono text-xs break-all bg-muted px-3 py-2 rounded-md">
              {status.batchId}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge
              variant={status.isComplete ? 'default' : status.isFailed ? 'destructive' : 'secondary'}
              className={cn(
                'gap-1',
                status.isComplete && 'bg-green-500 hover:bg-green-600',
                !status.isComplete && !status.isFailed && 'bg-blue-500 hover:bg-blue-600'
              )}
            >
              {status.isComplete ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : status.isFailed ? (
                <XCircle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {status.status}
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Progress: {completedRequests} / {totalRequests}
              </span>
              <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Request Counts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold">{status.requestCounts.processing}</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Succeeded</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {status.requestCounts.succeeded}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Errored</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {status.requestCounts.errored}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Canceled/Expired</p>
              <p className="text-2xl font-bold text-muted-foreground">
                {status.requestCounts.canceled + status.requestCounts.expired}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>

              {!status.isComplete && !status.isFailed && (
                <Badge variant="secondary" className="text-xs">
                  Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
                </Badge>
              )}
            </div>

            {status.isComplete && (
              <Button onClick={downloadResults} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Results
              </Button>
            )}
          </div>

          {/* Help Text */}
          {!status.isComplete && !status.isFailed && (
            <p className="text-xs text-muted-foreground text-center">
              Batch processing typically takes 10-24 hours. This dialog will auto-refresh every 30 seconds.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
