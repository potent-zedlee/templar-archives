import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-gold-600 hover:bg-gold-700 text-white focus:ring-gold-300 shadow-sm hover:shadow-md',
        primary: 'bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-700 hover:to-gold-800 text-white focus:ring-gold-300 shadow-sm hover:shadow-md',
        secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-100 focus:ring-gray-700 shadow-sm hover:shadow-md',
        outline: 'border border-gray-600 bg-transparent hover:bg-gray-800 text-gray-300 focus:ring-gray-700',
        ghost: 'bg-transparent hover:bg-gray-800 text-gray-300 focus:ring-gray-700',
        destructive: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-300 shadow-sm hover:shadow-md',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-lg',
        md: 'h-10 px-4 text-base rounded-lg',
        lg: 'h-12 px-6 text-lg rounded-lg',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
