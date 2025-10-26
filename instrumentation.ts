/**
 * Next.js Instrumentation
 *
 * This file is used to initialize Sentry and other monitoring tools.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run instrumentation in Node.js runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import and initialize Sentry for server-side
    await import('./sentry.server.config')
  }

  // Import and initialize Sentry for Edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
