import Link from "next/link"

export function HeaderLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
      <div className="flex h-10 w-10 items-center justify-center bg-gradient-to-br from-gold-400 to-gold-600 border-2 border-gold-700 group-hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all">
        <span className="font-mono text-xl font-black text-black-0">TA</span>
      </div>
      <span className="text-xl font-black uppercase tracking-wider text-gold-400">Templar Archives Index</span>
    </Link>
  )
}
