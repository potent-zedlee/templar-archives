"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export interface FolderItem {
  id: string
  name: string
  type: 'tournament' | 'subevent' | 'day'
}

interface RenameDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  item: FolderItem | null
  onSuccess?: () => void
}

export function RenameDialog({
  isOpen,
  onOpenChange,
  item,
  onSuccess,
}: RenameDialogProps) {
  const [renameValue, setRenameValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update local state when item changes
  useEffect(() => {
    if (item) {
      setRenameValue(item.name)
    }
  }, [item])

  const handleSubmit = async () => {
    if (!item || !renameValue.trim()) {
      toast.error('Please enter a valid name')
      return
    }

    setIsSubmitting(true)
    try {
      const table = item.type === 'tournament' ? 'tournaments'
        : item.type === 'subevent' ? 'sub_events'
        : 'days'

      const { error } = await supabase
        .from(table)
        .update({ name: renameValue.trim() })
        .eq('id', item.id)

      if (error) throw error

      toast.success('Renamed successfully')
      onOpenChange(false)
      setRenameValue("")
      onSuccess?.()
    } catch (error) {
      console.error('Error renaming:', error)
      toast.error('Failed to rename')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {item?.type || 'Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
              placeholder="Enter new name"
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setRenameValue("")
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !renameValue.trim()}
          >
            {isSubmitting ? "Renaming..." : "Rename"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
