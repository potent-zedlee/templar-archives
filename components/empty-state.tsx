"use client"

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'inline'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <div className="text-center py-12">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-title mb-2">{title}</h3>
        {description && (
          <p className="text-body text-muted-foreground mb-6">{description}</p>
        )}
        {action && (
          <Button onClick={action.onClick}>{action.label}</Button>
        )}
      </div>
    )
  }

  return (
    <Card className="p-8 text-center">
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-title-lg mb-2">{title}</h3>
      {description && (
        <p className="text-body text-muted-foreground mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </Card>
  )
}
