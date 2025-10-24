"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { FolderItem } from "@/lib/types/archive"
import { deleteTournament, deleteSubEvent, deleteDay } from "@/app/actions/archive"

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
      let result

      // Call appropriate Server Action based on item type
      if (item.type === 'tournament') {
        result = await deleteTournament(item.id)
      } else if (item.type === 'subevent') {
        result = await deleteSubEvent(item.id)
      } else {
        result = await deleteDay(item.id)
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      toast.success('Deleted successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('[DeleteDialog] Error deleting:', error)
      toast.error(error.message || 'Failed to delete')
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
