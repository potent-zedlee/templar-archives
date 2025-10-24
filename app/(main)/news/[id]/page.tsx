"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useNewsDetailQuery } from "@/lib/queries/news-queries"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { Calendar, User, ExternalLink, ArrowLeft } from "lucide-react"
import ReactMarkdown from "react-markdown"

export default function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { data: news, isLoading, error } = useNewsDetailQuery(resolvedParams.id)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <CardSkeleton count={1} />
        </div>
      </div>
    )
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Card className="p-12 text-center">
            <h2 className="text-title-md mb-2">News not found</h2>
            <p className="text-body text-muted-foreground mb-4">
              The news article you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/news')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
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
          onClick={() => router.push('/news')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to News
        </Button>

        <Card className="overflow-hidden">
          {/* Thumbnail */}
          {news.thumbnail_url && (
            <div className="w-full h-96">
              <img
                src={news.thumbnail_url}
                alt={news.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Title & Category */}
            <div className="mb-6">
              <Badge variant="outline" className="mb-3">
                {news.category}
              </Badge>
              <h1 className="text-3xl font-bold mb-4">{news.title}</h1>

              {/* Meta Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{news.author?.nickname || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {news.published_at
                      ? new Date(news.published_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : new Date(news.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                  </span>
                </div>
                {news.approver && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Approved by: {news.approver.nickname}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {news.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {news.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Markdown Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none mb-6">
              <ReactMarkdown>{news.content}</ReactMarkdown>
            </div>

            {/* External Link */}
            {news.external_link && (
              <div className="pt-6 border-t">
                <a
                  href={news.external_link}
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
