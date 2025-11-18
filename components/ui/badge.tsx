import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gold-600 text-white [a&]:hover:bg-gold-700 focus-visible:ring-gold-500',
        secondary:
          'border-transparent bg-gray-700 text-gray-200 [a&]:hover:bg-gray-600 focus-visible:ring-gray-500',
        destructive:
          'border-transparent bg-red-600 text-white [a&]:hover:bg-red-700 focus-visible:ring-red-500',
        outline:
          'border-gray-600 text-gray-300 bg-transparent [a&]:hover:bg-gray-800 [a&]:hover:border-gray-500 focus-visible:ring-gray-500',
        warning:
          'border-transparent bg-yellow-600 text-white [a&]:hover:bg-yellow-700 focus-visible:ring-yellow-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
