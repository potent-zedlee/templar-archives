/**
 * Cloud Tasks 클라이언트 - 세그먼트 분석 작업 큐잉
 */

import { CloudTasksClient } from '@google-cloud/tasks'
import type { ProcessSegmentRequest, FinalizeRequest } from './types'

const client = new CloudTasksClient()

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT!
const LOCATION = process.env.CLOUD_TASKS_LOCATION || 'asia-northeast3'
const QUEUE_NAME = process.env.CLOUD_TASKS_QUEUE || 'video-analysis-queue'

const SEGMENT_ANALYZER_URL = process.env.SEGMENT_ANALYZER_URL!
const COMPLETION_HANDLER_URL = process.env.COMPLETION_HANDLER_URL!

/**
 * Cloud Tasks 큐 경로 생성
 */
function getQueuePath(): string {
  return client.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME)
}

/**
 * 세그먼트 분석 작업 큐잉
 */
export async function enqueueSegmentAnalysis(
  request: ProcessSegmentRequest,
  delaySeconds?: number
): Promise<string> {
  const queuePath = getQueuePath()

  const task: {
    httpRequest: {
      httpMethod: 'POST'
      url: string
      headers: { 'Content-Type': string }
      body: string
      oidcToken?: { serviceAccountEmail: string }
    }
    scheduleTime?: { seconds: number }
  } = {
    httpRequest: {
      httpMethod: 'POST',
      url: `${SEGMENT_ANALYZER_URL}/analyze-segment`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify(request)).toString('base64'),
    },
  }

  // OIDC 인증 (Cloud Run 서비스 간 호출)
  if (process.env.SERVICE_ACCOUNT_EMAIL) {
    task.httpRequest.oidcToken = {
      serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL,
    }
  }

  // 지연 실행
  if (delaySeconds) {
    task.scheduleTime = {
      seconds: Math.floor(Date.now() / 1000) + delaySeconds,
    }
  }

  const [response] = await client.createTask({
    parent: queuePath,
    task,
  })

  console.log(`[CloudTasks] Created task: ${response.name}`)
  return response.name!
}

/**
 * 완료 핸들러 호출 큐잉
 */
export async function enqueueFinalization(
  request: FinalizeRequest,
  delaySeconds: number = 5
): Promise<string> {
  const queuePath = getQueuePath()

  const task: {
    httpRequest: {
      httpMethod: 'POST'
      url: string
      headers: { 'Content-Type': string }
      body: string
      oidcToken?: { serviceAccountEmail: string }
    }
    scheduleTime: { seconds: number }
  } = {
    httpRequest: {
      httpMethod: 'POST',
      url: `${COMPLETION_HANDLER_URL}/finalize`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify(request)).toString('base64'),
    },
    scheduleTime: {
      seconds: Math.floor(Date.now() / 1000) + delaySeconds,
    },
  }

  if (process.env.SERVICE_ACCOUNT_EMAIL) {
    task.httpRequest.oidcToken = {
      serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL,
    }
  }

  const [response] = await client.createTask({
    parent: queuePath,
    task,
  })

  console.log(`[CloudTasks] Created finalization task: ${response.name}`)
  return response.name!
}

/**
 * 여러 세그먼트 일괄 큐잉
 */
export async function enqueueAllSegments(
  jobId: string,
  streamId: string,
  gcsUri: string,
  segments: { start: number; end: number }[],
  platform: 'ept' | 'triton' | 'wsop'
): Promise<string[]> {
  const taskNames: string[] = []

  for (let i = 0; i < segments.length; i++) {
    const request: ProcessSegmentRequest = {
      jobId,
      streamId,
      segmentIndex: i,
      gcsUri,
      segment: segments[i],
      platform,
    }

    // 세그먼트 간 약간의 지연으로 동시 실행 제어
    const taskName = await enqueueSegmentAnalysis(request, i * 2)
    taskNames.push(taskName)
  }

  console.log(`[CloudTasks] Enqueued ${taskNames.length} segment analysis tasks`)
  return taskNames
}
