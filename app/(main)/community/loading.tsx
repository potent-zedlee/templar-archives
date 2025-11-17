import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Community Loading State
 *
 * 커뮤니티 페이지 로딩 상태
 * - 탭 네비게이션 스켈레톤
 * - 포스트 카드 스켈레톤 (3개)
 */
export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* Page Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-[200px] rounded-lg" />
            <Skeleton className="h-10 w-[140px] rounded-lg" />
          </div>

          {/* Tabs Skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[100px] rounded-lg" />
            <Skeleton className="h-10 w-[100px] rounded-lg" />
            <Skeleton className="h-10 w-[100px] rounded-lg" />
          </div>

          {/* Search Bar */}
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        {/* Post Cards */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow rounded-lg border-gray-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    {/* Author Info */}
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-[120px] rounded" />
                      <Skeleton className="h-4 w-[80px] rounded" />
                    </div>

                    {/* Title */}
                    <Skeleton className="h-6 w-[90%] rounded" />
                  </div>

                  {/* Category Badge */}
                  <Skeleton className="h-6 w-[80px] rounded-full" />
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Content */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-[95%] rounded" />
                  <Skeleton className="h-4 w-[85%] rounded" />
                </div>

                {/* Attached Hand (optional) */}
                {i === 0 && (
                  <div className="border rounded-lg p-3 border-gray-200">
                    <Skeleton className="h-4 w-[150px] mb-2 rounded" />
                    <Skeleton className="h-3 w-[200px] rounded" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-[30px] rounded" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-[30px] rounded" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-[30px] rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
