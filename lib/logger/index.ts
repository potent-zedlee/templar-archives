/**
 * Structured Logging System
 *
 * Production-ready logging with Pino
 * - Structured JSON logs for production
 * - Pretty printing for development
 * - Log levels: trace, debug, info, warn, error, fatal
 * - Context enrichment (request ID, user ID, etc.)
 */

import pino from 'pino'
import { appEnv } from '@/lib/env'

// Log levels
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

// Log context
export interface LogContext {
  requestId?: string
  userId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
  endpoint?: string
  method?: string
  statusCode?: number
  duration?: number
  error?: Error | string
  [key: string]: unknown
}

/**
 * Create Pino logger instance
 */
const createLogger = () => {
  // Development: Pretty printing
  if (appEnv.isDevelopment) {
    return pino({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{levelLabel} - {msg}',
        },
      },
    })
  }

  // Production: Structured JSON logs
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => {
        return { level: label }
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      env: appEnv.nodeEnv,
      service: 'templar-archives',
    },
  })
}

// Singleton logger instance
const pinoLogger = createLogger()

/**
 * Structured logger with type-safe methods
 */
class Logger {
  private logger: pino.Logger

  constructor(logger: pino.Logger) {
    this.logger = logger
  }

  /**
   * Trace level logging (most verbose)
   */
  trace(message: string, context?: LogContext): void {
    this.logger.trace(context || {}, message)
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(context || {}, message)
  }

  /**
   * Info level logging (default)
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(context || {}, message)
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(context || {}, message)
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext): void {
    const ctx = { ...context }

    // Extract error details if error object is provided
    if (context?.error instanceof Error) {
      ctx.error = {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack,
      }
    }

    this.logger.error(ctx, message)
  }

  /**
   * Fatal level logging (highest severity)
   */
  fatal(message: string, context?: LogContext): void {
    this.logger.fatal(context || {}, message)
  }

  /**
   * Create child logger with default context
   *
   * @example
   * const requestLogger = logger.child({ requestId: '123', userId: 'abc' })
   * requestLogger.info('Request started')
   */
  child(context: LogContext): Logger {
    return new Logger(this.logger.child(context))
  }

  /**
   * HTTP request logging
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    const ctx: LogContext = {
      method,
      endpoint: url,
      statusCode,
      duration,
      ...context,
    }

    this.logger[level](ctx, `${method} ${url} ${statusCode} - ${duration}ms`)
  }

  /**
   * Database query logging
   */
  logQuery(query: string, duration: number, context?: LogContext): void {
    this.logger.debug(
      {
        query: query.substring(0, 500), // Truncate long queries
        duration,
        ...context,
      },
      `Database query executed in ${duration}ms`
    )
  }

  /**
   * Security event logging
   */
  logSecurity(
    event: string,
    severity: 'critical' | 'high' | 'medium' | 'low',
    context?: LogContext
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn'
    this.logger[level](
      {
        securityEvent: event,
        severity,
        ...context,
      },
      `[SECURITY] ${event}`
    )
  }

  /**
   * Performance metric logging
   */
  logMetric(
    metric: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count',
    context?: LogContext
  ): void {
    this.logger.info(
      {
        metric,
        value,
        unit,
        ...context,
      },
      `Metric: ${metric} = ${value}${unit}`
    )
  }
}

// Export singleton logger instance
export const logger = new Logger(pinoLogger)

/**
 * Create request-scoped logger
 *
 * @example
 * const requestLogger = createRequestLogger(request)
 * requestLogger.info('Processing request')
 */
export function createRequestLogger(request: {
  headers?: Headers | Map<string, string>
  method?: string
  url?: string
}): Logger {
  const headers = request.headers
  const requestId = generateRequestId()

  const context: LogContext = {
    requestId,
    method: request.method,
    endpoint: request.url,
  }

  // Extract user agent
  if (headers instanceof Headers) {
    context.userAgent = headers.get('user-agent') || undefined
    context.ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined
  } else if (headers instanceof Map) {
    context.userAgent = headers.get('user-agent') || undefined
    context.ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined
  }

  return logger.child(context)
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Backward compatibility: Export legacy logger methods
 */
export const legacyLogger = {
  debug: (...args: unknown[]) => logger.debug(String(args[0]), { data: args.slice(1) }),
  log: (...args: unknown[]) => logger.info(String(args[0]), { data: args.slice(1) }),
  info: (...args: unknown[]) => logger.info(String(args[0]), { data: args.slice(1) }),
  warn: (...args: unknown[]) => logger.warn(String(args[0]), { data: args.slice(1) }),
  error: (...args: unknown[]) => logger.error(String(args[0]), { data: args.slice(1) }),
}

// Default export
export default logger
