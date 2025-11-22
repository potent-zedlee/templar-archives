"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * AnimatedCard Component
 *
 * 호버 및 탭 시 부드러운 애니메이션 효과가 있는 카드
 * - Hover: 살짝 확대 + 그림자 증가
 * - Tap: 살짝 축소 (피드백)
 */

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  href?: string
  hoverScale?: number
  tapScale?: number
}

export function AnimatedCard({
  children,
  className,
  onClick,
  href,
  hoverScale = 1.02,
  tapScale = 0.98,
}: AnimatedCardProps) {
  const Component = href ? motion.a : motion.div

  return (
    <Component
      {...(href ? { href } : {})}
      onClick={onClick}
      whileHover={{ scale: hoverScale, y: -2 }}
      whileTap={{ scale: tapScale }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 17,
      }}
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-lg",
        className
      )}
    >
      {children}
    </Component>
  )
}

/**
 * AnimatedButton Component
 *
 * 향상된 버튼 피드백
 * - Hover: 배경색 변화 + 살짝 확대
 * - Tap: 살짝 축소
 * - Loading: 회전 애니메이션
 */

interface AnimatedButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  className?: string
  type?: "button" | "submit" | "reset"
}

export function AnimatedButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = "default",
  size = "md",
  className,
  type = "button",
}: AnimatedButtonProps) {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  }

  const sizeClasses = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 py-2",
    lg: "h-11 px-8 text-lg",
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 17,
      }}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
        />
      ) : null}
      {children}
    </motion.button>
  )
}

/**
 * AnimatedIconButton Component
 *
 * 아이콘 전용 버튼 (좋아요, 북마크 등)
 * - Hover: 회전 + 색상 변화
 * - Tap: 펄스 효과
 */

interface AnimatedIconButtonProps {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  className?: string
  activeColor?: string
}

export function AnimatedIconButton({
  children,
  onClick,
  active = false,
  disabled = false,
  className,
  activeColor = "text-red-500",
}: AnimatedIconButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      animate={{
        scale: active ? [1, 1.2, 1] : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 17,
      }}
      className={cn(
        "p-2 rounded-full transition-colors hover:bg-accent",
        active ? activeColor : "text-muted-foreground",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </motion.button>
  )
}
