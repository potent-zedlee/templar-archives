"use client"

/**
 * OCR Setup Dialog Component
 *
 * Timecode Submission의 OCR 영역을 설정하는 다이얼로그
 *
 * Features:
 * - VideoPlayer와 VideoPlayerOcrOverlay 통합
 * - OCR 영역 설정 및 저장
 * - 실시간 비디오 미리보기
 * - 저장 성공/실패 피드백
 */

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { VideoPlayer } from '@/components/video-player'
import { VideoPlayerOcrOverlay } from '@/components/video-player-ocr-overlay'
import { Loader2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import type { OcrSetupDialogProps, OcrRegions } from '@/lib/types/ocr'
import { createClientSupabaseClient } from '@/lib/supabase-client'

export function OcrSetupDialog({
  open,
  onOpenChange,
  submissionId,
  videoUrl,
  initialRegions,
  onSuccess,
}: OcrSetupDialogProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Handle overlay save
  const handleRegionsSet = useCallback(
    async (regions: OcrRegions) => {
      setIsSaving(true)

      try {
        const supabase = createClientSupabaseClient()

        // Update timecode_submission with ocr_regions
        const { error } = await supabase
          .from('timecode_submissions')
          .update({
            ocr_regions: regions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', submissionId)
          .select()
          .single()

        if (error) {
          console.error('Error updating OCR regions:', error)
          throw new Error(error.message)
        }

        toast.success('OCR 영역이 저장되었습니다')

        // Close overlay
        setShowOverlay(false)

        // Call success callback
        onSuccess?.()

        // Close dialog
        setTimeout(() => {
          onOpenChange(false)
        }, 500)
      } catch (error) {
        console.error('Failed to save OCR regions:', error)
        toast.error('OCR 영역 저장 실패: ' + (error as Error).message)
      } finally {
        setIsSaving(false)
      }
    },
    [submissionId, onSuccess, onOpenChange]
  )

  // Handle overlay cancel
  const handleCancel = useCallback(() => {
    setShowOverlay(false)
  }, [])

  // Handle dialog open state change
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && !isSaving) {
        setShowOverlay(false)
      }
      onOpenChange(newOpen)
    },
    [onOpenChange, isSaving]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            OCR 영역 설정
          </DialogTitle>
          <DialogDescription>
            비디오를 보면서 OCR 영역을 지정해주세요. 플레이어 카드 영역과 보드 카드 + 팟 크기 영역을 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-6 pb-6">
          {/* Video Player Container */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            {videoUrl ? (
              <div className="w-full" style={{ aspectRatio: '16/9' }}>
                <VideoPlayer
                  day={{
                    id: submissionId,
                    name: 'OCR Setup Preview',
                    video_source: 'youtube',
                    video_url: videoUrl,
                    video_file: undefined,
                    video_nas_path: undefined,
                    published_at: undefined,
                    sub_event_id: '',
                    created_at: new Date().toISOString(),
                  }}
                  seekTime={undefined}
                />
              </div>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">비디오 URL이 없습니다</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {initialRegions
                ? 'OCR 영역이 설정되어 있습니다. 수정하려면 "영역 설정" 버튼을 클릭하세요.'
                : 'OCR 영역을 설정하려면 "영역 설정" 버튼을 클릭하세요.'}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                닫기
              </Button>
              <Button
                onClick={() => setShowOverlay(true)}
                disabled={!videoUrl || isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4" />
                    영역 설정
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Overlay */}
          {showOverlay && (
            <VideoPlayerOcrOverlay
              videoWidth={1280}
              videoHeight={720}
              initialRegions={initialRegions}
              onRegionsSet={handleRegionsSet}
              onCancel={handleCancel}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
