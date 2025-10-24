import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container max-w-6xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-8 space-y-4">
          <Skeleton className="h-10 w-[200px]" />
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-[120px]" />
          </div>
        </div>

        {/* Filter Panel */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-[120px]" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Results Table */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-[60%]" />
                    <Skeleton className="h-4 w-[40%]" />
                  </div>
                  <Skeleton className="h-8 w-[80px]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
