"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export interface NavLink {
  href?: string
  label: string
  subItems?: { href: string; label: string }[]
}

interface HeaderDesktopNavProps {
  navLinks: NavLink[]
}

export function HeaderDesktopNav({ navLinks }: HeaderDesktopNavProps) {
  const pathname = usePathname()
  const [archiveExpanded, setArchiveExpanded] = useState(false)

  return (
    <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="Main navigation">
      {navLinks.map((link, index) => {
        // Check if this link has subItems (expandable)
        if ('subItems' in link && link.subItems) {
          const isActive = pathname.startsWith("/archive") ||
                         pathname.startsWith("/search")

          return (
            <div
              key={index}
              className="relative flex items-center"
              onMouseEnter={() => setArchiveExpanded(true)}
              onMouseLeave={() => setArchiveExpanded(false)}
            >
              <div className={cn(
                "text-sm font-medium transition-colors hover:text-foreground relative inline-flex items-center gap-1 cursor-pointer",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>
                {link.label}
                <ChevronRight className={cn(
                  "h-3 w-3 transition-transform duration-300",
                  archiveExpanded && "rotate-90"
                )} />
                {isActive && (
                  <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-primary" />
                )}
              </div>

              <AnimatePresence>
                {archiveExpanded && (
                  <motion.div
                    initial={{ opacity: 0, width: 0, x: -10 }}
                    animate={{ opacity: 1, width: "auto", x: 0 }}
                    exit={{ opacity: 0, width: 0, x: -10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="ml-2 flex items-center gap-3 bg-background/95 backdrop-blur-sm border border-border/40 rounded-md shadow-lg px-4 py-2 whitespace-nowrap"
                  >
                    {link.subItems.map((subItem) => {
                      const subIsActive = pathname === subItem.href ||
                                        pathname.startsWith(subItem.href)
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={cn(
                            "text-sm font-medium transition-colors hover:text-foreground",
                            subIsActive
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {subItem.label}
                        </Link>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }

        // Regular link
        const isActive = pathname === link.href || (pathname !== "/" && pathname.startsWith(link.href!))

        return (
          <Link
            key={link.href}
            href={link.href!}
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground relative",
              isActive
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            {link.label}
            {isActive && (
              <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-primary" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
