'use client'

/**
 * KAN Analysis Request Form
 * Form for creating new KAN analysis requests
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Sparkles, Loader2, Plus, X } from 'lucide-react'
import { createKanAnalysisRequest } from '@/app/actions/kan-analysis'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { VideoPlayerWithTimestamp } from '@/components/video-player-with-timestamp'
import { InteractiveTimeline } from '@/components/interactive-video-timeline'
import type { VideoSegment } from '@/lib/types/video-segments'
import { timeStringToSeconds } from '@/lib/types/video-segments'

const formSchema = z.object({
  youtubeUrl: z
    .string()
    .url('올바른 URL을 입력하세요')
    .regex(/youtube\.com|youtu\.be/, 'YouTube URL만 가능합니다'),
  tournamentId: z.string().min(1, 'Tournament를 선택하세요'),
  subEventId: z.string().min(1, 'SubEvent를 선택하세요'),
  segmentType: z.enum(['full', 'custom']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  platform: z.enum(['ept', 'triton', 'pokerstars', 'wsop', 'hustler']).optional(),
  createDraftStream: z.boolean(),
  streamName: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Tournament {
  id: string
  name: string
  year: number
}

interface SubEvent {
  id: string
  name: string
  tournament_id: string
}

export function AnalysisRequestForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [subEvents, setSubEvents] = useState<SubEvent[]>([])
  const [loadingTournaments, setLoadingTournaments] = useState(true)
  const [loadingSubEvents, setLoadingSubEvents] = useState(false)
  const [players, setPlayers] = useState<string[]>([''])
  const [segments, setSegments] = useState<VideoSegment[]>([])
  const [videoDuration, setVideoDuration] = useState(0)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      segmentType: 'full',
      platform: 'ept',
      createDraftStream: true,
    },
  })

  const tournamentId = watch('tournamentId')
  const segmentType = watch('segmentType')
  const createDraftStream = watch('createDraftStream')

  // Load tournaments
  useEffect(() => {
    const loadTournaments = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase
          .from('tournaments')
          .select('id, name, year')
          .order('year', { ascending: false })
          .limit(50)

        if (error) throw error
        setTournaments(data || [])
      } catch (error) {
        console.error('Failed to load tournaments:', error)
        toast.error('Tournament 목록을 불러오는데 실패했습니다')
      } finally {
        setLoadingTournaments(false)
      }
    }

    loadTournaments()
  }, [])

  // Load sub events when tournament changes
  useEffect(() => {
    if (!tournamentId) {
      setSubEvents([])
      return
    }

    const loadSubEvents = async () => {
      setLoadingSubEvents(true)
      try {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase
          .from('sub_events')
          .select('id, name, tournament_id')
          .eq('tournament_id', tournamentId)
          .order('name')

        if (error) throw error
        setSubEvents(data || [])
      } catch (error) {
        console.error('Failed to load sub events:', error)
        toast.error('SubEvent 목록을 불러오는데 실패했습니다')
      } finally {
        setLoadingSubEvents(false)
      }
    }

    loadSubEvents()
  }, [tournamentId])

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)

    try {
      // Validate custom segment times
      if (data.segmentType === 'custom') {
        // Use segments from InteractiveTimeline if available
        if (segments.length === 0) {
          if (!data.startTime || !data.endTime) {
            toast.error('시작 시간과 종료 시간을 입력하거나 타임라인에서 구간을 선택하세요')
            return
          }
        }
      }

      // Filter valid players
      const validPlayers = players.filter((p) => p.trim().length > 0)

      // Use segments from InteractiveTimeline if available, otherwise use manual times
      let finalSegmentType = data.segmentType
      let finalStartTime = data.startTime
      let finalEndTime = data.endTime

      if (segments.length > 0) {
        // User selected segments from timeline
        finalSegmentType = 'custom'
        // Use first segment for now (can be enhanced to support multiple segments)
        finalStartTime = segments[0].startTime
        finalEndTime = segments[0].endTime
      }

      const result = await createKanAnalysisRequest({
        youtubeUrl: data.youtubeUrl,
        tournamentId: data.tournamentId,
        subEventId: data.subEventId,
        segmentType: finalSegmentType,
        startTime: finalStartTime,
        endTime: finalEndTime,
        players: validPlayers.length > 0 ? validPlayers : undefined,
        platform: data.platform,
        createDraftStream: data.createDraftStream,
        streamName: data.streamName,
      })

      if (!result.success) {
        toast.error(result.error || '분석 요청에 실패했습니다')
        return
      }

      toast.success('분석 요청이 접수되었습니다')

      // Redirect to active jobs page
      router.push(`/admin/kan/active?job=${result.jobId}`)
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('분석 요청 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddPlayer = () => {
    setPlayers([...players, ''])
  }

  const handleRemovePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index))
  }

  const handleUpdatePlayer = (index: number, value: string) => {
    const newPlayers = [...players]
    newPlayers[index] = value
    setPlayers(newPlayers)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* YouTube URL */}
      <Card>
        <CardHeader>
          <CardTitle>영상 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">YouTube URL *</Label>
            <Input
              id="youtubeUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              {...register('youtubeUrl')}
            />
            {errors.youtubeUrl && (
              <p className="text-sm text-red-500">{errors.youtubeUrl.message}</p>
            )}
          </div>

          {/* YouTube Player - Show when URL is entered */}
          {watch('youtubeUrl') && (
            <div className="space-y-4">
              <VideoPlayerWithTimestamp
                videoUrl={watch('youtubeUrl')}
                videoSource="youtube"
                onTimeUpdate={setCurrentVideoTime}
                onDurationUpdate={setVideoDuration}
              />

              {/* Interactive Timeline */}
              {videoDuration > 0 && (
                <div className="space-y-2">
                  <Label>타임라인에서 분석 구간 선택 (선택사항)</Label>
                  <InteractiveTimeline
                    segments={segments}
                    onChange={setSegments}
                    totalDuration={videoDuration}
                  />
                  {segments.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {segments.length}개의 구간이 선택되었습니다
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="platform">플랫폼</Label>
            <Select
              value={watch('platform')}
              onValueChange={(value) =>
                setValue('platform', value as FormValues['platform'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ept">
                  <div className="flex items-center gap-2">
                    <span>EPT (European Poker Tour)</span>
                    <Badge variant="secondary" className="text-xs">
                      권장
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="triton">Triton Poker</SelectItem>
                <SelectItem value="pokerstars">PokerStars</SelectItem>
                <SelectItem value="wsop">WSOP</SelectItem>
                <SelectItem value="hustler">Hustler Casino Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tournament & SubEvent Selection */}
      <Card>
        <CardHeader>
          <CardTitle>토너먼트 선택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tournament">Tournament *</Label>
            <Select
              value={watch('tournamentId')}
              onValueChange={(value) => {
                setValue('tournamentId', value)
                setValue('subEventId', '') // Reset sub event
              }}
              disabled={loadingTournaments}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tournament를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name} ({tournament.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tournamentId && (
              <p className="text-sm text-red-500">{errors.tournamentId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subEvent">SubEvent *</Label>
            <Select
              value={watch('subEventId')}
              onValueChange={(value) => setValue('subEventId', value)}
              disabled={!tournamentId || loadingSubEvents}
            >
              <SelectTrigger>
                <SelectValue placeholder="SubEvent를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {subEvents.map((subEvent) => (
                  <SelectItem key={subEvent.id} value={subEvent.id}>
                    {subEvent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.subEventId && (
              <p className="text-sm text-red-500">{errors.subEventId.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Segment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>분석 구간 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={segmentType}
            onValueChange={(value) =>
              setValue('segmentType', value as 'full' | 'custom')
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full" className="font-normal cursor-pointer">
                전체 영상 분석
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="font-normal cursor-pointer">
                구간 지정 (타임라인 또는 수동 입력)
              </Label>
            </div>
          </RadioGroup>

          {segmentType === 'custom' && (
            <div className="space-y-4 pl-6">
              <p className="text-sm text-muted-foreground">
                • 위의 타임라인에서 구간을 선택하거나
                <br />
                • 아래 입력란에 시간을 직접 입력하세요
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">시작 시간 (HH:MM:SS)</Label>
                  <Input
                    id="startTime"
                    placeholder="00:00:00"
                    {...register('startTime')}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-red-500">{errors.startTime.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">종료 시간 (HH:MM:SS)</Label>
                  <Input id="endTime" placeholder="01:00:00" {...register('endTime')} />
                  {errors.endTime && (
                    <p className="text-sm text-red-500">{errors.endTime.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stream Creation */}
      <Card>
        <CardHeader>
          <CardTitle>스트림 생성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createDraftStream"
              checked={createDraftStream}
              onCheckedChange={(checked) =>
                setValue('createDraftStream', checked as boolean)
              }
            />
            <Label htmlFor="createDraftStream" className="font-normal cursor-pointer">
              Draft 스트림 자동 생성
            </Label>
          </div>

          {createDraftStream && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="streamName">스트림 이름 (선택)</Label>
              <Input
                id="streamName"
                placeholder="비워두면 자동 생성됩니다"
                {...register('streamName')}
              />
              <p className="text-xs text-muted-foreground">
                비워두면 "KAN Analysis - 날짜" 형식으로 생성됩니다
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Players (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>플레이어 (선택 사항)</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPlayer}
            >
              <Plus className="h-4 w-4 mr-1" />
              추가
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            플레이어를 지정하면 이름 매칭 정확도가 향상됩니다
          </p>

          {players.map((player, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="플레이어 이름"
                value={player}
                onChange={(e) => handleUpdatePlayer(index, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemovePlayer(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-purple-500/10 border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-purple-700 dark:text-purple-300">
                Gemini AI 자동 분석
              </p>
              <ul className="text-muted-foreground space-y-1">
                <li>• 처리 시간: 약 2-5분</li>
                <li>• Draft 스트림 자동 생성 후 Admin이 수동으로 Publish</li>
                <li>• 분석 완료 후 핸드 목록 자동 갱신</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              분석 요청 중...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              분석 시작
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
