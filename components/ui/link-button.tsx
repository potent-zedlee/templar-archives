"use client"

import Link from "next/link"
import { buttonVariants } from "./button"
import { type VariantProps } from "class-variance-authority"
import * as React from "react"

interface LinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {
  href: string
}

export function LinkButton({
  href,
  variant,
  size,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {children}
    </Link>
  )
}
