/**
 * Position Badge Component
 *
 * 플레이어 포지션을 표시하는 배지 컴포넌트
 */

import { cn } from "@/lib/utils"

type PositionBadgeProps = {
  position: string
  className?: string
}

export function PositionBadge({ position, className }: PositionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "px-2 py-1 rounded",
        "bg-green-700 text-white",
        "text-xs font-semibold",
        "min-w-[50px]",
        className
      )}
    >
      {position}
    </span>
  )
}
