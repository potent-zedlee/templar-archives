import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

interface GridSkeletonProps {
  count?: number
  columns?: 2 | 3 | 4
}

export function GridSkeleton({ count = 6, columns = 3 }: GridSkeletonProps) {
  const gridClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={`grid ${gridClass} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-5 w-2/3 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
            <div className="grid grid-cols-3 gap-4 w-full pt-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
