"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
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
      <div className="min-h-screen bg-black-0">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <CardSkeleton count={1} />
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-black-0">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="card-postmodern p-12 text-center">
            <h2 className="text-heading text-gold-400 mb-2">Report not found</h2>
            <p className="text-body text-white/70 mb-4">
              The live report you're looking for doesn't exist or has been removed.
            </p>
            <button className="btn-primary" onClick={() => router.push('/live-reporting')}>
              <ArrowLeft className="h-4 w-4 mr-2 inline" />
              Back to Live Reporting
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black-0">
      <main className="container max-w-4xl mx-auto py-8 px-4">
        <button
          className="btn-ghost mb-6"
          onClick={() => router.push('/live-reporting')}
        >
          <ArrowLeft className="h-4 w-4 mr-2 inline" />
          Back to Live Reporting
        </button>

        <div className="card-postmodern overflow-hidden">
          {/* Thumbnail */}
          {report.thumbnail_url && (
            <div className="w-full h-96">
              <img
                src={report.thumbnail_url}
                alt={report.title}
                className="w-full h-full object-cover border-2 border-gold-700"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Title & Category */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="post-type-badge">
                  {report.category}
                </span>
                <span className="post-type-badge bg-red-500 border-red-600 text-black-0 gold-glow-intense flex items-center gap-1">
                  <Radio className="h-3 w-3 animate-pulse" />
                  LIVE
                </span>
              </div>
              <h1 className="text-display text-gold-400 mb-4">{report.title}</h1>

              {/* Meta Info */}
              <div className="flex items-center gap-4 post-meta">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{report.author?.nickname || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-mono">
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
                    <span className="text-caption">Approved by: {report.approver.nickname}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {report.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {report.tags.map((tag) => (
                  <span key={tag} className="player-badge">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Markdown Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none mb-6">
              <ReactMarkdown>{report.content}</ReactMarkdown>
            </div>

            {/* External Link */}
            {report.external_link && (
              <div className="pt-6 border-t-2 border-gold-700">
                <a
                  href={report.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Original Source
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
