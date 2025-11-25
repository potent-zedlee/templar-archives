/**
 * Video Uploader Component
 *
 * 영상 파일 업로드 컴포넌트
 * - 드래그앤드롭
 * - 파일 선택 버튼
 * - 파일 검증 (타입, 크기)
 */

'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ALLOWED_VIDEO_TYPES } from '@/lib/file-upload-validator'

// ==================== Constants ====================

const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024 // 50GB

const ACCEPTED_FORMATS = [
  'MP4',
  'MOV',
  'MKV',
  'WebM',
] as const

const ACCEPT_ATTRIBUTE = ALLOWED_VIDEO_TYPES.join(',')

// ==================== Types ====================

interface VideoUploaderProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
  className?: string
}

// ==================== Component ====================

export function VideoUploader({
  onFileSelect,
  disabled = false,
  className,
}: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ==================== File Validation ====================

  /**
   * 파일 검증
   */
  const validateFile = useCallback((file: File): string | null => {
    // 타입 검증
    if (!ALLOWED_VIDEO_TYPES.includes(file.type as any)) {
      return `지원하지 않는 파일 형식입니다. (지원: ${ACCEPTED_FORMATS.join(', ')})`
    }

    // 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeGB = MAX_FILE_SIZE / (1024 * 1024 * 1024)
      return `파일 크기는 ${maxSizeGB}GB를 초과할 수 없습니다`
    }

    return null
  }, [])

  /**
   * 파일 처리
   */
  const handleFile = useCallback(
    (file: File) => {
      setError(null)

      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      onFileSelect(file)
    },
    [validateFile, onFileSelect]
  )

  // ==================== Event Handlers ====================

  /**
   * 드래그 진입
   */
  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return
      setIsDragging(true)
    },
    [disabled]
  )

  /**
   * 드래그 오버
   */
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return
    },
    [disabled]
  )

  /**
   * 드래그 이탈
   */
  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return
      setIsDragging(false)
    },
    [disabled]
  )

  /**
   * 드롭
   */
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFile(files[0])
      }
    },
    [disabled, handleFile]
  )

  /**
   * 파일 선택 (input)
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }

      // input 초기화 (동일 파일 재선택 가능하도록)
      e.target.value = ''
    },
    [handleFile]
  )

  /**
   * 클릭하여 파일 선택
   */
  const handleClick = useCallback(() => {
    if (disabled) return
    fileInputRef.current?.click()
  }, [disabled])

  // ==================== Render ====================

  return (
    <div className={cn('w-full', className)}>
      {/* 드롭존 */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center gap-4 p-12',
          'cursor-pointer',
          isDragging
            ? 'border-gold-500 bg-gold-500/10'
            : 'border-gray-600 bg-gray-800/50 hover:border-gold-600 hover:bg-gray-800',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {/* 아이콘 */}
        <div
          className={cn(
            'rounded-full p-4 transition-colors',
            isDragging ? 'bg-gold-500/20' : 'bg-gray-700'
          )}
        >
          <Upload
            className={cn(
              'h-12 w-12 transition-colors',
              isDragging ? 'text-gold-400' : 'text-gray-400'
            )}
          />
        </div>

        {/* 메시지 */}
        <div className="text-center">
          <p className="text-lg font-medium text-gray-200">
            {isDragging
              ? '파일을 놓아주세요'
              : '영상 파일을 드래그하거나 클릭하여 선택하세요'}
          </p>

          <div className="mt-3 space-y-1 text-sm text-gray-400">
            <p>지원 형식: {ACCEPTED_FORMATS.join(', ')}</p>
            <p>최대 크기: 50GB</p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-900/20 border border-red-800 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
