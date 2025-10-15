"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Play, Search, MessageSquare } from "lucide-react"

export function HeroSection() {
  const router = useRouter()

  const handleExplore = () => {
    // Archive 페이지로 이동
    router.push("/archive")
  }

  return (
    <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-background to-background/80">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-600/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

      <div className="container relative py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-block">
            <span className="text-caption-lg text-primary">AI 기반 포커 영상 분석</span>
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl text-balance">
            YouTube 포커 영상을{" "}
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Hand History로
            </span>
          </h1>

          <p className="mb-10 text-body-lg text-muted-foreground text-pretty">
            영상에서 자동으로 핸드를 추출하고, 체계적으로 보관하며, 지능적으로 Search하세요
          </p>

          <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={handleExplore}
                className="h-12 px-8 bg-gradient-to-r from-primary to-purple-600 text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl transition-all"
              >
                <Play className="mr-2 h-5 w-5" />
                Explore Archive
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/search")}
                className="h-12 px-8 hover:bg-muted transition-all"
              >
                <Search className="mr-2 h-5 w-5" />
                Search Hands
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/community")}
                className="h-12 px-8 hover:bg-muted transition-all"
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Join Forum
              </Button>
            </div>

            <p className="text-caption text-muted-foreground">
              10,000+ 프로 포커 핸드 | GGPoker, PokerStars 영상 분석 완료
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
