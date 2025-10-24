import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function BookmarksLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-5xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8 space-y-4">
          <Skeleton className="h-10 w-[180px]" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[80px]" />
            <Skeleton className="h-10 w-[100px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-[50%]" />
                    <Skeleton className="h-4 w-[70%]" />
                    <Skeleton className="h-3 w-[40%]" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
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
