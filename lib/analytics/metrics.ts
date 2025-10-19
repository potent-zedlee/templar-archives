/**
 * Web Vitals Analytics Utilities
 *
 * Core Web Vitals 메트릭 측정 및 분석 유틸리티
 */

export type MetricName = 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP'

export type MetricRating = 'good' | 'needs-improvement' | 'poor'

export interface WebVitalMetric {
  name: MetricName
  value: number
  rating: MetricRating
  delta: number
  id: string
  navigationType: string
  timestamp: number
  pathname: string
}

/**
 * Web Vitals 임계값 (Google 기준)
 * https://web.dev/vitals/#core-web-vitals
 */
export const METRIC_THRESHOLDS: Record<
  MetricName,
  { good: number; needsImprovement: number }
> = {
  // Cumulative Layout Shift (낮을수록 좋음)
  CLS: { good: 0.1, needsImprovement: 0.25 },

  // First Input Delay (ms, 낮을수록 좋음)
  FID: { good: 100, needsImprovement: 300 },

  // First Contentful Paint (ms, 낮을수록 좋음)
  FCP: { good: 1800, needsImprovement: 3000 },

  // Largest Contentful Paint (ms, 낮을수록 좋음)
  LCP: { good: 2500, needsImprovement: 4000 },

  // Time to First Byte (ms, 낮을수록 좋음)
  TTFB: { good: 800, needsImprovement: 1800 },

  // Interaction to Next Paint (ms, 낮을수록 좋음)
  INP: { good: 200, needsImprovement: 500 },
}

/**
 * 메트릭 등급 계산
 */
export function getMetricRating(name: MetricName, value: number): MetricRating {
  const thresholds = METRIC_THRESHOLDS[name]

  if (value <= thresholds.good) {
    return 'good'
  } else if (value <= thresholds.needsImprovement) {
    return 'needs-improvement'
  } else {
    return 'poor'
  }
}

/**
 * 메트릭 색상 반환
 */
export function getMetricColor(rating: MetricRating): string {
  switch (rating) {
    case 'good':
      return 'hsl(var(--chart-2))' // Green
    case 'needs-improvement':
      return 'hsl(var(--chart-3))' // Yellow
    case 'poor':
      return 'hsl(var(--destructive))' // Red
  }
}

/**
 * 메트릭 아이콘 반환
 */
export function getMetricIcon(rating: MetricRating): string {
  switch (rating) {
    case 'good':
      return '✓'
    case 'needs-improvement':
      return '⚠'
    case 'poor':
      return '✗'
  }
}

/**
 * 메트릭을 localStorage에 저장
 */
const STORAGE_KEY = 'web-vitals-history'
const MAX_HISTORY_SIZE = 100

export function saveMetric(metric: WebVitalMetric): void {
  if (typeof window === 'undefined') return

  try {
    const history = getMetricHistory()
    history.push(metric)

    // 최근 100개만 유지
    if (history.length > MAX_HISTORY_SIZE) {
      history.shift()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Error saving metric:', error)
  }
}

/**
 * localStorage에서 메트릭 히스토리 가져오기
 */
export function getMetricHistory(): WebVitalMetric[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error loading metric history:', error)
    return []
  }
}

/**
 * 메트릭 히스토리 초기화
 */
export function clearMetricHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * 페이지별 평균 메트릭 계산
 */
export function getAverageMetricsByPage(): Record<
  string,
  Record<MetricName, number>
> {
  const history = getMetricHistory()
  const pageMetrics: Record<string, Record<MetricName, number[]>> = {}

  // 페이지별로 메트릭 그룹화
  history.forEach((metric) => {
    if (!pageMetrics[metric.pathname]) {
      pageMetrics[metric.pathname] = {
        CLS: [],
        FID: [],
        FCP: [],
        LCP: [],
        TTFB: [],
        INP: [],
      }
    }
    pageMetrics[metric.pathname][metric.name].push(metric.value)
  })

  // 평균 계산
  const averages: Record<string, Record<MetricName, number>> = {}
  Object.entries(pageMetrics).forEach(([pathname, metrics]) => {
    averages[pathname] = {} as Record<MetricName, number>
    Object.entries(metrics).forEach(([name, values]) => {
      if (values.length > 0) {
        averages[pathname][name as MetricName] =
          values.reduce((a, b) => a + b, 0) / values.length
      }
    })
  })

  return averages
}

/**
 * 전체 평균 메트릭 계산
 */
export function getOverallAverageMetrics(): Record<MetricName, number> {
  const history = getMetricHistory()
  const metrics: Record<MetricName, number[]> = {
    CLS: [],
    FID: [],
    FCP: [],
    LCP: [],
    TTFB: [],
    INP: [],
  }

  history.forEach((metric) => {
    metrics[metric.name].push(metric.value)
  })

  const averages: Record<MetricName, number> = {} as Record<MetricName, number>
  Object.entries(metrics).forEach(([name, values]) => {
    if (values.length > 0) {
      averages[name as MetricName] =
        values.reduce((a, b) => a + b, 0) / values.length
    }
  })

  return averages
}

/**
 * 최근 N개 메트릭 가져오기
 */
export function getRecentMetrics(count: number = 10): WebVitalMetric[] {
  const history = getMetricHistory()
  return history.slice(-count)
}
