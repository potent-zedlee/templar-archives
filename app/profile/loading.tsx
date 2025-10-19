import { Header } from "@/components/header"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <div className="container max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-[100px]" />
                  <Skeleton className="h-9 w-[100px]" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 text-center">
                <Skeleton className="h-8 w-[60px] mx-auto mb-2" />
                <Skeleton className="h-4 w-[80px] mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[120px]" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b pb-3 last:border-0">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-[70%]" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
