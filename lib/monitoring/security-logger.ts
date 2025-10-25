/**
 * Security Event Logger
 *
 * Centralized security event logging for monitoring and audit purposes.
 * Integrates with monitoring services in production.
 */

import { logger } from '@/lib/logger'

export type SecurityEventType =
  | 'sql_injection_attempt'
  | 'xss_attempt'
  | 'csrf_violation'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'rls_bypass_attempt'
  | 'invalid_input'
  | 'suspicious_activity'

export interface SecurityEventContext {
  userId?: string
  ip?: string
  userAgent?: string
  endpoint?: string
  method?: string
  payload?: unknown
  error?: string
  timestamp?: string
  [key: string]: unknown
}

/**
 * Log security event with structured data
 *
 * @param type - Type of security event
 * @param context - Additional context for the event
 */
export function logSecurityEvent(
  type: SecurityEventType,
  context: SecurityEventContext = {}
): void {
  const event = {
    type,
    timestamp: new Date().toISOString(),
    severity: getSeverity(type),
    ...context,
  }

  // Log to console (development) or structured logger (production)
  if (process.env.NODE_ENV === 'production') {
    // Production: Send to monitoring service
    logger.error(`[SECURITY] ${type}`, event)

    // Future integration points:
    // - Send to Sentry: Sentry.captureMessage(type, { level: 'error', extra: event })
    // - Send to Datadog: datadogLogger.error(type, event)
    // - Send to CloudWatch: cloudwatch.putLogEvents(event)
    // - Send to custom SIEM system
  } else {
    // Development: Console logging
    logger.warn(`[SECURITY] ${type}`, event)
  }
}

/**
 * Get severity level for security event type
 */
function getSeverity(type: SecurityEventType): 'critical' | 'high' | 'medium' | 'low' {
  switch (type) {
    case 'sql_injection_attempt':
    case 'rls_bypass_attempt':
      return 'critical'

    case 'csrf_violation':
    case 'unauthorized_access':
      return 'high'

    case 'xss_attempt':
    case 'rate_limit_exceeded':
      return 'medium'

    case 'invalid_input':
    case 'suspicious_activity':
      return 'low'

    default:
      return 'medium'
  }
}

/**
 * Create security alert for critical events
 * Sends notifications to security team
 */
export function createSecurityAlert(
  type: SecurityEventType,
  context: SecurityEventContext
): void {
  const severity = getSeverity(type)

  if (severity === 'critical' || severity === 'high') {
    logSecurityEvent(type, {
      ...context,
      alert: true,
      severity,
    })

    // Future: Send alerts via:
    // - Email to security team
    // - Slack/Discord webhook
    // - PagerDuty for critical events
    // - SMS for urgent incidents
  }
}

/**
 * Structured error logging with security context
 */
export function logSecurityError(
  error: Error,
  context: SecurityEventContext = {}
): void {
  logger.error('[SECURITY ERROR]', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  })
}
