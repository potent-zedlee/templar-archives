"use client"

/**
 * Hand Tag Badges
 *
 * 핸드의 태그를 Badge로 표시하는 컴포넌트
 */

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { useHandTagsQuery, useRemoveHandTagMutation } from "@/lib/queries/hand-tags-queries"
import { getTagColor } from "@/lib/types/hand-tags"
import { HandTagDialog } from "@/components/HandTagDialog"
import { toast } from "sonner"

type HandTagBadgesProps = {
  handId: string
  onTagAdded?: () => void
}

export function HandTagBadges({ handId, onTagAdded }: HandTagBadgesProps) {
  const { user } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: tags = [] } = useHandTagsQuery(handId)
  const removeTagMutation = useRemoveHandTagMutation(handId)

  const getColorClass = (colorName: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-500 text-white hover:bg-blue-600",
      red: "bg-red-500 text-white hover:bg-red-600",
      green: "bg-green-500 text-white hover:bg-green-600",
    }
    return colorMap[colorName] || "bg-gray-500 text-white"
  }

  const handleRemoveTag = async (tagName: string, tagUserId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.")
      return
    }

    if (user.id !== tagUserId) {
      toast.error("본인이 추가한 태그만 삭제할 수 있습니다.")
      return
    }

    removeTagMutation.mutate({
      tagName: tagName as any,
      userId: user.id,
    })
  }

  const handleDialogSuccess = () => {
    setDialogOpen(false)
    if (onTagAdded) {
      onTagAdded()
    }
  }

  // Group tags by tag name
  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.tag_name]) {
      acc[tag.tag_name] = []
    }
    acc[tag.tag_name].push(tag)
    return acc
  }, {} as Record<string, typeof tags>)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Object.entries(groupedTags).map(([tagName, tagGroup]) => {
        const colorName = getTagColor(tagName as any)
        const userTag = tagGroup.find(t => t.created_by === user?.id)
        const count = tagGroup.length

        return (
          <Badge
            key={tagName}
            className={`${getColorClass(colorName)} relative pr-${userTag ? '8' : '3'} cursor-pointer`}
            variant="secondary"
          >
            <span className="mr-1">{tagName}</span>
            {count > 1 && (
              <span className="text-xs opacity-70">({count})</span>
            )}
            {userTag && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveTag(tagName, userTag.created_by)
                }}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                disabled={removeTagMutation.isPending}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        )
      })}

      {user && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="h-7 px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Tag
        </Button>
      )}

      <HandTagDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        handId={handId}
        existingTags={tags}
        onSuccess={handleDialogSuccess}
      />
    </div>
  )
}
