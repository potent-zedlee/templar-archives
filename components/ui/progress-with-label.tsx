"use client"

import { Progress } from "./progress"
import { cn } from "@/lib/utils"

interface ProgressWithLabelProps {
  value: number
  label?: string
  showPercentage?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  variant?: "default" | "success" | "warning" | "error"
}

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
}

const variantClasses = {
  default: "",
  success: "[&>*]:bg-green-500",
  warning: "[&>*]:bg-yellow-500",
  error: "[&>*]:bg-red-500",
}

/**
 * 라벨과 퍼센티지가 표시되는 Progress Bar
 *
 * 사용법:
 * ```tsx
 * <ProgressWithLabel
 *   value={75}
 *   label="업로드 진행률"
 *   showPercentage
 *   variant="success"
 * />
 * ```
 */
export function ProgressWithLabel({
  value,
  label,
  showPercentage = true,
  size = "md",
  className,
  variant = "default",
}: ProgressWithLabelProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && (
            <span className="text-muted-foreground" role="status" aria-live="polite">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="font-medium tabular-nums">
              {Math.round(value)}%
            </span>
          )}
        </div>
      )}
      <Progress
        value={value}
        className={cn(sizeClasses[size], variantClasses[variant])}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}

/**
 * 여러 단계를 보여주는 Progress Bar
 */
export function SteppedProgress({
  currentStep,
  totalSteps,
  steps,
  className,
}: {
  currentStep: number
  totalSteps: number
  steps?: string[]
  className?: string
}) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {steps && steps[currentStep - 1] ? steps[currentStep - 1] : `Step ${currentStep}`}
        </span>
        <span className="font-medium">
          {currentStep} / {totalSteps}
        </span>
      </div>
      <Progress value={progress} />
      {steps && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {steps.map((step, index) => (
            <span
              key={index}
              className={cn(
                "transition-colors",
                index < currentStep && "text-primary font-medium"
              )}
            >
              {index + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
