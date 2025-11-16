"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
    <div className="min-h-screen bg-black-0">
      <main className="container max-w-7xl mx-auto py-8 px-4" id="main-content">
        <div className="mb-8">
          <h1 className="text-display-sm text-gold-400 mb-2 flex items-center gap-3">
            <Radio className="h-8 w-8 gold-glow-intense animate-pulse" />
            LIVE REPORTING
          </h1>
          <p className="text-body text-white/70">
            Real-time tournament updates, chip counts, and latest results
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex gap-0 border-b-2 border-gold-700 overflow-x-auto community-nav">
            {LIVE_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`community-tab whitespace-nowrap ${selectedCategory === category ? 'active' : ''}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        {isLoading ? (
          <CardSkeleton count={3} />
        ) : allReports.length === 0 ? (
          <div className="card-postmodern p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 bg-black-200 flex items-center justify-center border-2 border-gold-700 gold-glow">
                <Radio className="h-8 w-8 text-gold-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-heading text-gold-400 mb-2">No reports yet</h2>
                <p className="text-body text-white/70 max-w-md">
                  {selectedCategory === 'All'
                    ? 'There are no published live reports at this time.'
                    : `No reports in the "${selectedCategory}" category.`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {allReports.map((report) => (
              <div
                key={report.id}
                className="card-postmodern-interactive p-0 overflow-hidden cursor-pointer hover-3d"
                onClick={() => handleReportClick(report.id)}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail */}
                  {report.thumbnail_url && (
                    <div className="md:w-80 h-48 md:h-auto flex-shrink-0">
                      <img
                        src={report.thumbnail_url}
                        alt={report.title}
                        className="w-full h-full object-cover border-2 border-gold-700"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h2 className="text-heading text-gold-400 mb-2 hover:text-gold-300 transition-colors">
                          {report.title}
                        </h2>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="post-type-badge text-xs py-1 px-3">
                            {report.category}
                          </span>
                          <span className="post-type-badge text-xs py-1 px-3 bg-red-500 border-red-600 text-black-0 gold-glow-intense flex items-center gap-1">
                            <Radio className="h-3 w-3 animate-pulse" />
                            LIVE
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <p className="text-body text-white/80 mb-4 line-clamp-3">
                      {report.content.substring(0, 200)}...
                    </p>

                    {/* Tags */}
                    {report.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {report.tags.map((tag) => (
                          <span key={tag} className="player-badge text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 post-meta">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{report.author?.nickname || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-mono">
                          {report.published_at
                            ? new Date(report.published_at).toLocaleDateString('ko-KR')
                            : new Date(report.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>

                    {/* External Link */}
                    {report.external_link && (
                      <div className="mt-3 pt-3 border-t-2 border-gold-700">
                        <a
                          href={report.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-caption text-gold-400 hover:text-gold-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Source: {new URL(report.external_link).hostname}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
