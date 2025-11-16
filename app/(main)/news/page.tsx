"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useNewsQuery } from "@/lib/queries/news-queries"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { Newspaper, Calendar, User } from "lucide-react"

const NEWS_CATEGORIES = ['All', 'Tournament', 'Player News', 'Industry', 'General', 'Other'] as const

export default function NewsPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const { data: allNews = [], isLoading } = useNewsQuery(
    selectedCategory !== 'All' ? { category: selectedCategory } : undefined
  )

  const handleNewsClick = (newsId: string) => {
    router.push(`/news/${newsId}`)
  }

  return (
    <div className="min-h-screen bg-black-0">
      <main className="container max-w-7xl mx-auto py-8 px-4" id="main-content">
        <div className="mb-8">
          <h1 className="text-display-sm text-gold-400 mb-2">POKER NEWS</h1>
          <p className="text-body text-white/70">
            Latest poker news, updates, and announcements
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex gap-0 border-b-2 border-gold-700 overflow-x-auto community-nav">
            {NEWS_CATEGORIES.map((category) => (
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

        {/* News List */}
        {isLoading ? (
          <CardSkeleton count={3} />
        ) : allNews.length === 0 ? (
          <div className="card-postmodern p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 bg-black-200 flex items-center justify-center border-2 border-gold-700">
                <Newspaper className="h-8 w-8 text-gold-400" />
              </div>
              <div>
                <h2 className="text-heading text-gold-400 mb-2">No news yet</h2>
                <p className="text-body text-white/70 max-w-md">
                  {selectedCategory === 'All'
                    ? 'There are no published news articles at this time.'
                    : `No news in the "${selectedCategory}" category.`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {allNews.map((news) => (
              <div
                key={news.id}
                className="card-postmodern-interactive p-0 overflow-hidden cursor-pointer hover-3d"
                onClick={() => handleNewsClick(news.id)}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail */}
                  {news.thumbnail_url && (
                    <div className="md:w-80 h-48 md:h-auto flex-shrink-0">
                      <img
                        src={news.thumbnail_url}
                        alt={news.title}
                        className="w-full h-full object-cover border-2 border-gold-700"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h2 className="text-heading text-gold-400 mb-2 hover:text-gold-300 transition-colors">
                          {news.title}
                        </h2>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="post-type-badge text-xs py-1 px-3">
                            {news.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <p className="text-body text-white/80 mb-4 line-clamp-3">
                      {news.content.substring(0, 200)}...
                    </p>

                    {/* Tags */}
                    {news.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {news.tags.map((tag) => (
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
                        <span>{news.author?.nickname || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-mono">
                          {news.published_at
                            ? new Date(news.published_at).toLocaleDateString('ko-KR')
                            : new Date(news.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>

                    {/* External Link */}
                    {news.external_link && (
                      <div className="mt-3 pt-3 border-t-2 border-gold-700">
                        <a
                          href={news.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-caption text-gold-400 hover:text-gold-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Source: {new URL(news.external_link).hostname}
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
