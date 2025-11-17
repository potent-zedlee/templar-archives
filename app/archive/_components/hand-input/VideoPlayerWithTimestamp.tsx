'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Play, Pause } from 'lucide-react'

// ===========================
// Video Player with Timestamp Component
// ===========================

interface VideoPlayerWithTimestampProps {
  videoUrl: string
  onTimestampSelect?: (seconds: number) => void
  startTime?: number
  endTime?: number
}

export function VideoPlayerWithTimestamp({
  videoUrl,
  onTimestampSelect,
  startTime = 0,
  endTime = 0,
}: VideoPlayerWithTimestampProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Extract YouTube video ID
  const videoId = extractYouTubeVideoId(videoUrl)

  if (!videoId) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
        <p className="text-sm text-gray-600">
          Invalid YouTube URL. Please enter a valid YouTube video URL.
        </p>
      </div>
    )
  }

  // Build YouTube embed URL with start time
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${Math.floor(
    startTime
  )}&enablejsapi=1`

  return (
    <div className="space-y-4">
      {/* YouTube Player */}
      <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-md">
        <iframe
          src={embedUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>

      {/* Timestamp Controls */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Start Time */}
          <div>
            <label className="text-xs font-medium mb-1 block text-gray-900">Start time (seconds)</label>
            <Input
              type="number"
              min="0"
              value={startTime}
              onChange={(e) => onTimestampSelect?.(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="text-xs font-medium mb-1 block text-gray-900">End time (seconds)</label>
            <Input
              type="number"
              min="0"
              value={endTime}
              placeholder="0"
              disabled
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onTimestampSelect?.(currentTime)}
          >
            Use current time
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onTimestampSelect?.(0)}
          >
            Reset
          </Button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-600 leading-normal">
          Tip: You can manually enter the timestamp in seconds, or play the video and click "Use
          current time" to capture the current position.
        </p>
      </div>
    </div>
  )
}

// ===========================
// Helper Functions
// ===========================

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}
