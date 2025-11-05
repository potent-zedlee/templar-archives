/**
 * Player Match Results Component
 *
 * AI 분석 후 플레이어 이름 매칭 결과를 표시하는 컴포넌트
 * 신뢰도가 낮은 매칭을 사용자가 확인하고 수정할 수 있음
 */

'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface PlayerMatchResult {
  inputName: string
  matchedName: string
  playerId: string
  similarity: number
  confidence: 'high' | 'medium' | 'low'
  isPartialMatch: boolean
}

interface PlayerMatchResultsProps {
  results: PlayerMatchResult[]
  className?: string
}

export function PlayerMatchResults({ results, className }: PlayerMatchResultsProps) {
  if (results.length === 0) {
    return null
  }

  // 신뢰도별 그룹화
  const highConfidence = results.filter((r) => r.confidence === 'high')
  const mediumConfidence = results.filter((r) => r.confidence === 'medium')
  const lowConfidence = results.filter((r) => r.confidence === 'low')

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            높음
          </Badge>
        )
      case 'medium':
        return (
          <Badge className="bg-yellow-500 text-white">
            <AlertTriangle className="h-3 w-3 mr-1" />
            중간
          </Badge>
        )
      case 'low':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            낮음
          </Badge>
        )
    }
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">플레이어 이름 매칭 결과</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          AI가 인식한 플레이어 이름을 데이터베이스의 기존 플레이어와 매칭했습니다.
        </p>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center p-2 rounded bg-green-500/10 border border-green-500/20">
            <div className="font-bold text-green-600 dark:text-green-400">
              {highConfidence.length}
            </div>
            <div className="text-xs text-muted-foreground">높은 신뢰도</div>
          </div>
          <div className="text-center p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
            <div className="font-bold text-yellow-600 dark:text-yellow-400">
              {mediumConfidence.length}
            </div>
            <div className="text-xs text-muted-foreground">중간 신뢰도</div>
          </div>
          <div className="text-center p-2 rounded bg-red-500/10 border border-red-500/20">
            <div className="font-bold text-red-600 dark:text-red-400">
              {lowConfidence.length}
            </div>
            <div className="text-xs text-muted-foreground">낮은 신뢰도</div>
          </div>
        </div>

        {/* Results List */}
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className="p-3 rounded border bg-muted/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getConfidenceBadge(result.confidence)}
                    <Badge variant="outline" className="text-xs">
                      {result.similarity}% 유사
                    </Badge>
                    {result.isPartialMatch && (
                      <Badge variant="secondary" className="text-xs">
                        부분 매칭
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">입력:</span>
                    <span className="font-mono font-medium">
                      {result.inputName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">매칭:</span>
                    <span className="font-mono font-medium text-primary">
                      {result.matchedName}
                    </span>
                  </div>
                </div>

                {result.confidence === 'low' && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1 mt-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      신뢰도가 낮습니다. 핸드 데이터를 확인하여 올바르게 매칭되었는지 검토하세요.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Warning for low confidence */}
        {lowConfidence.length > 0 && (
          <Card className="p-3 bg-amber-500/10 border-amber-500/20">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  주의: 낮은 신뢰도 매칭 발견
                </p>
                <p className="text-xs text-muted-foreground">
                  {lowConfidence.length}개의 플레이어 매칭이 낮은 신뢰도를 보입니다.
                  핸드 히스토리를 확인하여 플레이어가 올바르게 매칭되었는지 검토하세요.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Card>
  )
}
