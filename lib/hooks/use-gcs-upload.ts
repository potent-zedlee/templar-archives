/**
 * GCS Upload Hook
 *
 * Google Cloud Storage 재개 가능 업로드 훅
 * - 청크 단위 업로드 (8MB)
 * - 일시정지/재개/취소
 * - 진행률 추적
 * - LocalStorage 상태 저장
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

// ==================== Constants ====================

const CHUNK_SIZE = 8 * 1024 * 1024 // 8MB
const STORAGE_KEY_PREFIX = 'gcs_upload_'

// ==================== Types ====================

export interface UseGcsUploadOptions {
  streamId: string
  onProgress?: (progress: number) => void
  onComplete?: (gcsUri: string) => void
  onError?: (error: Error) => void
}

export interface UseGcsUploadReturn {
  upload: (file: File) => Promise<void>
  pause: () => void
  resume: () => void
  cancel: () => void
  progress: number
  status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error'
  error: Error | null
  uploadSpeed: number // bytes/sec
  remainingTime: number // seconds
}

interface UploadState {
  uploadUrl: string
  fileName: string
  fileSize: number
  uploadedBytes: number
  startTime: number
}

// ==================== Hook ====================

export function useGcsUpload(options: UseGcsUploadOptions): UseGcsUploadReturn {
  const { streamId, onProgress, onComplete, onError } = options

  const [status, setStatus] = useState<UseGcsUploadReturn['status']>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [remainingTime, setRemainingTime] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const fileRef = useRef<File | null>(null)
  const uploadStateRef = useRef<UploadState | null>(null)
  const isPausedRef = useRef(false)
  const lastProgressTimeRef = useRef<number>(0)
  const lastUploadedBytesRef = useRef<number>(0)

  // LocalStorage 키
  const storageKey = `${STORAGE_KEY_PREFIX}${streamId}`

  // ==================== Utility Functions ====================

  /**
   * LocalStorage에서 업로드 상태 불러오기
   */
  const loadUploadState = useCallback((): UploadState | null => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }, [storageKey])

  /**
   * LocalStorage에 업로드 상태 저장
   */
  const saveUploadState = useCallback(
    (state: UploadState) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state))
      } catch (err) {
        console.error('Failed to save upload state:', err)
      }
    },
    [storageKey]
  )

  /**
   * LocalStorage에서 업로드 상태 삭제
   */
  const clearUploadState = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch (err) {
      console.error('Failed to clear upload state:', err)
    }
  }, [storageKey])

  /**
   * 진행률 및 속도 계산
   */
  const updateProgress = useCallback(
    (uploadedBytes: number, totalBytes: number) => {
      const now = Date.now()
      const progressPercent = Math.round((uploadedBytes / totalBytes) * 100)

      setProgress(progressPercent)
      onProgress?.(progressPercent)

      // 속도 계산 (1초 간격으로)
      if (now - lastProgressTimeRef.current >= 1000) {
        const bytesDiff = uploadedBytes - lastUploadedBytesRef.current
        const timeDiff = (now - lastProgressTimeRef.current) / 1000
        const speed = bytesDiff / timeDiff

        setUploadSpeed(speed)

        // 남은 시간 계산
        const remainingBytes = totalBytes - uploadedBytes
        const remaining = speed > 0 ? remainingBytes / speed : 0
        setRemainingTime(Math.round(remaining))

        lastProgressTimeRef.current = now
        lastUploadedBytesRef.current = uploadedBytes
      }
    },
    [onProgress]
  )

  /**
   * 업로드 초기화
   */
  const initUpload = useCallback(
    async (file: File): Promise<string> => {
      const response = await fetch('/api/gcs/init-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamId,
          filename: file.name,
          fileSize: file.size,
          contentType: file.type || 'video/mp4',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '업로드 초기화 실패')
      }

      const data = await response.json()
      return data.uploadUrl
    },
    [streamId]
  )

  /**
   * 청크 업로드
   */
  const uploadChunk = useCallback(
    async (
      uploadUrl: string,
      file: File,
      start: number,
      end: number,
      totalSize: number
    ): Promise<void> => {
      const chunk = file.slice(start, end)
      const chunkSize = end - start

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
          'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
        },
        body: chunk,
        signal: abortControllerRef.current?.signal,
      })

      if (!response.ok && response.status !== 308) {
        // 308 Resume Incomplete는 정상
        throw new Error(`청크 업로드 실패: ${response.status}`)
      }
    },
    []
  )

  /**
   * 파일 업로드 (재개 가능)
   */
  const uploadFile = useCallback(
    async (file: File, uploadUrl: string, startByte: number = 0) => {
      const totalSize = file.size
      let uploadedBytes = startByte

      lastProgressTimeRef.current = Date.now()
      lastUploadedBytesRef.current = startByte

      while (uploadedBytes < totalSize && !isPausedRef.current) {
        const end = Math.min(uploadedBytes + CHUNK_SIZE, totalSize)

        await uploadChunk(uploadUrl, file, uploadedBytes, end, totalSize)

        uploadedBytes = end
        updateProgress(uploadedBytes, totalSize)

        // 상태 저장 (재개용)
        if (uploadStateRef.current) {
          uploadStateRef.current.uploadedBytes = uploadedBytes
          saveUploadState(uploadStateRef.current)
        }
      }

      return uploadedBytes
    },
    [uploadChunk, updateProgress, saveUploadState]
  )

  /**
   * 업로드 완료
   */
  const completeUpload = useCallback(
    async (uploadUrl: string): Promise<string> => {
      const response = await fetch('/api/gcs/complete-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadUrl,
          streamId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '업로드 완료 처리 실패')
      }

      const data = await response.json()
      return data.gcsUri
    },
    [streamId]
  )

  // ==================== Public Methods ====================

  /**
   * 업로드 시작
   */
  const upload = useCallback(
    async (file: File) => {
      try {
        setStatus('uploading')
        setError(null)
        setProgress(0)
        isPausedRef.current = false
        fileRef.current = file
        abortControllerRef.current = new AbortController()

        // 저장된 상태 확인
        const savedState = loadUploadState()
        let uploadUrl: string
        let startByte = 0

        if (
          savedState &&
          savedState.fileName === file.name &&
          savedState.fileSize === file.size
        ) {
          // 재개
          uploadUrl = savedState.uploadUrl
          startByte = savedState.uploadedBytes
          uploadStateRef.current = savedState
        } else {
          // 새로운 업로드
          uploadUrl = await initUpload(file)
          uploadStateRef.current = {
            uploadUrl,
            fileName: file.name,
            fileSize: file.size,
            uploadedBytes: 0,
            startTime: Date.now(),
          }
          saveUploadState(uploadStateRef.current)
        }

        // 파일 업로드
        const uploadedBytes = await uploadFile(file, uploadUrl, startByte)

        // 일시정지된 경우
        if (isPausedRef.current) {
          setStatus('paused')
          return
        }

        // 완료
        if (uploadedBytes === file.size) {
          const gcsUri = await completeUpload(uploadUrl)
          setStatus('completed')
          setProgress(100)
          clearUploadState()
          onComplete?.(gcsUri)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('업로드 실패')
        setError(error)
        setStatus('error')
        onError?.(error)
      }
    },
    [
      loadUploadState,
      initUpload,
      uploadFile,
      completeUpload,
      saveUploadState,
      clearUploadState,
      onComplete,
      onError,
    ]
  )

  /**
   * 일시정지
   */
  const pause = useCallback(() => {
    isPausedRef.current = true
    abortControllerRef.current?.abort()
    setStatus('paused')
  }, [])

  /**
   * 재개
   */
  const resume = useCallback(() => {
    if (fileRef.current && uploadStateRef.current && status === 'paused') {
      upload(fileRef.current)
    }
  }, [upload, status])

  /**
   * 취소
   */
  const cancel = useCallback(() => {
    isPausedRef.current = true
    abortControllerRef.current?.abort()
    clearUploadState()
    setStatus('idle')
    setProgress(0)
    setError(null)
    fileRef.current = null
    uploadStateRef.current = null
  }, [clearUploadState])

  // ==================== Cleanup ====================

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    upload,
    pause,
    resume,
    cancel,
    progress,
    status,
    error,
    uploadSpeed,
    remainingTime,
  }
}
