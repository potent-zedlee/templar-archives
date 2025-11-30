'use client'

import { SemanticTags, SemanticTagBadge, TAG_CONFIG } from '@/components/features/hand'

export default function SemanticTagsDemo() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Semantic Tags Demo</h1>
        <p className="text-muted-foreground">
          12가지 시맨틱 태그 배지 컴포넌트 데모
        </p>
      </div>

      {/* 전체 태그 (기본 크기) */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">전체 태그 (md 크기)</h2>
        <SemanticTags
          tags={Object.keys(TAG_CONFIG)}
          size="md"
          showTooltip
        />
      </section>

      {/* 크기별 비교 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">크기별 비교</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Small</h3>
            <SemanticTags
              tags={['#BadBeat', '#AllIn', '#BigPot']}
              size="sm"
              showTooltip
            />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Medium (기본)</h3>
            <SemanticTags
              tags={['#BadBeat', '#AllIn', '#BigPot']}
              size="md"
              showTooltip
            />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Large</h3>
            <SemanticTags
              tags={['#BadBeat', '#AllIn', '#BigPot']}
              size="lg"
              showTooltip
            />
          </div>
        </div>
      </section>

      {/* maxDisplay 기능 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">최대 표시 개수 제한</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">maxDisplay={3}</h3>
            <SemanticTags
              tags={['#BadBeat', '#Cooler', '#HeroCall', '#Tilt', '#SoulRead']}
              maxDisplay={3}
              showTooltip
            />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">maxDisplay={5}</h3>
            <SemanticTags
              tags={Object.keys(TAG_CONFIG)}
              maxDisplay={5}
              showTooltip
            />
          </div>
        </div>
      </section>

      {/* 카테고리별 그룹 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">카테고리별 그룹</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">나쁜 비트 & 쿨러</h3>
            <SemanticTags
              tags={['#BadBeat', '#Cooler', '#SuckOut']}
              showTooltip
            />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">전략적 플레이</h3>
            <SemanticTags
              tags={['#HeroCall', '#SoulRead', '#SlowPlay', '#Bluff']}
              showTooltip
            />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">특별한 상황</h3>
            <SemanticTags
              tags={['#AllIn', '#BigPot', '#FinalTable', '#BubblePlay']}
              showTooltip
            />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">감정 상태</h3>
            <SemanticTags
              tags={['#Tilt']}
              showTooltip
            />
          </div>
        </div>
      </section>

      {/* 개별 배지 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">개별 배지 (SemanticTagBadge)</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TAG_CONFIG) as Array<keyof typeof TAG_CONFIG>).map((tag) => (
            <SemanticTagBadge
              key={tag}
              tag={tag}
              showTooltip
              onClick={() => console.log(`Clicked: ${tag}`)}
            />
          ))}
        </div>
      </section>

      {/* 툴팁 없이 표시 */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">툴팁 없이 표시</h2>
        <SemanticTags
          tags={['#BadBeat', '#AllIn', '#BigPot']}
          showTooltip={false}
        />
      </section>

      {/* 실제 사용 예시 (핸드 카드) */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">실제 사용 예시</h2>
        <div className="border rounded-lg p-4 space-y-3 bg-card">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">Hand #12345</h3>
              <p className="text-sm text-muted-foreground">WSOP Main Event - Day 3</p>
            </div>
            <span className="text-sm text-muted-foreground">2024-07-15</span>
          </div>
          <p className="text-sm">
            Tom Dwan makes an incredible hero call with just Ace high against Phil Ivey&apos;s triple barrel bluff.
            The pot was over 250 big blinds.
          </p>
          <SemanticTags
            tags={['#HeroCall', '#SoulRead', '#BigPot', '#FinalTable']}
            size="sm"
            showTooltip
          />
        </div>
      </section>
    </div>
  )
}
