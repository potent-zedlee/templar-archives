"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNewsQuery, type News } from "@/lib/queries/news-queries"
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
    <div className="min-h-screen bg-muted/30">
      <Header />

      <main className="container max-w-7xl mx-auto py-8 px-4" id="main-content">
        <div className="mb-6">
          <h1 className="text-title-lg mb-2">Poker News</h1>
          <p className="text-body text-muted-foreground">
            Latest poker news, updates, and announcements
          </p>
        </div>

        {/* Category Filter */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList>
            {NEWS_CATEGORIES.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* News List */}
        {isLoading ? (
          <CardSkeleton count={3} />
        ) : allNews.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Newspaper className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-title-md mb-2">No news yet</h2>
                <p className="text-body text-muted-foreground max-w-md">
                  {selectedCategory === 'All'
                    ? 'There are no published news articles at this time.'
                    : `No news in the "${selectedCategory}" category.`}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6">
            {allNews.map((news) => (
              <Card
                key={news.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleNewsClick(news.id)}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail */}
                  {news.thumbnail_url && (
                    <div className="md:w-80 h-48 md:h-auto flex-shrink-0">
                      <img
                        src={news.thumbnail_url}
                        alt={news.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold mb-2 hover:text-primary transition-colors">
                          {news.title}
                        </h2>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{news.category}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {news.content.substring(0, 200)}...
                    </p>

                    {/* Tags */}
                    {news.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {news.tags.map((tag) => (
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
                        <span>{news.author?.nickname || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {news.published_at
                            ? new Date(news.published_at).toLocaleDateString('ko-KR')
                            : new Date(news.created_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>

                    {/* External Link */}
                    {news.external_link && (
                      <div className="mt-3 pt-3 border-t">
                        <a
                          href={news.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Source: {new URL(news.external_link).hostname}
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
