/**
 * Upload Progress Component
 *
 * 업로드 진행률 표시 컴포넌트
 * - 파일 정보 (이름, 크기)
 * - 진행률 바
 * - 업로드 속도, 남은 시간
 * - 일시정지/재개/취소 버튼
 */

'use client'

import { Pause, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ==================== Types ====================

export interface UploadProgressProps {
  fileName: string
  fileSize: number
  progress: number
  status: 'uploading' | 'paused' | 'completed' | 'error'
  uploadSpeed: number // bytes/sec
  remainingTime: number // seconds
  error?: string | null
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
  className?: string
}

// ==================== Utility Functions ====================

/**
 * 파일 크기 포맷팅
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}

/**
 * 업로드 속도 포맷팅
 */
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'

  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const k = 1024
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))

  return `${(bytesPerSecond / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}

/**
 * 남은 시간 포맷팅
 */
function formatTime(seconds: number): string {
  if (seconds === 0 || !isFinite(seconds)) return '--:--'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// ==================== Component ====================

export function UploadProgress({
  fileName,
  fileSize,
  progress,
  status,
  uploadSpeed,
  remainingTime,
  error,
  onPause,
  onResume,
  onCancel,
  className,
}: UploadProgressProps) {
  // ==================== Status Indicators ====================

  const statusText = {
    uploading: '업로드 중',
    paused: '일시정지됨',
    completed: '완료',
    error: '오류',
  }[status]

  const statusColor = {
    uploading: 'text-gold-400',
    paused: 'text-yellow-400',
    completed: 'text-green-400',
    error: 'text-red-400',
  }[status]

  // ==================== Render ====================

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-6',
        className
      )}
    >
      {/* Header: 파일명 + 상태 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {fileName}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {formatFileSize(fileSize)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', statusColor)}>
            {statusText}
          </span>

          {/* 취소 버튼 */}
          {status !== 'completed' && onCancel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8"
              title="취소"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            {progress}%
          </span>

          {status === 'uploading' && (
            <span className="text-sm text-muted-foreground">
              {formatSpeed(uploadSpeed)}
            </span>
          )}
        </div>

        <Progress value={progress} className="h-2" />

        {/* 남은 시간 */}
        {status === 'uploading' && remainingTime > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            남은 시간: {formatTime(remainingTime)}
          </p>
        )}
      </div>

      {/* 에러 메시지 */}
      {status === 'error' && error && (
        <div className="mt-4 rounded-lg bg-red-900/20 border border-red-800 px-3 py-2">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* 컨트롤 버튼 */}
      {status !== 'completed' && status !== 'error' && (
        <div className="flex gap-2 mt-4">
          {status === 'uploading' && onPause && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onPause}
              className="flex-1"
            >
              <Pause className="h-4 w-4 mr-2" />
              일시정지
            </Button>
          )}

          {status === 'paused' && onResume && (
            <Button
              variant="primary"
              size="sm"
              onClick={onResume}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              재개
            </Button>
          )}
        </div>
      )}

      {/* 완료 메시지 */}
      {status === 'completed' && (
        <div className="mt-4 rounded-lg bg-green-900/20 border border-green-800 px-3 py-2">
          <p className="text-sm text-green-400">
            업로드가 완료되었습니다
          </p>
        </div>
      )}
    </div>
  )
}
