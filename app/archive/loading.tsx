import { Header } from "@/components/header"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Archive Loading State
 *
 * Next.js 15 Suspense boundary를 활용한 로딩 상태
 * - 좌측 패널: 토너먼트 트리 스켈레톤
 * - 우측 패널: 영상 플레이어 + 핸드 목록 스켈레톤
 */
export default function ArchiveLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* Toolbar Skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-[200px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>

        {/* Main Content */}
        <ResizablePanelGroup direction="horizontal" className="gap-6">
          {/* Left Panel: Tournament Tree */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <Card className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-[150px]" />
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Tournament Items */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                    {/* Sub-items (nested) */}
                    {i < 2 && (
                      <div className="ml-6 space-y-2">
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[80%]" />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel: Video Player + Hand History */}
          <ResizablePanel defaultSize={75} minSize={60}>
            <div className="space-y-6">
              {/* Video Player Skeleton */}
              <Card>
                <CardContent className="p-0">
                  <Skeleton className="h-[400px] w-full rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-6 w-[250px]" />
                    <Skeleton className="h-4 w-[180px]" />
                  </div>
                </CardContent>
              </Card>

              {/* Hand History Skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-[150px]" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Hand Accordion Items */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-[200px]" />
                        <Skeleton className="h-5 w-[80px]" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-[60px]" />
                        <Skeleton className="h-4 w-[60px]" />
                        <Skeleton className="h-4 w-[60px]" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
