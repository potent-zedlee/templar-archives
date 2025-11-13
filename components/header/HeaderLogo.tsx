import Link from "next/link"

export function HeaderLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
        <span className="font-mono text-lg font-bold text-primary-foreground">TA</span>
      </div>
      <span className="text-xl font-bold text-foreground">Templar Archives Index</span>
    </Link>
  )
}
