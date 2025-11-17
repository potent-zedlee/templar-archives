'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 리플 효과 훅
 * 클릭 시 금색 리플이 확산되는 효과
 */
export function useRipple() {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const addRipple = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const id = Date.now()

    setRipples((prev) => [...prev, { x, y, id }])

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id))
    }, 600)
  }

  return { ripples, addRipple }
}

/**
 * 자기장 커서 효과 훅
 * 마우스가 버튼에 접근하면 자석처럼 끌리는 효과
 * 키보드 포커스 시에는 비활성화됨 (접근성)
 */
export function useMagneticCursor(strength = 0.3) {
  const ref = useRef<HTMLElement>(null)
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // 키보드 포커스 감지 - 자기장 효과 비활성화
    const handleFocus = () => {
      element.style.transform = 'translate(0, 0)'
      setIsHovering(false)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = e.clientX - centerX
      const deltaY = e.clientY - centerY

      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2)
      const maxDistance = Math.max(rect.width, rect.height)

      if (distance < maxDistance * 1.5) {
        const translateX = deltaX * strength
        const translateY = deltaY * strength
        element.style.transform = `translate(${translateX}px, ${translateY}px)`
        setIsHovering(true)
      } else {
        element.style.transform = 'translate(0, 0)'
        setIsHovering(false)
      }
    }

    const handleMouseLeave = () => {
      element.style.transform = 'translate(0, 0)'
      setIsHovering(false)
    }

    element.addEventListener('focus', handleFocus)
    document.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('focus', handleFocus)
      document.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [strength])

  return { ref, isHovering }
}

/**
 * 3D 틸트 효과 훅
 * 마우스 위치에 따라 카드가 3D로 기울어지는 효과
 */
export function use3DTilt(maxTilt = 10) {
  const ref = useRef<HTMLElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const tiltX = ((y - centerY) / centerY) * maxTilt
      const tiltY = ((centerX - x) / centerX) * maxTilt

      setTilt({ x: tiltX, y: tiltY })
      element.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
    }

    const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 })
      element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
    }

    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [maxTilt])

  return { ref, tilt }
}

/**
 * 시차 스크롤 효과 훅
 * 스크롤에 따라 요소가 다른 속도로 움직이는 효과
 */
export function useParallax(speed = 0.5) {
  const ref = useRef<HTMLElement>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleScroll = () => {
      const rect = element.getBoundingClientRect()
      const scrolled = window.scrollY
      const elementTop = rect.top + scrolled
      const offset = (scrolled - elementTop) * speed

      setOffset(offset)
      element.style.transform = `translateY(${offset}px)`
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  return { ref, offset }
}

/**
 * 스태거 애니메이션 헬퍼
 * 리스트 아이템이 순차적으로 나타나는 효과
 */
export function getStaggerDelay(index: number, baseDelay = 50) {
  return index * baseDelay
}

/**
 * 글로우 펄스 커스텀 훅
 * 특정 조건에서 글로우 펄스 활성화
 */
export function useGlowPulse(condition: boolean) {
  const [isGlowing, setIsGlowing] = useState(false)

  useEffect(() => {
    setIsGlowing(condition)
  }, [condition])

  return isGlowing
}
