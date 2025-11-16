"use client"

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-wide transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-gold-400 to-gold-600 text-black-0 hover:shadow-[6px_6px_0_var(--black-0),10px_10px_0_var(--gold-700)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--black-0),4px_4px_0_var(--gold-700)]',
        destructive:
          'bg-destructive text-white shadow-[4px_4px_0_var(--black-0)] hover:bg-destructive/90 hover:shadow-[6px_6px_0_var(--black-0)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--black-0)]',
        outline:
          'border-2 border-gold-600 bg-black-100 text-gold-400 hover:bg-black-200 hover:shadow-[4px_4px_0_var(--black-0)] hover:translate-x-[-1px] hover:translate-y-[-1px]',
        secondary:
          'bg-black-100 text-gold-400 border-2 border-gold-600 shadow-[3px_3px_0_var(--black-0)] hover:bg-black-200 hover:shadow-[4px_4px_0_var(--black-0)] hover:translate-x-[-1px] hover:translate-y-[-1px]',
        ghost:
          'bg-transparent text-gold-400 hover:text-gold-300 hover:bg-black-100',
        link: 'text-gold-400 underline-offset-4 hover:underline hover:text-gold-300',
      },
      size: {
        default: 'h-11 px-6 py-3 has-[>svg]:px-5',
        sm: 'h-9 gap-1.5 px-4 py-2 has-[>svg]:px-3 text-xs',
        lg: 'h-13 px-8 py-4 has-[>svg]:px-6 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
