/**
 * Error handling utilities for API routes
 * Sanitizes error messages in production to avoid leaking sensitive information
 */

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Sanitize error message for client response
 * In production, returns generic message. In development, returns detailed error.
 */
export function sanitizeErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!isProduction) {
    // In development, show detailed error messages
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return String(error)
  }

  // In production, return generic fallback message
  return fallbackMessage
}

/**
 * Log error to console (always logs regardless of environment)
 * In production, also sends to error tracking service (if configured)
 */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error)

  // TODO: In production, send to error tracking service (e.g., Sentry)
  if (isProduction) {
    // Example: Sentry.captureException(error)
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: unknown,
  fallbackMessage: string,
  statusCode: number = 500
): {
  error: string
  status: number
} {
  const message = sanitizeErrorMessage(error, fallbackMessage)
  return {
    error: message,
    status: statusCode
  }
}
