import { useState, useEffect } from 'react'

/**
 * useMediaQuery Hook
 *
 * 미디어 쿼리 상태를 추적하는 React Hook
 * SSR 호환 (서버에서는 기본값 반환)
 *
 * @param query - 미디어 쿼리 문자열 (예: '(min-width: 768px)')
 * @returns 미디어 쿼리가 일치하는지 여부
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)')
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // 클라이언트에서만 실행
    const media = window.matchMedia(query)

    // 초기값 설정
    setMatches(media.matches)

    // 리스너 추가
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Modern browsers
    media.addEventListener('change', listener)

    // Cleanup
    return () => {
      media.removeEventListener('change', listener)
    }
  }, [query])

  return matches
}

/**
 * 일반적인 breakpoint를 위한 헬퍼 훅들
 */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)')
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)')
}
