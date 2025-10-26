/**
 * Security Events Panel Component
 *
 * Displays recent security events with severity indicators
 */

'use client'

import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { Shield } from 'lucide-react'

type SecurityEvent = {
  event_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
}

type Props = {
  events: SecurityEvent[]
  isLoading?: boolean
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-500'
    case 'high':
      return 'bg-orange-500'
    case 'medium':
      return 'bg-yellow-500'
    default:
      return 'bg-blue-500'
  }
}

const getSeverityTextColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'text-red-600'
    case 'high':
      return 'text-orange-600'
    case 'medium':
      return 'text-yellow-600'
    default:
      return 'text-blue-600'
  }
}

export function SecurityEventsPanel({ events, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recent Security Events
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Recent Security Events
        </h3>
        <LinkButton href="/admin/security-logs" variant="ghost" size="sm">
          View All
        </LinkButton>
      </div>

      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getSeverityColor(event.severity)}`} />
                <div>
                  <div className="font-medium text-sm">{event.event_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
              <div className={`text-xs font-semibold uppercase ${getSeverityTextColor(event.severity)}`}>
                {event.severity}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          보안 이벤트가 없습니다
        </div>
      )}
    </Card>
  )
}
