/**
 * Sentry Utilities
 *
 * Custom utility functions for Sentry error tracking and performance monitoring.
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Set user context for Sentry
 *
 * @param user User object with id, email, etc.
 */
export function setSentryUser(user: {
  id: string
  email?: string
  username?: string
  role?: string
} | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Add breadcrumb to Sentry
 *
 * Breadcrumbs help you understand the events leading up to an error.
 *
 * @param message Breadcrumb message
 * @param category Breadcrumb category (e.g., 'ui', 'navigation', 'auth')
 * @param level Breadcrumb level ('info', 'warning', 'error')
 * @param data Additional data
 */
export function addSentryBreadcrumb(
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Capture exception with Sentry
 *
 * @param error Error object
 * @param context Additional context
 * @returns Event ID
 */
export function captureSentryException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, any>
    level?: Sentry.SeverityLevel
    user?: {
      id: string
      email?: string
      username?: string
    }
  }
): string {
  // Add tags
  if (context?.tags) {
    Sentry.setTags(context.tags)
  }

  // Add extra context
  if (context?.extra) {
    Sentry.setExtras(context.extra)
  }

  // Set user
  if (context?.user) {
    setSentryUser(context.user)
  }

  // Capture exception
  const eventId = Sentry.captureException(error, {
    level: context?.level || 'error',
  })

  return eventId
}

/**
 * Capture message with Sentry
 *
 * @param message Message to capture
 * @param level Severity level
 * @param context Additional context
 * @returns Event ID
 */
export function captureSentryMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, any>
  }
): string {
  // Add tags
  if (context?.tags) {
    Sentry.setTags(context.tags)
  }

  // Add extra context
  if (context?.extra) {
    Sentry.setExtras(context.extra)
  }

  // Capture message
  const eventId = Sentry.captureMessage(message, level)

  return eventId
}

/**
 * Start a Sentry span for performance monitoring (Updated for Sentry SDK v8+)
 *
 * @param name Span name
 * @param op Operation type (e.g., 'http.server', 'db.query')
 * @param fn Function to execute within the span
 * @returns Result of the function
 */
export async function startSentrySpan<T>(
  name: string,
  op: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op,
    },
    async () => {
      return await fn()
    }
  )
}

/**
 * Wrap async function with Sentry transaction (Updated for Sentry SDK v8+)
 *
 * @param name Transaction name
 * @param op Operation type
 * @param fn Async function to wrap
 * @returns Result of the function
 */
export async function withSentryTransaction<T>(
  name: string,
  op: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op,
    },
    async () => {
      try {
        const result = await fn()
        return result
      } catch (error) {
        captureSentryException(error, {
          tags: { transaction: name },
        })
        throw error
      }
    }
  )
}

/**
 * Create a Sentry span for performance monitoring
 *
 * @param parentTransaction Parent transaction
 * @param op Operation type
 * @param description Span description
 * @returns Span object
 */
export function createSentrySpan(
  parentTransaction: Sentry.Transaction,
  op: string,
  description: string
): Sentry.Span {
  return parentTransaction.startChild({
    op,
    description,
  })
}

/**
 * Wrap function with error boundary
 *
 * Automatically captures exceptions and rethrows them.
 *
 * @param fn Function to wrap
 * @param context Error context
 * @returns Wrapped function
 */
export function withSentryErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, any>
  }
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      const result = fn(...args)

      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureSentryException(error, context)
          throw error
        }) as ReturnType<T>
      }

      return result
    } catch (error) {
      captureSentryException(error, context)
      throw error
    }
  }) as T
}
