/**
 * Video Analysis Orchestrator Service
 *
 * 분석 요청을 받아 세그먼트로 분할하고 Cloud Tasks에 큐잉
 */

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { analyzeHandler } from './handlers/analyze'
import { statusHandler } from './handlers/status'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors())

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'video-orchestrator' }))
app.get('/health', (c) => c.json({ status: 'healthy' }))

// API Routes
app.post('/analyze', analyzeHandler)
app.get('/status/:jobId', statusHandler)

// Error handling
app.onError((err, c) => {
  console.error('[Orchestrator] Error:', err)
  return c.json(
    { error: err.message || 'Internal server error' },
    500
  )
})

// Start server
const port = parseInt(process.env.PORT || '8080')

console.log(`[Orchestrator] Starting server on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
