"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLiveReportsQuery } from "@/lib/queries/live-reports-queries"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { Radio, Calendar, User } from "lucide-react"

const LIVE_CATEGORIES = ['All', 'Tournament Update', 'Chip Counts', 'Breaking News', 'Results', 'Other'] as const

export default function LiveReportingPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const { data: allReports = [], isLoading } = useLiveReportsQuery(
    selectedCategory !== 'All' ? { category: selectedCategory } : undefined
  )

  const handleReportClick = (reportId: string) => {
    router.push(`/live-reporting/${reportId}`)
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <main className="container max-w-7xl mx-auto py-8 px-4" id="main-content">
        <div className="mb-6">
          <h1 className="text-title-lg mb-2 flex items-center gap-2">
            <Radio className="h-8 w-8 text-primary animate-pulse" />
            Live Reporting
          </h1>
          <p className="text-body text-muted-foreground">
            Real-time tournament updates, chip counts, and latest results
          </p>
        </div>

        {/* Category Filter */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList>
            {LIVE_CATEGORIES.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Reports List */}
        {isLoading ? (
          <CardSkeleton count={3} />
        ) : allReports.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Radio className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div>
                <h2 className="text-title-md mb-2">No reports yet</h2>
                <p className="text-body text-muted-foreground max-w-md">
                  {selectedCategory === 'All'
                    ? 'There are no published live reports at this time.'
                    : `No reports in the "${selectedCategory}" category.`}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6">
            {allReports.map((report) => (
              <Card
                key={report.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleReportClick(report.id)}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail */}
                  {report.thumbnail_url && (
                    <div className="md:w-80 h-48 md:h-auto flex-shrink-0">
                      <img
                        src={report.thumbnail_url}
                        alt={report.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold mb-2 hover:text-primary transition-colors">
                          {report.title}
                        </h2>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{report.category}</Badge>
                          <Badge variant="secondary" className="bg-red-500/10 text-red-500">
                            LIVE
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {report.content.substring(0, 200)}...
                    </p>

                    {/* Tags */}
                    {report.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {report.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{report.author?.nickname || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {report.published_at
                            ? new Date(report.published_at).toLocaleDateString('ko-KR')
                            : new Date(report.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>

                    {/* External Link */}
                    {report.external_link && (
                      <div className="mt-3 pt-3 border-t">
                        <a
                          href={report.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Source: {new URL(report.external_link).hostname}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
