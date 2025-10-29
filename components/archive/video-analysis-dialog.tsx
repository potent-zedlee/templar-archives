"use client"

/**
 * Video Analysis Dialog
 *
 * Hand Analysis Engine을 사용하여 영상 자동 분석
 * - 실시간 진행률 표시 (SSE)
 * - 3개 탭: Settings, Progress, Results
 * - High Templar 이상만 사용 가능
 */

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Play, Check, X, Loader2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Day } from '@/lib/types/archive'

interface VideoAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  day: Day | null
  onComplete?: () => void
}

interface ProgressEvent {
  type: 'progress' | 'boundary' | 'hand' | 'complete' | 'error'
  data: any
}

interface HandResult {
  handId: string
  handNumber: number
  confidence: number
}

export function VideoAnalysisDialog({
  open,
  onOpenChange,
  day,
  onComplete,
}: VideoAnalysisDialogProps) {
  // Settings
  const [layout, setLayout] = useState<string>('triton')
  const [maxIterations, setMaxIterations] = useState<number>(3)

  // Progress
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentStage, setCurrentStage] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [detectedHands, setDetectedHands] = useState<HandResult[]>([])

  // Results
  const [totalHands, setTotalHands] = useState<number>(0)
  const [savedHands, setSavedHands] = useState<number>(0)
  const [successRate, setSuccessRate] = useState<number>(0)
  const [processingTime, setProcessingTime] = useState<number>(0)
  const [averageConfidence, setAverageConfidence] = useState<number>(0)
  const [error, setError] = useState<string>('')

  // SSE connection
  const eventSourceRef = useRef<EventSource | null>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setIsAnalyzing(false)
      setCurrentStage('')
      setProgress(0)
      setDetectedHands([])
      setTotalHands(0)
      setSavedHands(0)
      setSuccessRate(0)
      setProcessingTime(0)
      setAverageConfidence(0)
      setError('')
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [open])

  const handleStartAnalysis = async () => {
    if (!day) return

    setIsAnalyzing(true)
    setCurrentStage('Initializing...')
    setProgress(0)
    setError('')
    setDetectedHands([])

    try {
      // Create EventSource for SSE
      const url = `/api/analyze-video?dayId=${day.id}&layout=${layout}&maxIterations=${maxIterations}`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        const progressEvent: ProgressEvent = JSON.parse(event.data)

        switch (progressEvent.type) {
          case 'progress':
            setCurrentStage(getStageLabel(progressEvent.data.stage))
            setProgress(progressEvent.data.percent)
            break

          case 'boundary':
            toast.success(`Hand boundary detected: ${progressEvent.data.handNumber}`)
            break

          case 'hand':
            setDetectedHands((prev) => [
              ...prev,
              {
                handId: progressEvent.data.handId,
                handNumber: progressEvent.data.handNumber,
                confidence: progressEvent.data.confidence,
              },
            ])
            toast.success(
              `Hand #${progressEvent.data.handNumber} analyzed (${(
                progressEvent.data.confidence * 100
              ).toFixed(0)}%)`
            )
            break

          case 'complete':
            setTotalHands(progressEvent.data.totalHands)
            setSavedHands(progressEvent.data.savedHands)
            setSuccessRate(progressEvent.data.successRate)
            setProcessingTime(progressEvent.data.processingTime)
            setAverageConfidence(progressEvent.data.averageConfidence)
            setIsAnalyzing(false)
            setCurrentStage('Complete!')
            setProgress(100)
            toast.success(
              `Analysis complete! ${progressEvent.data.savedHands}/${progressEvent.data.totalHands} hands saved.`
            )
            eventSource.close()
            onComplete?.()
            break

          case 'error':
            setError(progressEvent.data.message)
            setIsAnalyzing(false)
            setCurrentStage('Error')
            toast.error(`Analysis failed: ${progressEvent.data.message}`)
            eventSource.close()
            break
        }
      }

      eventSource.onerror = (err) => {
        console.error('SSE error:', err)
        setError('Connection lost')
        setIsAnalyzing(false)
        setCurrentStage('Error')
        toast.error('Connection lost')
        eventSource.close()
      }
    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message || 'Unknown error')
      setIsAnalyzing(false)
      toast.error(`Failed to start analysis: ${err.message}`)
    }
  }

  const getStageLabel = (stage: string): string => {
    switch (stage) {
      case 'initializing':
        return 'Initializing Hand Analyzer...'
      case 'analyzing':
        return 'Analyzing video...'
      case 'saving':
        return 'Saving results...'
      case 'complete':
        return 'Complete!'
      default:
        return stage
    }
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analyze Video with AI</DialogTitle>
          <DialogDescription>
            Automatically extract hand histories from video using Hand Analysis Engine (Claude Vision)
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="progress" disabled={!isAnalyzing && progress === 0}>
              Progress
            </TabsTrigger>
            <TabsTrigger value="results" disabled={progress < 100}>
              Results
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Video</Label>
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{day?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {day?.video_source === 'youtube' && 'YouTube'}
                  {day?.video_file && 'Local File'}
                  {day?.video_nas_path && 'NAS'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="layout">Layout Type</Label>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger id="layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="triton">Triton Poker</SelectItem>
                  <SelectItem value="hustler">Hustler Casino Live</SelectItem>
                  <SelectItem value="wsop">WSOP</SelectItem>
                  <SelectItem value="apt">APT (Asia Poker Tour)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="iterations">Max Iterations</Label>
              <Select
                value={maxIterations.toString()}
                onValueChange={(v) => setMaxIterations(parseInt(v))}
              >
                <SelectTrigger id="iterations">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (Fast, Lower Accuracy)</SelectItem>
                  <SelectItem value="2">2 (Balanced)</SelectItem>
                  <SelectItem value="3">3 (Recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || !day}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Analysis
                </>
              )}
            </Button>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{currentStage}</Label>
                <span className="text-sm font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-2">
              <Label>Detected Hands ({detectedHands.length})</Label>
              <div className="max-h-[300px] overflow-y-auto space-y-2 p-3 rounded-lg bg-muted">
                {detectedHands.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hands detected yet...</p>
                ) : (
                  detectedHands.map((hand, index) => (
                    <div
                      key={hand.handId}
                      className="flex items-center justify-between p-2 rounded bg-background"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Hand #{hand.handNumber}</span>
                      </div>
                      <Badge variant={hand.confidence >= 0.8 ? 'default' : 'secondary'}>
                        {(hand.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4" />
                  <span className="font-medium">Error: {error}</span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Total Hands</p>
                <p className="text-2xl font-bold">{totalHands}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Saved Hands</p>
                <p className="text-2xl font-bold text-green-500">{savedHands}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {(averageConfidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Processing Time</p>
              <p className="text-xl font-bold">{formatTime(processingTime)}</p>
            </div>

            <Button
              onClick={() => {
                onOpenChange(false)
                onComplete?.()
              }}
              className="w-full"
              size="lg"
            >
              <ChevronRight className="mr-2 h-4 w-4" />
              View Hands
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
