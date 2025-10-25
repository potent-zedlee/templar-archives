/**
 * Production-safe logger
 * Only logs in development mode or when DEBUG env var is set
 */

const isDev = process.env.NODE_ENV === 'development'
const isDebugEnabled = process.env.DEBUG === 'true'

export const logger = {
  debug: (...args: any[]) => {
    if (isDev || isDebugEnabled) {
      console.log('[DEBUG]', ...args)
    }
  },

  info: (...args: any[]) => {
    if (isDev || isDebugEnabled) {
      console.info('[INFO]', ...args)
    }
  },

  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },

  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  }
}
