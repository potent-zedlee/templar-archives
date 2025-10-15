import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { AdminLog } from "@/lib/admin"

interface ActivityFeedProps {
  activities: AdminLog[]
}

const ACTION_LABELS: Record<string, string> = {
  ban_user: "사용자 차단",
  unban_user: "차단 해제",
  change_role: "역할 변경",
  delete_post: "게시글 삭제",
  delete_comment: "댓글 삭제",
}

const ACTION_COLORS: Record<string, "default" | "destructive" | "secondary"> = {
  ban_user: "destructive",
  unban_user: "secondary",
  change_role: "default",
  delete_post: "destructive",
  delete_comment: "destructive",
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-body text-muted-foreground">최근 활동이 없습니다</p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activity.admin?.avatar_url} />
              <AvatarFallback>
                {activity.admin?.nickname?.slice(0, 2).toUpperCase() || "AD"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-body font-medium">
                  {activity.admin?.nickname || "관리자"}
                </span>
                <Badge variant={ACTION_COLORS[activity.action] || "default"} className="text-caption">
                  {ACTION_LABELS[activity.action] || activity.action}
                </Badge>
              </div>

              <p className="text-caption text-muted-foreground">
                {formatActivityDescription(activity)}
              </p>

              <p className="text-caption text-muted-foreground mt-1">
                {formatTimeAgo(activity.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function formatActivityDescription(activity: AdminLog): string {
  const targetType = {
    user: "사용자",
    post: "게시글",
    comment: "댓글",
    hand: "핸드",
    player: "플레이어",
  }[activity.target_type] || activity.target_type

  const details = activity.details as Record<string, any> | undefined

  if (activity.action === "ban_user" && details?.reason) {
    return `${targetType} 차단 (사유: ${details.reason})`
  }

  if (activity.action === "change_role" && details?.role) {
    return `${targetType} 역할을 ${details.role}(으)로 변경`
  }

  if (activity.action === "delete_post" && details?.reason) {
    return `${targetType} 삭제 (사유: ${details.reason})`
  }

  return `${targetType}에 대한 작업 수행`
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "방금 전"
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
