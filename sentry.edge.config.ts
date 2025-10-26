/**
 * Sentry Edge Configuration
 *
 * This configuration is used for Edge runtime error tracking and performance monitoring.
 * Runs in Edge runtime (Vercel Edge Functions, Middleware).
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
const IS_PRODUCTION = ENVIRONMENT === 'production'

Sentry.init({
  // Sentry DSN
  dsn: SENTRY_DSN,

  // Environment
  environment: ENVIRONMENT,

  // Lower sample rate for edge functions (they run more frequently)
  tracesSampleRate: IS_PRODUCTION ? 0.05 : 1.0,

  // Ignore certain errors
  ignoreErrors: [
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],

  // Enable debug mode in development
  debug: ENVIRONMENT === 'development',
})
