"use client"

/**
 * Video Player OCR Overlay Component
 *
 * 비디오 플레이어 위에 반투명 오버레이를 표시하고,
 * 드래그 가능한 2개 영역 (player, board)을 설정할 수 있게 함
 *
 * Features:
 * - 드래그 & 리사이즈 가능한 2개 영역
 * - 색상 구분 (player: 빨강, board: 파랑)
 * - 실시간 좌표 계산 (픽셀 + 퍼센트)
 * - 미리보기 모드
 * - 리셋 기능
 */

import { useState, useCallback, useMemo } from 'react'
import { Rnd } from 'react-rnd'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Info, RotateCcw, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  VideoPlayerOcrOverlayProps,
  OcrRegions,
  Region,
} from '@/lib/types/ocr'
import { createInitialRegion, createDefaultOcrRegions } from '@/lib/types/ocr'

type RegionType = 'player' | 'board'

interface DraggableRegionState {
  x: number
  y: number
  width: number
  height: number
}

const REGION_LABELS = {
  player: '플레이어 카드',
  board: '보드 카드 + 팟',
} as const

const REGION_COLORS = {
  player: {
    border: 'border-red-500',
    bg: 'bg-red-500/20',
    hover: 'hover:bg-red-500/30',
    label: 'bg-red-500',
  },
  board: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/20',
    hover: 'hover:bg-blue-500/30',
    label: 'bg-blue-500',
  },
} as const

export function VideoPlayerOcrOverlay({
  videoWidth,
  videoHeight,
  initialRegions,
  onRegionsSet,
  onCancel,
}: VideoPlayerOcrOverlayProps) {
  // Initialize regions
  const [regions, setRegions] = useState<{
    player: DraggableRegionState
    board: DraggableRegionState
  }>(() => {
    if (initialRegions) {
      return {
        player: {
          x: initialRegions.player.x,
          y: initialRegions.player.y,
          width: initialRegions.player.width,
          height: initialRegions.player.height,
        },
        board: {
          x: initialRegions.board.x,
          y: initialRegions.board.y,
          width: initialRegions.board.width,
          height: initialRegions.board.height,
        },
      }
    }

    // Default regions
    const defaults = createDefaultOcrRegions(videoWidth, videoHeight)
    return {
      player: {
        x: defaults.player.x,
        y: defaults.player.y,
        width: defaults.player.width,
        height: defaults.player.height,
      },
      board: {
        x: defaults.board.x,
        y: defaults.board.y,
        width: defaults.board.width,
        height: defaults.board.height,
      },
    }
  })

  const [selectedRegion, setSelectedRegion] = useState<RegionType | null>(null)

  // Convert draggable state to Region with percentages
  const convertToRegion = useCallback(
    (state: DraggableRegionState): Region => {
      return createInitialRegion(
        state.x,
        state.y,
        state.width,
        state.height,
        videoWidth,
        videoHeight
      )
    },
    [videoWidth, videoHeight]
  )

  // Get final OcrRegions
  const finalRegions = useMemo<OcrRegions>(() => {
    return {
      player: convertToRegion(regions.player),
      board: convertToRegion(regions.board),
    }
  }, [regions, convertToRegion])

  // Handle region drag
  const handleDrag = useCallback((type: RegionType, d: { x: number; y: number }) => {
    setRegions((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        x: d.x,
        y: d.y,
      },
    }))
  }, [])

  // Handle region resize
  const handleResize = useCallback(
    (
      type: RegionType,
      ref: HTMLElement,
      position: { x: number; y: number }
    ) => {
      setRegions((prev) => ({
        ...prev,
        [type]: {
          x: position.x,
          y: position.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        },
      }))
    },
    []
  )

  // Reset to default regions
  const handleReset = useCallback(() => {
    const defaults = createDefaultOcrRegions(videoWidth, videoHeight)
    setRegions({
      player: {
        x: defaults.player.x,
        y: defaults.player.y,
        width: defaults.player.width,
        height: defaults.player.height,
      },
      board: {
        x: defaults.board.x,
        y: defaults.board.y,
        width: defaults.board.width,
        height: defaults.board.height,
      },
    })
    setSelectedRegion(null)
  }, [videoWidth, videoHeight])

  // Save regions
  const handleSave = useCallback(() => {
    onRegionsSet(finalRegions)
  }, [finalRegions, onRegionsSet])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
      <div className="max-w-7xl w-full max-h-[90vh] flex flex-col gap-4">
        {/* Header */}
        <Card className="p-4 backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Info className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  OCR 영역 설정
                </h3>
                <p className="text-sm text-muted-foreground">
                  드래그하여 2개 영역을 지정해주세요
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Region Info */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* Player Region Info */}
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-foreground">
                  {REGION_LABELS.player}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  위치: ({Math.round(regions.player.x)}, {Math.round(regions.player.y)})
                </p>
                <p>
                  크기: {Math.round(regions.player.width)} ×{' '}
                  {Math.round(regions.player.height)}
                </p>
                <p>
                  퍼센트: {finalRegions.player.x_percent.toFixed(1)}%,{' '}
                  {finalRegions.player.y_percent.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Board Region Info */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-medium text-foreground">
                  {REGION_LABELS.board}
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  위치: ({Math.round(regions.board.x)}, {Math.round(regions.board.y)})
                </p>
                <p>
                  크기: {Math.round(regions.board.width)} ×{' '}
                  {Math.round(regions.board.height)}
                </p>
                <p>
                  퍼센트: {finalRegions.board.x_percent.toFixed(1)}%,{' '}
                  {finalRegions.board.y_percent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Video Preview with Overlay */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          <div
            className="relative bg-black/50 border-2 border-white/20 rounded-lg overflow-hidden"
            style={{
              width: videoWidth,
              height: videoHeight,
              maxWidth: '100%',
              maxHeight: 'calc(90vh - 200px)',
            }}
          >
            {/* Placeholder for video (실제로는 VideoPlayer가 들어감) */}
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium mb-1">비디오 프리뷰</p>
                <p className="text-sm">
                  {videoWidth} × {videoHeight}
                </p>
              </div>
            </div>

            {/* Player Region */}
            <Rnd
              size={{ width: regions.player.width, height: regions.player.height }}
              position={{ x: regions.player.x, y: regions.player.y }}
              onDragStop={(e, d) => handleDrag('player', d)}
              onResizeStop={(e, direction, ref, delta, position) => {
                handleResize('player', ref, position)
              }}
              bounds="parent"
              minWidth={50}
              minHeight={50}
              className={cn(
                'border-2 rounded-lg cursor-move transition-all',
                REGION_COLORS.player.border,
                REGION_COLORS.player.bg,
                REGION_COLORS.player.hover,
                selectedRegion === 'player' && 'ring-2 ring-red-500 ring-offset-2'
              )}
              onMouseDown={() => setSelectedRegion('player')}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    'px-3 py-1 rounded-full text-white text-sm font-medium',
                    REGION_COLORS.player.label
                  )}
                >
                  {REGION_LABELS.player}
                </div>
              </div>

              {/* Resize handles */}
              <div className="absolute top-0 left-0 w-3 h-3 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-red-500 rounded-full -translate-x-1/2 translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full translate-x-1/2 translate-y-1/2" />
            </Rnd>

            {/* Board Region */}
            <Rnd
              size={{ width: regions.board.width, height: regions.board.height }}
              position={{ x: regions.board.x, y: regions.board.y }}
              onDragStop={(e, d) => handleDrag('board', d)}
              onResizeStop={(e, direction, ref, delta, position) => {
                handleResize('board', ref, position)
              }}
              bounds="parent"
              minWidth={50}
              minHeight={50}
              className={cn(
                'border-2 rounded-lg cursor-move transition-all',
                REGION_COLORS.board.border,
                REGION_COLORS.board.bg,
                REGION_COLORS.board.hover,
                selectedRegion === 'board' && 'ring-2 ring-blue-500 ring-offset-2'
              )}
              onMouseDown={() => setSelectedRegion('board')}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={cn(
                    'px-3 py-1 rounded-full text-white text-sm font-medium',
                    REGION_COLORS.board.label
                  )}
                >
                  {REGION_LABELS.board}
                </div>
              </div>

              {/* Resize handles */}
              <div className="absolute top-0 left-0 w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 rounded-full -translate-x-1/2 translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-full translate-x-1/2 translate-y-1/2" />
            </Rnd>
          </div>
        </div>

        {/* Footer Actions */}
        <Card className="p-4 backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/10 dark:from-black/10 dark:via-black/5 dark:to-black/10 border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              리셋
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                저장
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
