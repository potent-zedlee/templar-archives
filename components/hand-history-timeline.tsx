/**
 * Hand History Timeline Component
 *
 * 핸드 히스토리를 타임라인 뷰로 표시하는 컴포넌트
 * 이미지와 동일한 레이아웃: 왼쪽에 플레이어 정보, 상단에 Street 헤더
 */

import { useMemo } from 'react'
import { useHandPlayersQuery } from '@/lib/queries/hand-players-queries'
import { useHandActionsQuery } from '@/lib/queries/hand-actions-queries'
import { PositionBadge } from '@/components/position-badge'
import { cn } from '@/lib/utils'
import type { HandAction, Street } from '@/lib/hand-actions'

type HandHistoryTimelineProps = {
  handId: string
}

// 액션 타입별 스타일링
function ActionBadge({ action }: { action: HandAction }) {
  const { action_type, amount } = action

  // Fold
  if (action_type === 'fold') {
    return (
      <div className="px-3 py-1.5 rounded bg-yellow-100 text-yellow-800 text-sm font-medium">
        Fold
      </div>
    )
  }

  // Check
  if (action_type === 'check') {
    return (
      <div className="px-3 py-1.5 rounded bg-white border border-gray-300 text-black text-sm font-medium">
        Check
      </div>
    )
  }

  // All-In
  if (action_type === 'all-in') {
    return (
      <div className="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-medium">
        All-In {amount > 0 && `(${amount.toLocaleString()})`}
      </div>
    )
  }

  // Call, Bet, Raise (흰색 배경 with amount)
  return (
    <div className="px-3 py-1.5 rounded bg-white border border-gray-300 text-black text-sm font-medium">
      {action_type.charAt(0).toUpperCase() + action_type.slice(1)}{' '}
      {amount > 0 && `(${amount.toLocaleString()})`}
    </div>
  )
}

export function HandHistoryTimeline({ handId }: HandHistoryTimelineProps) {
  const { data: players = [], isLoading: playersLoading } = useHandPlayersQuery(handId)
  const { data: actions = [], isLoading: actionsLoading } = useHandActionsQuery(handId)

  // 스트리트별 액션 그룹화
  const actionsByStreet = useMemo(() => {
    return {
      preflop: actions.filter(a => a.street === 'preflop'),
      flop: actions.filter(a => a.street === 'flop'),
      turn: actions.filter(a => a.street === 'turn'),
      river: actions.filter(a => a.street === 'river'),
    }
  }, [actions])

  // 스트리트별 팟 사이즈 계산 (누적)
  const potSizes = useMemo(() => {
    let cumulative = 0
    const sizes: Record<Street, number> = {
      preflop: 0,
      flop: 0,
      turn: 0,
      river: 0,
    }

    const streets: Street[] = ['preflop', 'flop', 'turn', 'river']

    streets.forEach(street => {
      const streetActions = actionsByStreet[street]
      const streetTotal = streetActions.reduce((sum, action) => {
        // bet, raise, call, all-in만 팟에 추가
        if (['bet', 'raise', 'call', 'all-in'].includes(action.action_type)) {
          return sum + action.amount
        }
        return sum
      }, 0)

      cumulative += streetTotal
      sizes[street] = cumulative
    })

    return sizes
  }, [actionsByStreet])

  // 플레이어별, 스트리트별 액션 가져오기
  const getActionsForPlayer = (playerId: string, street: Street) => {
    return actionsByStreet[street]
      .filter(a => a.player_id === playerId)
      .sort((a, b) => a.sequence - b.sequence)
  }

  if (playersLoading || actionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-muted-foreground">Loading hand history...</p>
        </div>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No players in this hand yet.</p>
        <p className="text-sm mt-2">Add players using the "Add Players" button above.</p>
      </div>
    )
  }

  const streets: { key: Street; label: string }[] = [
    { key: 'preflop', label: 'Pre-Flop' },
    { key: 'flop', label: 'Flop' },
    { key: 'turn', label: 'Turn' },
    { key: 'river', label: 'River' },
  ]

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* CSS Grid: 5 columns (player + 4 streets) */}
        <div className="grid grid-cols-5 gap-0 border border-gray-700 rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className="bg-gray-900" /> {/* Empty top-left cell */}

          {streets.map(({ key, label }) => (
            <div
              key={key}
              className="bg-gray-800 p-4 text-center border-l border-gray-700 first:border-l-0"
            >
              <div className="text-white font-semibold text-lg mb-1">{label}</div>
              <div className="text-yellow-500 font-medium">
                {potSizes[key] > 0 ? potSizes[key].toLocaleString() : '-'}
              </div>
            </div>
          ))}

          {/* Player Rows */}
          {players.map((player, idx) => (
            <div
              key={player.id}
              className={cn(
                'contents',
                idx !== players.length - 1 && 'border-b border-gray-700'
              )}
            >
              {/* Column 1: Player Info (NO HEADER) */}
              <div className="bg-gray-700 p-4 flex items-center gap-3 border-t border-gray-700 first:border-t-0">
                {player.player?.photo_url && (
                  <img
                    src={player.player.photo_url}
                    alt={player.player.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {player.player?.name || 'Unknown Player'}
                  </div>
                  {player.position && (
                    <div className="mt-1">
                      <PositionBadge position={player.position} />
                    </div>
                  )}
                  {player.cards && (
                    <div className="text-xs text-gray-400 mt-1">{player.cards}</div>
                  )}
                </div>
              </div>

              {/* Columns 2-5: Actions per street */}
              {streets.map(({ key }) => {
                const playerActions = getActionsForPlayer(player.player_id, key)

                return (
                  <div
                    key={key}
                    className="p-4 bg-gray-900 border-l border-t border-gray-700 first:border-l-0 first:border-t-0"
                  >
                    {playerActions.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {playerActions.map(action => (
                          <ActionBadge key={action.id} action={action} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-600 text-sm text-center">-</div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
