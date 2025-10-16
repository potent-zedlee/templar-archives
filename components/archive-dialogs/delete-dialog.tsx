"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { FolderItem } from "./rename-dialog"

interface DeleteDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  item: FolderItem | null
  onSuccess?: () => void
}

export function DeleteDialog({
  isOpen,
  onOpenChange,
  item,
  onSuccess,
}: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    if (!item) return

    setIsDeleting(true)
    try {
      const table = item.type === 'tournament' ? 'tournaments'
        : item.type === 'subevent' ? 'sub_events'
        : 'days'

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', item.id)

      if (error) throw error

      toast.success('Deleted successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {item?.type || 'Item'}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-body text-muted-foreground">
            Are you sure you want to delete "{item?.name}"? This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
