"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLiveReportDetailQuery } from "@/lib/queries/live-reports-queries"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { Calendar, User, ExternalLink, ArrowLeft, Radio } from "lucide-react"
import ReactMarkdown from "react-markdown"

export default function LiveReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { data: report, isLoading, error } = useLiveReportDetailQuery(resolvedParams.id)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <CardSkeleton count={1} />
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Card className="p-12 text-center">
            <h2 className="text-title-md mb-2">Report not found</h2>
            <p className="text-body text-muted-foreground mb-4">
              The live report you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/live-reporting')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Live Reporting
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/live-reporting')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Live Reporting
        </Button>

        <Card className="overflow-hidden">
          {/* Thumbnail */}
          {report.thumbnail_url && (
            <div className="w-full h-96">
              <img
                src={report.thumbnail_url}
                alt={report.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Title & Category */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{report.category}</Badge>
                <Badge variant="secondary" className="bg-red-500/10 text-red-500 flex items-center gap-1">
                  <Radio className="h-3 w-3 animate-pulse" />
                  LIVE
                </Badge>
              </div>
              <h1 className="text-3xl font-bold mb-4">{report.title}</h1>

              {/* Meta Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{report.author?.nickname || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {report.published_at
                      ? new Date(report.published_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : new Date(report.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                  </span>
                </div>
                {report.approver && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Approved by: {report.approver.nickname}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {report.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {report.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Markdown Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none mb-6">
              <ReactMarkdown>{report.content}</ReactMarkdown>
            </div>

            {/* External Link */}
            {report.external_link && (
              <div className="pt-6 border-t">
                <a
                  href={report.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-500 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Original Source
                </a>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  )
}
