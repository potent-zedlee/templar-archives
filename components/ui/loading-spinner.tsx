"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  label?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
}

/**
 * 로딩 스피너 컴포넌트
 *
 * 사용법:
 * ```tsx
 * <LoadingSpinner size="md" label="로딩 중..." />
 * ```
 */
export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
      {label && (
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {label}
        </p>
      )}
    </div>
  )
}

/**
 * 페이지 전체를 덮는 로딩 스피너
 */
export function PageLoadingSpinner({ label = "로딩 중..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" label={label} />
    </div>
  )
}

/**
 * 인라인 로딩 스피너 (버튼, 카드 내부용)
 */
export function InlineLoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  )
}
