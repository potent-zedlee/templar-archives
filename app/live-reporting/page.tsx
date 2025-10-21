"use client"

import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Radio } from "lucide-react"

export default function LiveReportingPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <main className="container max-w-7xl mx-auto py-8 px-4" id="main-content">
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Radio className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-title-md mb-2">Coming Soon</h2>
              <p className="text-body text-muted-foreground max-w-md">
                라이브 리포팅 시스템이 곧 추가될 예정입니다. 진행 중인 토너먼트의
                실시간 결과, 칩 카운트, 그리고 최신 업데이트를 이곳에서 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
