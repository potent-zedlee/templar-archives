/**
 * Sentry Client Configuration
 *
 * This configuration is used for client-side error tracking and performance monitoring.
 * Runs in the browser.
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
const IS_PRODUCTION = ENVIRONMENT === 'production'

Sentry.init({
  // Sentry DSN (Data Source Name) - Get this from your Sentry project settings
  dsn: SENTRY_DSN,

  // Environment (development, staging, production)
  environment: ENVIRONMENT,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 0,
  replaysOnErrorSampleRate: IS_PRODUCTION ? 1.0 : 0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional SDK configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration({
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/templar-archives\.vercel\.app/,
      ],
    }),
  ],

  // Ignore certain errors
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    // ResizeObserver loop limit exceeded (benign)
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
  ],

  // Filter out events that are not useful
  beforeSend(event, hint) {
    // Don't send events in development
    if (!IS_PRODUCTION && ENVIRONMENT === 'development') {
      console.log('Sentry Event (not sent in development):', event)
      return null
    }

    // Filter out events from browser extensions
    if (event.request?.url) {
      const url = event.request.url
      if (url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
        return null
      }
    }

    return event
  },

  // Enable debug mode in development
  debug: ENVIRONMENT === 'development',
})
