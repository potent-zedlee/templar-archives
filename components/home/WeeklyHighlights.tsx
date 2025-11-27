"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LinkButton } from "@/components/ui/link-button"
import { ThumbsUp, Play } from "lucide-react"
import type { WeeklyHighlight } from "@/lib/main-page"

interface WeeklyHighlightsProps {
  highlights: WeeklyHighlight[]
}

export function WeeklyHighlights({ highlights }: WeeklyHighlightsProps) {
  if (highlights.length === 0) {
    return null
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-lg mb-2">주간 하이라이트</h2>
          <p className="text-body text-muted-foreground">
            최근 7일간 가장 많은 좋아요를 받은 핸드
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {highlights.map((hand) => (
          <Card key={hand.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
            {/* Video Thumbnail */}
            <div className="relative aspect-video bg-muted overflow-hidden">
              {hand.video_url ? (
                <div className="relative w-full h-full">
                  <video
                    src={hand.video_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <Badge className="absolute top-2 right-2">
                #{hand.number}
              </Badge>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <div className="text-caption text-muted-foreground mb-1">
                  {hand.tournament_name} • {hand.day_name}
                </div>
                {hand.description && (
                  <p className="text-body line-clamp-2">
                    {hand.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-caption text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {hand.likes_count}
                  </span>
                  {hand.pot_size > 0 && (
                    <span className="font-semibold text-primary">
                      ${hand.pot_size.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <LinkButton
                href={`/archive?hand=${hand.id}`}
                variant="outline"
                size="sm"
                className="w-full"
              >
                View Hand
              </LinkButton>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
