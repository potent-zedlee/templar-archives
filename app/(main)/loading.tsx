export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Skeleton */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background" />
        <div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="h-20 w-3/4 bg-muted rounded-lg animate-pulse" />
            <div className="h-6 w-1/2 bg-muted rounded-lg animate-pulse" />
            <div className="flex gap-4">
              <div className="h-12 w-48 bg-muted rounded-lg animate-pulse" />
              <div className="h-12 w-48 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Skeleton */}
      <section className="py-12 md:py-16 bg-muted">
        <div className="container max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-background border border-border rounded-lg p-8"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-full animate-pulse" />
                  <div className="h-10 w-24 bg-muted rounded-lg animate-pulse" />
                  <div className="h-4 w-32 bg-muted rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights Skeleton */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container max-w-7xl mx-auto px-4 md:px-6">
          <div className="mb-8">
            <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-muted border border-border rounded-lg overflow-hidden"
              >
                <div className="aspect-video bg-border animate-pulse" />
                <div className="p-6 space-y-4">
                  <div className="h-4 w-3/4 bg-border rounded animate-pulse" />
                  <div className="h-4 w-full bg-border rounded animate-pulse" />
                  <div className="h-10 w-full bg-border rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
