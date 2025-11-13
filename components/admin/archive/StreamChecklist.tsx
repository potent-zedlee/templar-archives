/**
 * Stream Checklist Modal
 *
 * Stream 발행 전 체크리스트를 보여주는 모달
 * - YouTube 링크 확인
 * - 썸네일 존재 확인
 * - 핸드 개수 확인
 * - 모든 조건 만족 시 Publish 버튼 활성화
 */

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { publishStream, unpublishStream } from '@/app/actions/archive-status'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import type { ContentStatus } from '@/lib/types/archive'

interface StreamChecklistProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  streamId: string
  streamName: string
  currentStatus: ContentStatus
  onStatusChange?: () => void
}

interface ChecklistItem {
  id: string
  label: string
  status: 'checking' | 'passed' | 'warning' | 'failed'
  message?: string
}

export function StreamChecklist({
  isOpen,
  onOpenChange,
  streamId,
  streamName,
  currentStatus,
  onStatusChange,
}: StreamChecklistProps) {
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'video', label: 'YouTube Link', status: 'checking' },
    { id: 'thumbnail', label: 'Thumbnail', status: 'checking' },
    { id: 'hands', label: 'Hand Count', status: 'checking' },
  ])

  const supabase = createClientSupabaseClient()

  // 체크리스트 검증
  useEffect(() => {
    if (!isOpen) return

    const checkStream = async () => {
      setLoading(true)
      const newChecklist: ChecklistItem[] = []

      try {
        // 1. Stream 데이터 가져오기
        const { data: stream, error: streamError } = await supabase
          .from('streams')
          .select('video_url, video_source, thumbnail_url')
          .eq('id', streamId)
          .single()

        if (streamError) throw streamError

        // 2. Video URL 체크
        if (stream.video_url && stream.video_source === 'youtube') {
          newChecklist.push({
            id: 'video',
            label: 'YouTube Link',
            status: 'passed',
            message: stream.video_url,
          })
        } else {
          newChecklist.push({
            id: 'video',
            label: 'YouTube Link',
            status: 'warning',
            message: 'No YouTube URL',
          })
        }

        // 3. Thumbnail 체크
        if (stream.thumbnail_url) {
          newChecklist.push({
            id: 'thumbnail',
            label: 'Thumbnail',
            status: 'passed',
            message: 'Thumbnail exists',
          })
        } else {
          newChecklist.push({
            id: 'thumbnail',
            label: 'Thumbnail',
            status: 'warning',
            message: 'No thumbnail',
          })
        }

        // 4. Hand Count 체크
        const { count: handCount, error: handError } = await supabase
          .from('hands')
          .select('id', { count: 'exact', head: true })
          .eq('day_id', streamId)

        if (handError) throw handError

        if (handCount && handCount > 0) {
          newChecklist.push({
            id: 'hands',
            label: 'Hand Count',
            status: 'passed',
            message: `${handCount} hands`,
          })
        } else {
          newChecklist.push({
            id: 'hands',
            label: 'Hand Count',
            status: 'failed',
            message: 'No hands yet',
          })
        }

        setChecklist(newChecklist)
      } catch (error) {
        console.error('Error checking stream:', error)
        toast.error('Failed to load checklist')
      } finally {
        setLoading(false)
      }
    }

    checkStream()
  }, [isOpen, streamId])

  // 모든 필수 조건 통과 여부
  const canPublish = checklist.every((item) => item.status !== 'failed')

  // Publish 핸들러
  const handlePublish = async () => {
    setPublishing(true)
    try {
      const result = await publishStream(streamId)

      if (result.success) {
        toast.success(`"${streamName}" published successfully`)
        onStatusChange?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to publish stream')
      }
    } catch (error) {
      console.error('Error publishing stream:', error)
      toast.error('Failed to publish stream')
    } finally {
      setPublishing(false)
    }
  }

  // Unpublish 핸들러
  const handleUnpublish = async () => {
    setPublishing(true)
    try {
      const result = await unpublishStream(streamId)

      if (result.success) {
        toast.success(`"${streamName}" unpublished successfully`)
        onStatusChange?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to unpublish stream')
      }
    } catch (error) {
      console.error('Error unpublishing stream:', error)
      toast.error('Failed to unpublish stream')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stream Checklist</DialogTitle>
          <DialogDescription>
            {currentStatus === 'published'
              ? 'Stream is currently published. You can unpublish it below.'
              : 'Review checklist before publishing'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stream Name */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Stream:</span>
            <span className="text-sm text-muted-foreground">{streamName}</span>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3 border rounded-lg p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  {/* Status Icon */}
                  {item.status === 'passed' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  {item.status === 'warning' && (
                    <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  )}
                  {item.status === 'failed' && (
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  )}

                  {/* Label & Message */}
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.message && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.message}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Warning Badge */}
          {!canPublish && !loading && (
            <Badge variant="destructive" className="w-full justify-center">
              Cannot publish: Missing hands
            </Badge>
          )}
        </div>

        <DialogFooter>
          {currentStatus === 'published' ? (
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={publishing}
            >
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unpublish
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={!canPublish || loading || publishing}
            >
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
