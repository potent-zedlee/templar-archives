"use client"

/**
 * Web Vitals Analytics Component
 *
 * Next.js Web Vitals API를 사용하여 성능 메트릭을 측정하고 저장
 */

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { saveMetric, getMetricRating, type MetricName, type WebVitalMetric } from '@/lib/analytics/metrics'

// Next.js Web Vitals 타입
interface Metric {
  name: MetricName
  value: number
  delta: number
  id: string
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender'
}

export function WebVitalsReporter() {
  const pathname = usePathname()

  useEffect(() => {
    // Next.js의 reportWebVitals API를 사용하여 메트릭 수집
    if (typeof window === 'undefined') return

    const handleMetric = (metric: Metric) => {
      const webVitalMetric: WebVitalMetric = {
        name: metric.name,
        value: metric.value,
        rating: getMetricRating(metric.name, metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        timestamp: Date.now(),
        pathname: pathname || '/',
      }

      // localStorage에 저장
      saveMetric(webVitalMetric)

      // 개발 환경에서 콘솔 출력
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vitals] ${metric.name}:`, {
          value: metric.value,
          rating: webVitalMetric.rating,
          pathname: pathname,
        })
      }

      // Vercel Analytics로 전송 (이미 SpeedInsights가 처리함)
      // 추가적인 커스텀 전송이 필요하면 여기서 처리
    }

    // web-vitals 라이브러리 동적 import
    // web-vitals v4+: onFID 제거됨, onINP 사용
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(handleMetric as any)
      onFCP(handleMetric as any)
      onLCP(handleMetric as any)
      onTTFB(handleMetric as any)
      onINP(handleMetric as any)
    }).catch((error) => {
      console.error('Failed to load web-vitals:', error)
    })
  }, [pathname])

  // 렌더링하지 않음 (측정만 수행)
  return null
}
