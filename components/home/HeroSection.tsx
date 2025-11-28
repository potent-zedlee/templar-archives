import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background with gold glow effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800/50 to-gray-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-400/10 via-transparent to-transparent" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Decorative icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold-400/10 rounded-full border border-gold-400/20 mb-4">
            <Sparkles className="w-8 h-8 text-gold-400" />
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="text-gold-400">TEMPLAR</span>{' '}
              <span className="text-gray-50">ARCHIVES</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
              프로 포커 토너먼트의 모든 핸드 히스토리를 분석하고 학습하세요
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/archive"
              className="group px-8 py-4 bg-gold-400 text-gray-900 font-bold text-lg rounded-lg hover:bg-gold-500 transition-all duration-300 shadow-lg shadow-gold-400/20 hover:shadow-gold-400/40 hover:scale-105"
            >
              <span className="flex items-center gap-2">
                Archive 둘러보기
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </Link>
            <Link
              href="/search"
              className="px-8 py-4 bg-gray-800 text-gray-50 font-bold text-lg rounded-lg hover:bg-gray-700 transition-all duration-300 border border-gray-700 hover:border-gold-400/50"
            >
              핸드 검색하기
            </Link>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-3 justify-center pt-8">
            {['AI 영상 분석', 'GTO 분석', '실시간 통계'].map((feature) => (
              <span
                key={feature}
                className="px-4 py-2 bg-gray-800/80 text-gray-400 text-sm rounded-full border border-gray-700/50 backdrop-blur-sm"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
