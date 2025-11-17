'use client'

import { useEffect, useState } from 'react'
import { useHandInputStore } from '@/stores/hand-input-store'
import { HandInputForm } from './HandInputForm'
import { VideoPlayerWithTimestamp } from './hand-input/VideoPlayerWithTimestamp'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ===========================
// Hand Input Mode Component
// ===========================

interface HandInputModeProps {
  streamId: string
  videoUrl?: string
  onClose: () => void
}

export function HandInputMode({ streamId, videoUrl, onClose }: HandInputModeProps) {
  const { isOpen, isDirty, closeHandInputMode, openHandInputMode, updateHandField } =
    useHandInputStore()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(40) // 40% default

  useEffect(() => {
    if (!isOpen) {
      openHandInputMode(streamId)
    }
  }, [isOpen, streamId, openHandInputMode])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isDirty])

  // Handle close
  const handleClose = () => {
    if (isDirty) {
      setShowConfirmDialog(true)
    } else {
      closeHandInputMode()
      onClose()
    }
  }

  // Confirm close without saving
  const handleConfirmClose = () => {
    closeHandInputMode()
    onClose()
  }

  // Handle timestamp selection
  const handleTimestampSelect = (seconds: number) => {
    updateHandField('video_timestamp_start', seconds)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Hand input mode</h1>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Add hands manually to this stream
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="h-[calc(100vh-3.5rem)] flex">
        {/* Left Panel: Video Player */}
        <div
          className="border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="p-6">
            {videoUrl ? (
              <VideoPlayerWithTimestamp
                videoUrl={videoUrl}
                onTimestampSelect={handleTimestampSelect}
              />
            ) : (
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">No video available</p>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 bg-gray-200 dark:bg-gray-700 cursor-col-resize hover:bg-gold-400 dark:hover:bg-gold-500 transition-all duration-200"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startWidth = leftPanelWidth

            const handleMouseMove = (e: MouseEvent) => {
              const delta = ((e.clientX - startX) / window.innerWidth) * 100
              const newWidth = Math.max(30, Math.min(70, startWidth + delta))
              setLeftPanelWidth(newWidth)
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />

        {/* Right Panel: Hand Input Form */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
          <HandInputForm />
        </div>
      </div>

      {/* Confirm Close Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Close Without Saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
