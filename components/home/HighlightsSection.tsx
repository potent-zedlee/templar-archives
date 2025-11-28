import Link from 'next/link'
import { ThumbsUp, Play, TrendingUp } from 'lucide-react'
import type { WeeklyHighlight } from '@/lib/main-page'

interface HighlightsSectionProps {
  highlights: WeeklyHighlight[]
}

export function HighlightsSection({ highlights }: HighlightsSectionProps) {
  if (highlights.length === 0) {
    return null
  }

  return (
    <section className="py-12 md:py-16 bg-gray-900">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-gold-400" />
          <div>
            <h2 className="text-3xl font-bold text-gray-50">주간 하이라이트</h2>
            <p className="text-gray-400 mt-1">
              최근 7일간 가장 많은 좋아요를 받은 핸드
            </p>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {highlights.map((hand) => (
            <HighlightCard key={hand.id} hand={hand} />
          ))}
        </div>
      </div>
    </section>
  )
}

function HighlightCard({ hand }: { hand: WeeklyHighlight }) {
  return (
    <div className="group bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gold-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-gold-400/10">
      {/* Video Thumbnail */}
      <div className="relative aspect-video bg-gray-900 overflow-hidden">
        {hand.video_url ? (
          <>
            <video
              src={hand.video_url}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              preload="metadata"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="p-4 bg-gold-400 rounded-full">
                <Play className="w-8 h-8 text-gray-900 fill-current" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <Play className="w-12 h-12 text-gray-600" />
          </div>
        )}

        {/* Hand Number Badge */}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 bg-gold-400 text-gray-900 text-sm font-bold rounded-full">
            #{hand.number}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Tournament & Stream */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            {hand.tournament_name}
          </p>
          <p className="text-sm text-gray-400">{hand.day_name}</p>
        </div>

        {/* Description */}
        {hand.description && (
          <p className="text-gray-300 line-clamp-2 text-sm leading-relaxed">
            {hand.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <div className="flex items-center gap-1.5 text-gray-400">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm font-medium">{hand.likes_count}</span>
          </div>
          {hand.pot_size > 0 && (
            <span className="text-sm font-bold text-gold-400">
              ${hand.pot_size.toLocaleString()}
            </span>
          )}
        </div>

        {/* View Button */}
        <Link
          href={`/archive?hand=${hand.id}`}
          className="block w-full py-3 bg-gray-900 text-gray-50 text-center font-semibold rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 hover:border-gold-400/50"
        >
          핸드 보기
        </Link>
      </div>
    </div>
  )
}
