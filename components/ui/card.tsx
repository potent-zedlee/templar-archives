import * as React from 'react'

import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'premium' | 'highlighted'

interface CardProps extends React.ComponentProps<'div'> {
  variant?: CardVariant
}

function Card({ className, variant = 'default', ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-black-100 text-card-foreground flex flex-col gap-6 border-2 border-gold-600 py-6 relative transition-all duration-200',
        'shadow-[4px_4px_0_var(--black-0),8px_8px_0_var(--gold-700)]',
        'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_var(--black-0),12px_12px_0_var(--gold-700)]',
        // Variant styles
        variant === 'premium' && 'shadow-ambient-gold hover:shadow-ambient-gold-hover',
        variant === 'highlighted' && 'luxury-glow-pulse border-gold-400',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      {...props}
    />
  )
}

interface CardTitleProps extends React.ComponentProps<'div'> {
  gradient?: boolean
}

function CardTitle({ className, gradient = false, ...props }: CardTitleProps) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'leading-none font-bold uppercase tracking-wide',
        gradient ? 'luxury-gradient text-2xl' : 'text-gold-400',
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-text-muted text-sm font-medium', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-6', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
