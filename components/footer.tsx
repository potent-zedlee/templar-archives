import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const navigationLinks = [
    { href: "/about", label: "About" },
    { href: "/search", label: "Search" },
    { href: "/archive", label: "Archive" },
    { href: "/players", label: "Players" },
    { href: "/community", label: "Forum" },
  ]

  const legalLinks = [
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/cookies", label: "Cookie Policy" },
    { href: "/legal/dmca", label: "DMCA Policy" },
    { href: "/legal/affiliate", label: "Affiliate Disclosure" },
  ]

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
                <span className="font-mono text-lg font-bold text-primary-foreground">TA</span>
              </div>
              <span className="text-lg font-bold">Templar Archives</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              The ultimate poker hand history archive. Analyze, learn, and improve your game.
            </p>
            <p className="text-xs text-muted-foreground">
              © {currentYear} Templar Archives. All rights reserved.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              {navigationLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/anthropics/claude-code"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link
                  href="/legal/dmca"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Report Copyright
                </Link>
              </li>
              <li>
                <a
                  href="mailto:legal@templararchives.com"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Legal
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Open Source Credits */}
        <div className="mt-12 pt-8 border-t border-border/40">
          <p className="text-xs text-muted-foreground text-center">
            Built with{" "}
            <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Next.js
            </a>
            {", "}
            <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              React
            </a>
            {", "}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Supabase
            </a>
            {", and "}
            <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              shadcn/ui
            </a>
            . Powered by{" "}
            <a href="https://anthropic.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Claude AI
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
