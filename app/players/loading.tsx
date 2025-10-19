import { Header } from "@/components/header"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Players Loading State
 *
 * 플레이어 목록 페이지 로딩 상태
 * - 검색 바 스켈레톤
 * - 그리드 형식 플레이어 카드 스켈레톤 (8개)
 */
export default function PlayersLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <div className="container max-w-6xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* Page Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>

          {/* Search & Filter */}
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  {/* Avatar */}
                  <Skeleton className="h-20 w-20 rounded-full" />

                  {/* Name */}
                  <Skeleton className="h-6 w-[120px]" />

                  {/* Country */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-6" />
                    <Skeleton className="h-4 w-[80px]" />
                  </div>

                  {/* Stats */}
                  <div className="w-full pt-2 space-y-2 border-t">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-[60px]" />
                      <Skeleton className="h-3 w-[40px]" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-[60px]" />
                      <Skeleton className="h-3 w-[50px]" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    </div>
  )
}
