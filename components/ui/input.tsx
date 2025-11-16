import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-text-muted selection:bg-gold-500 selection:text-black-0',
        'flex h-11 w-full min-w-0 border-2 border-gold-600 bg-black-100 text-text-secondary px-4 py-2',
        'text-base outline-none transition-all duration-200',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus:border-gold-400 focus:shadow-[0_0_20px_rgba(212,175,55,0.2)]',
        'aria-invalid:border-destructive aria-invalid:shadow-[0_0_20px_rgba(229,62,62,0.2)]',
        'md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
