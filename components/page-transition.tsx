"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ReactNode } from "react"

/**
 * PageTransition Component
 *
 * 페이지 전환 시 부드러운 애니메이션 효과 제공
 * - Fade in/out 효과
 * - Slide up 효과
 * - 커스터마이징 가능한 duration 및 delay
 */

interface PageTransitionProps {
  children: ReactNode
  variant?: "fade" | "slideUp" | "slideDown" | "scale"
  duration?: number
  delay?: number
  className?: string
}

const variants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
}

export function PageTransition({
  children,
  variant = "fade",
  duration = 0.3,
  delay = 0,
  className,
}: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants[variant]}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1], // Custom easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * StaggerContainer Component
 *
 * 자식 요소들을 순차적으로 나타나게 하는 컨테이너
 */

interface StaggerContainerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
}

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * StaggerItem Component
 *
 * StaggerContainer의 자식으로 사용
 */

interface StaggerItemProps {
  children: ReactNode
  variant?: "fade" | "slideUp"
  className?: string
}

export function StaggerItem({
  children,
  variant = "slideUp",
  className,
}: StaggerItemProps) {
  const itemVariants = {
    initial: variant === "fade" ? { opacity: 0 } : { opacity: 0, y: 20 },
    animate: variant === "fade" ? { opacity: 1 } : { opacity: 1, y: 0 },
  }

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}
