/**
 * Error Logging Utility
 *
 * Structured error logging for debugging and monitoring
 */

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  FFMPEG = 'ffmpeg',
  OCR = 'ocr',
  VISION_API = 'vision_api',
  FILE_SYSTEM = 'file_system',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  /** 요청 ID (submissionId 등) */
  requestId?: string
  /** 사용자 ID */
  userId?: string
  /** 추가 메타데이터 */
  metadata?: Record<string, any>
  /** Stack trace */
  stack?: string
  /** HTTP 상태 코드 */
  statusCode?: number
}

export interface LogEntry {
  timestamp: string
  severity: ErrorSeverity
  category: ErrorCategory
  message: string
  error?: string
  context?: ErrorContext
}

/**
 * 에러 카테고리 자동 감지
 */
export function detectErrorCategory(error: Error): ErrorCategory {
  const message = error.message.toLowerCase()

  // Network errors
  if (
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('network') ||
    message.includes('timeout')
  ) {
    return ErrorCategory.NETWORK
  }

  // Database errors
  if (
    message.includes('database') ||
    message.includes('postgres') ||
    message.includes('firebase') ||
    message.includes('firestore') ||
    message.includes('sql')
  ) {
    return ErrorCategory.DATABASE
  }

  // Validation errors
  if (
    message.includes('invalid') ||
    message.includes('validation') ||
    message.includes('required') ||
    message.includes('missing')
  ) {
    return ErrorCategory.VALIDATION
  }

  // FFmpeg errors
  if (message.includes('ffmpeg') || message.includes('video')) {
    return ErrorCategory.FFMPEG
  }

  // OCR errors
  if (message.includes('tesseract') || message.includes('ocr')) {
    return ErrorCategory.OCR
  }

  // Vision API errors
  if (message.includes('anthropic') || message.includes('claude') || message.includes('vision')) {
    return ErrorCategory.VISION_API
  }

  // File system errors
  if (
    message.includes('enoent') ||
    message.includes('eacces') ||
    message.includes('file') ||
    message.includes('directory')
  ) {
    return ErrorCategory.FILE_SYSTEM
  }

  return ErrorCategory.UNKNOWN
}

/**
 * 에러 심각도 자동 감지
 */
export function detectErrorSeverity(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase()

  // Critical errors
  if (
    message.includes('critical') ||
    message.includes('fatal') ||
    message.includes('out of memory')
  ) {
    return ErrorSeverity.CRITICAL
  }

  // Warnings
  if (
    message.includes('warning') ||
    message.includes('deprecated') ||
    message.includes('retry')
  ) {
    return ErrorSeverity.WARNING
  }

  // Default to ERROR
  return ErrorSeverity.ERROR
}

/**
 * Structured error logging
 */
export function logError(
  error: Error,
  context: ErrorContext = {},
  severity?: ErrorSeverity,
  category?: ErrorCategory
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    severity: severity || detectErrorSeverity(error),
    category: category || detectErrorCategory(error),
    message: error.message,
    error: error.name,
    context: {
      ...context,
      stack: error.stack,
    },
  }

  // 콘솔 출력
  const prefix = `[${entry.severity.toUpperCase()}] [${entry.category}]`
  console.error(prefix, entry.message)

  if (context.requestId) {
    console.error(`${prefix} Request ID: ${context.requestId}`)
  }

  if (context.metadata) {
    console.error(`${prefix} Metadata:`, context.metadata)
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`${prefix} Stack:`, error.stack)
  }
}

/**
 * Info 로깅
 */
export function logInfo(message: string, metadata?: Record<string, any>): void {

  console.log(`[INFO]`, message)
  if (metadata) {
    console.log(`[INFO] Metadata:`, metadata)
  }
}

/**
 * Warning 로깅
 */
export function logWarning(message: string, metadata?: Record<string, any>): void {

  console.warn(`[WARNING]`, message)
  if (metadata) {
    console.warn(`[WARNING] Metadata:`, metadata)
  }
}

/**
 * 파이프라인 단계 로깅
 */
export function logPipelineStep(
  step: string,
  submissionId: string,
  metadata?: Record<string, any>
): void {
  logInfo(`Pipeline step: ${step}`, {
    submissionId,
    ...metadata,
  })
}

/**
 * 파이프라인 완료 로깅
 */
export function logPipelineComplete(
  submissionId: string,
  durationMs: number,
  metadata?: Record<string, any>
): void {
  logInfo(`Pipeline completed`, {
    submissionId,
    durationMs,
    durationSeconds: (durationMs / 1000).toFixed(2),
    ...metadata,
  })
}

/**
 * 파이프라인 실패 로깅
 */
export function logPipelineFailure(
  submissionId: string,
  error: Error,
  durationMs: number,
  step?: string
): void {
  logError(error, {
    requestId: submissionId,
    metadata: {
      failedAt: step,
      durationMs,
      durationSeconds: (durationMs / 1000).toFixed(2),
    },
  })
}
