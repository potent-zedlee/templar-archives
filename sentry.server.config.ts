/**
 * Sentry Server Configuration
 *
 * This configuration is used for server-side error tracking and performance monitoring.
 * Runs in Node.js runtime.
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
const IS_PRODUCTION = ENVIRONMENT === 'production'
const RELEASE = process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version

Sentry.init({
  // Sentry DSN (Data Source Name)
  dsn: SENTRY_DSN,

  // Environment
  environment: ENVIRONMENT,

  // Release version (Git commit SHA from Vercel or package version)
  release: RELEASE,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

  // Performance monitoring for database queries
  integrations: [
    Sentry.prismaIntegration(),
    // Add custom integrations here
  ],

  // Ignore certain errors
  ignoreErrors: [
    // Supabase auth errors (handled gracefully in app)
    'AuthApiError',
    'AuthRetryableFetchError',
    // Next.js build errors
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],

  // Filter out events
  beforeSend(event, hint) {
    // Don't send events in development
    if (!IS_PRODUCTION && ENVIRONMENT === 'development') {
      console.log('Sentry Event (not sent in development):', event)
      return null
    }

    // Add server context
    if (event.contexts) {
      event.contexts.runtime = {
        name: 'node',
        version: process.version,
      }
    }

    return event
  },

  // Enable debug mode in development
  debug: ENVIRONMENT === 'development',
})
