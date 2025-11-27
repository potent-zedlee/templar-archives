/**
 * Cloud Run Video Analyzer Service
 *
 * GCS 영상을 Vertex AI Gemini로 분석하는 Cloud Run 서비스
 *
 * Endpoints:
 * - POST /analyze: 영상 분석 시작
 * - GET /status/:jobId: 작업 상태 조회
 * - GET /health: 헬스체크
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { analyzeRouter } from './routes/analyze.js'
import { statusRouter } from './routes/status.js'

// 환경변수 로드
dotenv.config()

const app = express()

// 미들웨어
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 요청 로깅
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// 라우터
app.use('/analyze', analyzeRouter)
app.use('/status', statusRouter)

// 헬스체크
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'video-analyzer',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// 루트 경로
app.get('/', (_req, res) => {
  res.json({
    name: 'Templar Archives Video Analyzer',
    version: '1.0.0',
    endpoints: {
      'POST /analyze': 'Start video analysis job',
      'GET /status/:jobId': 'Get job status',
      'GET /health': 'Health check',
    },
  })
})

// 404 핸들러
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// 에러 핸들러
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// 서버 시작
const PORT = parseInt(process.env.PORT || '8080', 10)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[VIDEO-ANALYZER] Server running on port ${PORT}`)
  console.log(`[VIDEO-ANALYZER] Environment: ${process.env.NODE_ENV || 'production'}`)
  console.log(`[VIDEO-ANALYZER] GCS Project: ${process.env.GCS_PROJECT_ID || 'not set'}`)
})

export default app
