"use client"

/**
 * Hand Tag Dialog
 *
 * 핸드에 태그를 추가/제거하는 다이얼로그
 */

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Check } from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import { useAddHandTagMutation, useRemoveHandTagMutation } from "@/lib/queries/hand-tags-queries"
import { TAG_CATEGORIES, getTagColor, type HandTag, type HandTagName } from "@/lib/types/hand-tags"
import { toast } from "sonner"

type HandTagDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  handId: string
  existingTags: HandTag[]
  onSuccess?: () => void
}

export function HandTagDialog({
  open,
  onOpenChange,
  handId,
  existingTags,
  onSuccess,
}: HandTagDialogProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")

  const addTagMutation = useAddHandTagMutation(handId)
  const removeTagMutation = useRemoveHandTagMutation(handId)

  if (!user) return null

  // Check if user has already added a specific tag
  const hasUserTag = (tagName: HandTagName) => {
    return existingTags.some(
      tag => tag.tag_name === tagName && tag.created_by === user.id
    )
  }

  const handleTagClick = async (tagName: HandTagName) => {
    if (hasUserTag(tagName)) {
      // Remove tag
      removeTagMutation.mutate({
        tagName,
        userId: user.id,
      })
    } else {
      // Add tag
      addTagMutation.mutate({
        tagName,
        userId: user.id,
      })
    }
  }

  const getColorClass = (colorName: string) => {
    const colorMap: Record<string, string> = {
      blue: "border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100",
      red: "border-red-500 text-red-700 bg-red-50 hover:bg-red-100",
      green: "border-green-500 text-green-700 bg-green-50 hover:bg-green-100",
    }
    return colorMap[colorName] || "border-gray-500 text-gray-700 bg-gray-50 hover:bg-gray-100"
  }

  const getSelectedClass = (colorName: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-500 text-white border-blue-600",
      red: "bg-red-500 text-white border-red-600",
      green: "bg-green-500 text-white border-green-600",
    }
    return colorMap[colorName] || "bg-gray-500 text-white border-gray-600"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Tags</DialogTitle>
          <DialogDescription>
            Click on tags to add or remove them from this hand
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Search */}
          <div>
            <Input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Tags by Category */}
          {Object.entries(TAG_CATEGORIES).map(([category, tags]) => {
            const filteredTags = tags.filter(tagName =>
              searchQuery === "" || tagName.toLowerCase().includes(searchQuery.toLowerCase())
            )

            if (filteredTags.length === 0) return null

            return (
              <div key={category} className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((tagName) => {
                    const colorName = getTagColor(tagName)
                    const isSelected = hasUserTag(tagName)
                    const tagCount = existingTags.filter(t => t.tag_name === tagName).length

                    return (
                      <Button
                        key={tagName}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTagClick(tagName)}
                        disabled={addTagMutation.isPending || removeTagMutation.isPending}
                        className={`relative ${
                          isSelected
                            ? getSelectedClass(colorName)
                            : getColorClass(colorName)
                        }`}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        <span>{tagName}</span>
                        {tagCount > 0 && (
                          <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                            {tagCount}
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
