"use client"

import { useState } from "react"
import { Card } from "./ui/card"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Button } from "./ui/button"
import { Edit2, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface HandSummaryProps {
  handId: string
  title?: string
  summary?: string
  author?: string
  createdAt?: string
  editable?: boolean
  onSave?: (data: { title: string; summary: string }) => void
  className?: string
}

export function HandSummary({
  handId,
  title = "",
  summary = "",
  author,
  createdAt,
  editable = false,
  onSave,
  className
}: HandSummaryProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editSummary, setEditSummary] = useState(summary)

  const handleSave = () => {
    onSave?.({ title: editTitle, summary: editSummary })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(title)
    setEditSummary(summary)
    setIsEditing(false)
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-3">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Hand title..."
              className="flex-1"
            />
          ) : (
            <h3 className="text-lg font-semibold flex-1">
              {title || "Untitled Hand"}
            </h3>
          )}

          {/* Edit button (only for editable) */}
          {editable && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}

          {/* Save/Cancel buttons (when editing) */}
          {isEditing && (
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Summary */}
        {isEditing ? (
          <Textarea
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            placeholder="Write a brief summary of this hand..."
            rows={3}
            className="w-full resize-none"
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {summary || "No summary available."}
          </p>
        )}

        {/* Metadata */}
        {(author || createdAt) && !isEditing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
            {author && <span>By {author}</span>}
            {author && createdAt && <span>•</span>}
            {createdAt && <span>{new Date(createdAt).toLocaleDateString()}</span>}
          </div>
        )}
      </div>
    </Card>
  )
}
