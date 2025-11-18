import Link from "next/link"
import Image from "next/image"

export function HeaderLogo() {
  return (
    <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
      <Image
        src="/logo.svg"
        alt="Templar Archives Index"
        width={200}
        height={40}
        priority
        className="h-10 w-auto"
      />
    </Link>
  )
}
