"use client"

import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Newspaper } from "lucide-react"

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <main className="container max-w-7xl mx-auto py-8 px-4" id="main-content">
        <div className="mb-8">
          <h1 className="text-title-lg mb-2">Poker News</h1>
          <p className="text-body text-muted-foreground">
            Latest poker news, updates, and announcements
          </p>
        </div>

        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Newspaper className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-title-md mb-2">Coming Soon</h2>
              <p className="text-body text-muted-foreground max-w-md">
                뉴스 시스템이 곧 추가될 예정입니다. 포커 토너먼트 소식, 업계 동향,
                그리고 커뮤니티 공지사항을 이곳에서 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
