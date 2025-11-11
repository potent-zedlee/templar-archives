"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header/Header"
import { cn } from "@/lib/utils"
import { FileText, Shield, Cookie, Flag, DollarSign } from "lucide-react"

const legalPages = [
  { href: "/legal/terms", label: "Terms of Service", icon: FileText },
  { href: "/legal/privacy", label: "Privacy Policy", icon: Shield },
  { href: "/legal/cookies", label: "Cookie Policy", icon: Cookie },
  { href: "/legal/dmca", label: "DMCA Policy", icon: Flag },
  { href: "/legal/affiliate", label: "Affiliate Disclosure", icon: DollarSign },
]

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="md:col-span-1">
            <div className="sticky top-24">
              <h2 className="text-lg font-bold mb-4">Legal Documents</h2>
              <nav className="space-y-1">
                {legalPages.map((page) => {
                  const Icon = page.icon
                  const isActive = pathname === page.href

                  return (
                    <Link
                      key={page.href}
                      href={page.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {page.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="md:col-span-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
